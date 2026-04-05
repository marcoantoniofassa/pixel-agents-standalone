/**
 * SkillsCatalog — Visual arsenal of all Sexta-Feira skills & agents
 * Organized by domain, shows active/idle status, searchable
 */

import { useState, useMemo } from 'react'

export interface SkillDef {
  name: string
  type: 'skill' | 'agent'
  description: string
}

export interface DomainDef {
  id: string
  label: string
  icon: string
  color: string
  skills: SkillDef[]
}

const DOMAINS: DomainDef[] = [
  {
    id: 'vendas',
    label: 'Vendas',
    icon: '\u{1F4B0}',
    color: '#22c55e',
    skills: [
      { name: 'vendas-fleet', type: 'skill', description: 'IA Senior de Vendas Contele Fleet' },
      { name: 'vendas-teams', type: 'skill', description: 'IA Senior de Vendas Contele Teams' },
      { name: 'coach-vendas', type: 'skill', description: 'Coach de Vendas: analisa calls e orienta' },
      { name: 'vigilia', type: 'skill', description: 'Agente de Saude do Pipeline Teams' },
    ],
  },
  {
    id: 'conteudo',
    label: 'Conteudo',
    icon: '\u{1F3AC}',
    color: '#a855f7',
    skills: [
      { name: 'carrossel-instagram', type: 'skill', description: 'Carrossel Instagram: Marco Fassa' },
      { name: 'post-social', type: 'skill', description: 'Posts LinkedIn, X, Instagram' },
      { name: 'roteiro-video', type: 'skill', description: 'Roteiro de Video: FPT + Fleet' },
      { name: 'gerar-foto', type: 'skill', description: 'Gerar Foto Profissional com IA' },
      { name: 'responder-youtube', type: 'skill', description: 'Cesar Responde: engajamento YouTube' },
      { name: 'slide-comunicado', type: 'skill', description: 'Slide de Comunicado Interno' },
    ],
  },
  {
    id: 'ops',
    label: 'Operacional',
    icon: '\u{2699}\u{FE0F}',
    color: '#3b82f6',
    skills: [
      { name: 'email', type: 'skill', description: 'Email Manager: triagem e resposta' },
      { name: 'agenda', type: 'skill', description: 'Agente Agendado: one-time + recurring' },
      { name: 'n8n-update', type: 'skill', description: 'Atualiza todas as instancias n8n' },
      { name: 'segundo-cerebro-hygiene', type: 'skill', description: 'Auditoria diaria do vault' },
      { name: 'retro', type: 'skill', description: 'Retrospectiva de Sessao' },
      { name: 'digerir', type: 'skill', description: 'Digerir Conteudo: artigos, videos, docs' },
      { name: 'escuta', type: 'skill', description: 'Ditado por Voz: Whisper local' },
      { name: 'transcrever', type: 'skill', description: 'Transcrever Audio Local' },
      { name: 'instagram', type: 'skill', description: 'Instagram Scraper' },
      { name: 'benchmark-remuneracao', type: 'skill', description: 'Benchmark de Remuneracao' },
    ],
  },
  {
    id: 'infra',
    label: 'Infra',
    icon: '\u{1F5A5}\u{FE0F}',
    color: '#f59e0b',
    skills: [
      { name: 'hostinger-marco', type: 'skill', description: 'Easypanel Pessoal' },
      { name: 'hostinger-contele', type: 'skill', description: 'Hostinger Contele KVM2' },
      { name: 'gcp-status-vm-atendimento', type: 'skill', description: 'GCP Status VM Atendimento' },
      { name: 'evolution-marco', type: 'skill', description: 'Evolution API Pessoal' },
      { name: 'contele-teams-fix-addresses', type: 'skill', description: 'Fix Addresses Costa Lavos' },
      { name: 'railway-cli', type: 'agent', description: 'Gerencia projetos Railway via CLI' },
    ],
  },
  {
    id: 'especialistas',
    label: 'Especialistas',
    icon: '\u{1F9E0}',
    color: '#ef4444',
    skills: [
      { name: 'vault-tasks', type: 'agent', description: 'Gerencia tarefas no segundo cerebro' },
      { name: 'zap', type: 'agent', description: 'WhatsApp pessoal: ler, enviar, buscar' },
      { name: 'whatsapp-evolution', type: 'agent', description: 'WhatsApp Contele via Evolution' },
      { name: 'imessage', type: 'agent', description: 'iMessage: ler, enviar, buscar' },
      { name: 'site-marcofassa', type: 'agent', description: 'Paginas site MarcoFassa CTO' },
      { name: 'changelog-marco', type: 'agent', description: 'Changelog entries site CTO' },
      { name: 'Tech Lead', type: 'agent', description: 'Code review, planning, backlog' },
      { name: 'QA Landing Page', type: 'agent', description: 'QA visual com Playwright mobile' },
      { name: 'Growth/Marketing', type: 'agent', description: 'Revisor growth e conversao' },
      { name: 'UX/UI Designer', type: 'agent', description: 'Revisor interface e UX' },
      { name: 'Copywriter B2B', type: 'agent', description: 'Copy focado conversao B2B SaaS' },
      { name: 'Explore', type: 'agent', description: 'Exploracao rapida de codebase' },
      { name: 'Plan', type: 'agent', description: 'Arquiteto de implementacao' },
    ],
  },
]

