/**
 * AgendaPanel — Shows scheduled, recurring, and recently completed jobs
 * Reads from crons/registry.json via the server API
 */

import { useState, useEffect, useMemo } from 'react'

interface ActiveJob {
  id: string
  description: string
  scheduled: string
  created?: string
  type?: string
}

interface RecurringJob {
  id: string
  description: string
  schedule: string
  created?: string
  model?: string
}

interface CompletedJob {
  id: string
  description: string
  scheduled?: string
  executed: string
  status: string
  errors?: number
}

interface RegistryData {
  active: ActiveJob[]
  recurring: RecurringJob[]
  completed: CompletedJob[]
}

interface AgendaPanelProps {
  onClose: () => void
}

function timeUntil(dateStr: string): string {
  const target = new Date(dateStr.replace(' ', 'T') + '-03:00')
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  if (diff < 0) return 'agora'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h${mins % 60 > 0 ? String(mins % 60).padStart(2, '0') : ''}`
  return `${Math.floor(hours / 24)}d`
}

function timeAgo(dateStr: string): string {
  if (!dateStr || dateStr.includes('cleanup') || dateStr.includes('manual') || dateStr.includes('expired')) return dateStr
  const past = new Date(dateStr.replace(' ', 'T') + '-03:00')
  const now = new Date()
  const diff = now.getTime() - past.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atras`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atras`
  const days = Math.floor(hours / 24)
  return `${days}d atras`
}

function statusDot(status: string): { color: string; label: string } {
  switch (status) {
    case 'success': return { color: '#3fb950', label: 'OK' }
    case 'partial': return { color: '#d29922', label: 'PARCIAL' }
    case 'expired': return { color: '#484f58', label: 'EXPIRADO' }
    case 'executed': return { color: '#3fb950', label: 'OK' }
    default: return { color: '#f85149', label: status.toUpperCase() }
  }
}

function shortDesc(desc: string, max = 45): string {
  if (desc.length <= max) return desc
  return desc.slice(0, max) + '...'
}

export function AgendaPanel({ onClose }: AgendaPanelProps) {
  const [data, setData] = useState<RegistryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming')

  useEffect(() => {
    fetch('/api/registry')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
  }, [])

  const recentCompleted = useMemo(() => {
    if (!data) return []
    return [...data.completed]
      .reverse()
      .slice(0, 15)
  }, [data])

  const upcomingCount = (data?.active.length || 0) + (data?.recurring.length || 0)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 420,
        height: '100%',
        background: '#0d1117',
        borderRight: '2px solid #30363d',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px 8px', borderBottom: '2px solid #30363d', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: '16px', color: '#e6edf3', letterSpacing: 1 }}>AGENDA</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
          >
            X
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setTab('upcoming')}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              background: tab === 'upcoming' ? '#161b22' : 'transparent',
              border: `2px solid ${tab === 'upcoming' ? '#3b82f6' : '#21262d'}`,
              color: tab === 'upcoming' ? '#3b82f6' : '#8b949e',
              cursor: 'pointer',
            }}
          >
            Proximo ({upcomingCount})
          </button>
          <button
            onClick={() => setTab('history')}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              background: tab === 'history' ? '#161b22' : 'transparent',
              border: `2px solid ${tab === 'history' ? '#f59e0b' : '#21262d'}`,
              color: tab === 'history' ? '#f59e0b' : '#8b949e',
              cursor: 'pointer',
            }}
          >
            Historico ({data?.completed.length || 0})
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
        {error && (
          <div style={{ padding: 12, fontSize: '14px', color: '#f85149', textAlign: 'center' }}>
            Erro: {error}
          </div>
        )}

        {!data && !error && (
          <div style={{ padding: 20, fontSize: '14px', color: '#484f58', textAlign: 'center' }}>
            Carregando...
          </div>
        )}

        {data && tab === 'upcoming' && (
          <>
            {/* Active (one-time scheduled) */}
            {data.active.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '14px', color: '#f59e0b', marginBottom: 6, letterSpacing: 1 }}>
                  AGENDADO
                </div>
                {data.active.map(job => (
                  <div
                    key={job.id}
                    style={{
                      padding: '8px 10px',
                      borderLeft: '2px solid #f59e0b',
                      marginBottom: 4,
                      background: '#161b22',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#e6edf3' }}>
                        {shortDesc(job.description)}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#f59e0b', marginTop: 3 }}>
                      {job.scheduled} (em {timeUntil(job.scheduled)})
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recurring */}
            {data.recurring.length > 0 && (
              <div>
                <div style={{ fontSize: '14px', color: '#3b82f6', marginBottom: 6, letterSpacing: 1 }}>
                  RECORRENTE
                </div>
                {data.recurring.map(job => (
                  <div
                    key={job.id}
                    style={{
                      padding: '8px 10px',
                      borderLeft: '2px solid #3b82f6',
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#e6edf3' }}>
                      {shortDesc(job.description)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, fontSize: '13px', color: '#484f58' }}>
                      <span>{job.schedule}</span>
                      {job.model && <span style={{ color: '#8b949e' }}>{job.model}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.active.length === 0 && data.recurring.length === 0 && (
              <div style={{ padding: 20, fontSize: '14px', color: '#484f58', textAlign: 'center' }}>
                Nenhum agendamento ativo
              </div>
            )}
          </>
        )}

        {data && tab === 'history' && (
          <div>
            {recentCompleted.map(job => {
              const s = statusDot(job.status)
              return (
                <div
                  key={job.id}
                  style={{
                    padding: '6px 10px',
                    borderLeft: `2px solid ${s.color}`,
                    marginBottom: 3,
                    opacity: job.status === 'expired' ? 0.5 : 0.85,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: s.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#e6edf3', flex: 1 }}>
                      {shortDesc(job.description, 35)}
                    </span>
                    <span style={{ fontSize: '12px', color: s.color }}>
                      {s.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#484f58', marginTop: 2, paddingLeft: 12 }}>
                    {timeAgo(job.executed)}
                    {job.errors !== undefined && job.errors > 0 && (
                      <span style={{ color: '#f85149', marginLeft: 6 }}>{job.errors} erro{job.errors > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              )
            })}

            {recentCompleted.length === 0 && (
              <div style={{ padding: 20, fontSize: '14px', color: '#484f58', textAlign: 'center' }}>
                Nenhum historico
              </div>
            )}
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
        crons/registry.json
      </div>
    </div>
  )
}
