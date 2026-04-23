import React, { useState } from 'react'
import { FileText, Clock, CheckCircle, Eye, XCircle } from 'lucide-react'
import { useMySubmissions } from '../../hooks/useData'
import { format, formatDistanceToNow } from 'date-fns'

const STATUS_STYLE = {
  submitted:      { bg: 'var(--g50)',  color: 'var(--g800)', icon: CheckCircle, label: 'Submitted'     },
  edited_pending: { bg: '#fffbeb',     color: '#92400e',     icon: Clock,       label: 'Edit Pending'  },
  approved:       { bg: 'var(--g50)',  color: 'var(--g700)', icon: CheckCircle, label: 'Approved'      },
}

export default function MySubmissionsPage() {
  const { submissions, loading } = useMySubmissions()
  const [selected, setSelected] = useState(null)

  return (
    <div className="fade-in" style={{ paddingBottom: 8 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,var(--g900),var(--g800))', padding: '20px', color: '#fff', marginBottom: 0 }}>
        <h2 style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>My Submissions</h2>
        <p style={{ fontSize: 13, opacity: 0.65, marginTop: 3 }}>{submissions.length} total submission{submissions.length !== 1 ? 's' : ''}</p>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }} />
          </div>
        ) : submissions.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <FileText size={40} className="empty-icon" />
              <div className="empty-title">No submissions yet</div>
              <div className="empty-body">Data you collect will appear here</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            {submissions.map((sub, i) => {
              const st = STATUS_STYLE[sub.status] || STATUS_STYLE.submitted
              const Icon = st.icon
              return (
                <div key={sub.id}
                  onClick={() => setSelected(sub)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < submissions.length - 1 ? '1px solid var(--n100)' : 'none', cursor: 'pointer', transition: 'background 0.13s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--n50)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={st.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--n900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.forms?.title || 'Unknown Form'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--n500)', marginTop: 2 }}>
                      {formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color, fontWeight: 600, flexShrink: 0 }}>
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--n900)' }}>{selected.forms?.title}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n500)', display: 'flex' }}><XCircle size={20} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--n500)', marginBottom: 16 }}>
              Submitted {format(new Date(selected.submitted_at), 'd MMM yyyy HH:mm')}
              {selected.lat && <span style={{ marginLeft: 8, fontFamily: 'var(--mono)' }}>· {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</span>}
            </div>

            {/* Status notice */}
            {selected.status === 'edited_pending' && (
              <div className="info-box info-box-amber" style={{ marginBottom: 14, fontSize: 12 }}>
                <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                An edit to this submission is pending Super Admin approval.
              </div>
            )}

            {/* Data fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(selected.forms?.schema || []).map(field => {
                const v = selected.data?.[field.id]
                return (
                  <div key={field.id} style={{ borderBottom: '1px solid var(--n100)', paddingBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n500)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{field.label}</div>
                    <div style={{ fontSize: 14, color: 'var(--n800)' }}>
                      {v === undefined || v === null || v === ''
                        ? <span style={{ color: 'var(--n400)', fontStyle: 'italic' }}>—</span>
                        : Array.isArray(v) ? v.join(', ')
                        : typeof v === 'object' && v.url ? <a href={v.url} target="_blank" rel="noreferrer" style={{ color: 'var(--g700)' }}>View photo</a>
                        : typeof v === 'object' && v.lat ? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`
                        : String(v)
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