const TOTAL_SKILLS = DOMAINS.reduce((sum, d) => sum + d.skills.length, 0)

interface SkillsCatalogProps {
  /** Set of skill/agent names currently active (running in any session) */
  activeSkills?: Set<string>
  onClose: () => void
}

export function SkillsCatalog({ activeSkills = new Set(), onClose }: SkillsCatalogProps) {
  const [search, setSearch] = useState('')
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return DOMAINS
    const q = search.toLowerCase()
    return DOMAINS.map(d => ({
      ...d,
      skills: d.skills.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        d.label.toLowerCase().includes(q)
      ),
    })).filter(d => d.skills.length > 0)
  }, [search])

  const activeCount = DOMAINS.reduce(
    (sum, d) => sum + d.skills.filter(s => activeSkills.has(s.name)).length,
    0
  )

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 420,
        height: '100%',
        background: '#0d1117',
        borderLeft: '2px solid #30363d',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px 8px',
          borderBottom: '2px solid #30363d',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: '16px', color: '#e6edf3', letterSpacing: 1 }}>
            ARSENAL
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px 6px',
            }}
          >
            X
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: '14px' }}>
          <span style={{ color: '#8b949e' }}>
            {TOTAL_SKILLS} total
          </span>
          <span style={{ color: activeCount > 0 ? '#3fb950' : '#8b949e' }}>
            {activeCount} ativo{activeCount !== 1 ? 's' : ''}
          </span>
          <span style={{ color: '#8b949e' }}>
            {DOMAINS.length} dominios
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar skill..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '15px',
            fontFamily: 'inherit',
            background: '#161b22',
            border: '2px solid #30363d',
            color: '#e6edf3',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Domain list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
        {filtered.map(domain => {
          const isExpanded = expandedDomain === domain.id || search.trim().length > 0
          const domainActiveCount = domain.skills.filter(s => activeSkills.has(s.name)).length

          return (
            <div key={domain.id} style={{ marginBottom: 6 }}>
              {/* Domain header */}
              <button
                onClick={() => setExpandedDomain(isExpanded && !search ? null : domain.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  background: isExpanded ? '#161b22' : 'transparent',
                  border: `2px solid ${isExpanded ? domain.color + '66' : '#21262d'}`,
                  color: '#e6edf3',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontSize: '14px' }}>{domain.icon}</span>
                <span style={{ flex: 1, color: domain.color }}>{domain.label}</span>
                <span style={{ fontSize: '14px', color: '#8b949e' }}>
                  {domainActiveCount > 0 && (
                    <span style={{ color: '#3fb950', marginRight: 6 }}>
                      {domainActiveCount} on
                    </span>
                  )}
                  {domain.skills.length}
                </span>
                <span style={{ fontSize: '13px', color: '#484f58', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                  {'\u25B6'}
                </span>
              </button>

              {/* Skills list */}
              {isExpanded && (
                <div style={{ padding: '4px 0 4px 8px' }}>
                  {domain.skills.map(skill => {
                    const isActive = activeSkills.has(skill.name)
                    return (
                      <div
                        key={skill.name}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          padding: '6px 10px',
                          borderLeft: `2px solid ${isActive ? domain.color : '#21262d'}`,
                          marginBottom: 2,
                          opacity: isActive ? 1 : 0.6,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        {/* Status dot */}
                        <span
                          className={isActive ? 'pixel-agents-pulse' : undefined}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: isActive ? '#3fb950' : '#30363d',
                            flexShrink: 0,
                            marginTop: 3,
                          }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: '14px',
                              color: isActive ? '#e6edf3' : '#8b949e',
                              fontWeight: isActive ? 'bold' : 'normal',
                            }}>
                              /{skill.name}
                            </span>
                            <span style={{
                              fontSize: '12px',
                              padding: '1px 4px',
                              background: skill.type === 'agent' ? '#1f6feb22' : '#30363d44',
                              color: skill.type === 'agent' ? '#58a6ff' : '#484f58',
                              border: `1px solid ${skill.type === 'agent' ? '#1f6feb44' : '#21262d'}`,
                            }}>
                              {skill.type}
                            </span>
                          </div>

                          {/* Description */}
                          <div style={{
                            fontSize: '13px',
                            color: '#484f58',
                            marginTop: 2,
                            lineHeight: 1.4,
                          }}>
                            {skill.description}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: '14px', color: '#484f58' }}>
            Nenhum skill encontrado
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 14px',
        borderTop: '2px solid #30363d',
        fontSize: '13px',
        color: '#30363d',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        Sexta-Feira v2 : {TOTAL_SKILLS} capacidades
      </div>
    </div>
  )
}
