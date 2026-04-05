import { watch } from "chokidar";
import { statSync, readdirSync, openSync, readSync, closeSync, readFileSync } from "fs";
import { join, basename, dirname } from "path";
import { homedir } from "os";
import { EventEmitter } from "events";

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");
const ACTIVE_THRESHOLD_MS = 600_000; // 10 minutes — Claude can think for 5+ min without writing
const POLL_INTERVAL_MS = 1000;

export interface WatchedFile {
  path: string;
  sessionId: string;
  projectName: string;
  offset: number;
  lineBuffer: string;
}

export class JsonlWatcher extends EventEmitter {
  private files = new Map<string, WatchedFile>();
  private watcher: ReturnType<typeof watch> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.scanForActiveFiles();

    this.watcher = watch(CLAUDE_PROJECTS_DIR, {
      ignoreInitial: true,
      depth: 5,
    });

    this.watcher.on("add", (filePath: string) => {
      if (filePath.endsWith(".jsonl")) {
        this.addFile(filePath);
      }
    });

    this.pollInterval = setInterval(() => this.pollFiles(), POLL_INTERVAL_MS);
  }

  stop(): void {
    this.watcher?.close();
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private scanForActiveFiles(): void {
    try {
      this.scanDir(CLAUDE_PROJECTS_DIR, 0, 4);
    } catch {
      /* projects dir may not exist */
    }
  }

  private scanDir(dirPath: string, depth: number, maxDepth: number): void {
    if (depth > maxDepth) return;
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        if (entry.isFile() && entry.name.endsWith(".jsonl")) {
          try {
            const stat = statSync(fullPath);
            if (Date.now() - stat.mtimeMs < ACTIVE_THRESHOLD_MS) {
              this.addFile(fullPath);
            }
          } catch { /* skip */ }
        } else if (entry.isDirectory()) {
          this.scanDir(fullPath, depth + 1, maxDepth);
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  private addFile(filePath: string): void {
    if (this.files.has(filePath)) return;

    const sessionId = basename(filePath, ".jsonl");
    const projectName = this.extractProjectName(filePath, sessionId);

    const file: WatchedFile = {
      path: filePath,
      sessionId,
      projectName,
      offset: 0,
      lineBuffer: "",
    };

    this.files.set(filePath, file);
    this.emit("fileAdded", file);

    // Read existing content to catch up
    this.readNewLines(file);
  }

  private extractProjectName(filePath: string, sessionId: string): string {
    const dirName = basename(dirname(filePath));

    // Subagent JSONL: extract role from first line of the file
    if (dirName === "subagents") {
      try {
        const firstLine = this.readFirstLine(filePath);
        if (firstLine) {
          const record = JSON.parse(firstLine);
          const content = record?.message?.content;
          if (typeof content === "string") {
            // Extract role from prompt: "Voce e o Tech Lead..." -> "Tech Lead"
            const roleMatch = content.match(/(?:Voce e o|You are the|You're the)\s+([A-Z][A-Za-z\s]+?)(?:\s+do\s|\s+of\s|\s+for\s|\.|\n)/);
            if (roleMatch) return roleMatch[1].trim();
            // Fallback: first meaningful words
            const words = content.slice(0, 60).split(/[\s\n]+/).slice(0, 4).join(" ");
            if (words.length > 3) return words;
          }
        }
      } catch { /* fallback below */ }

      // Try reading session name from parent
      const parentDir = dirname(dirname(filePath));
      const parentDirName = basename(parentDir);
      if (parentDirName !== "subagents") {
        return `sub:${this.shortName(parentDirName, sessionId)}`;
      }
      return `agent-${sessionId.slice(0, 8)}`;
    }

    // Session name from Claude Code /rename (first line has type: "custom-title")
    try {
      const firstLine = this.readFirstLine(filePath);
      if (firstLine) {
        const record = JSON.parse(firstLine);
        // Claude Code stores session rename as customTitle in first JSONL line
        if (record.type === "custom-title" && typeof record.customTitle === "string") {
          return record.customTitle;
        }
      }
    } catch { /* fallback */ }

    return this.shortName(dirName, sessionId);
  }

  private shortName(dirName: string, sessionId: string): string {
    const parts = dirName.split("-").filter(Boolean);
    // Try to get the last meaningful segment (project name)
    const name = parts[parts.length - 1] || sessionId.slice(0, 8);
    return name;
  }

  private readFirstLine(filePath: string): string | null {
    try {
      const fd = openSync(filePath, "r");
      const buf = Buffer.alloc(4096); // First 4KB is enough for the first line
      const bytesRead = readSync(fd, buf, 0, buf.length, 0);
      closeSync(fd);
      const text = buf.toString("utf-8", 0, bytesRead);
      const newlineIdx = text.indexOf("\n");
      return newlineIdx > 0 ? text.slice(0, newlineIdx) : text;
    } catch {
      return null;
    }
  }

  private pollFiles(): void {
    for (const [path, file] of this.files) {
      try {
        const stat = statSync(path);
        if (stat.size > file.offset) {
          this.readNewLines(file);
        }
        // Remove stale files
        if (Date.now() - stat.mtimeMs > ACTIVE_THRESHOLD_MS) {
          this.files.delete(path);
          this.emit("fileRemoved", file);
        }
      } catch {
        this.files.delete(path);
        this.emit("fileRemoved", file);
      }
    }
  }

  private readNewLines(file: WatchedFile): void {
    try {
      const stat = statSync(file.path);
      if (stat.size <= file.offset) return;

      const buf = Buffer.alloc(stat.size - file.offset);
      const fd = openSync(file.path, "r");
      readSync(fd, buf, 0, buf.length, file.offset);
      closeSync(fd);

      file.offset = stat.size;
      const text = file.lineBuffer + buf.toString("utf-8");
      const lines = text.split("\n");

      // Last element is incomplete line (buffer it)
      file.lineBuffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          this.emit("line", file, line);
        }
      }
    } catch {
      /* file may have been deleted */
    }
  }

  getActiveFiles(): WatchedFile[] {
    return Array.from(this.files.values());
  }
}
