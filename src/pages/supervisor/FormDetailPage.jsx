import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Download, Eye, CheckCircle, XCircle, Clock, User, Save, X } from 'lucide-react'
import { useFormSubmissions, useToast } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ToastContainer } from '../../components/Toast'
import { format, formatDistanceToNow } from 'date-fns'

const STATUS_STYLE = {
  submitted:      { bg: 'var(--g50)',  color: 'var(--g800)', label: 'Submitted',    icon: Clock        },
  edited_pending: { bg: '#fffbeb',     color: '#92400e',     label: 'Edit Pending', icon: Edit2        },
  approved:       { bg: '#f0fdf4',     color: '#16a34a',     label: 'Approved',     icon: CheckCircle  },
  rejected:       { bg: '#fef2f2',     color: '#dc2626',     label: 'Rejected',     icon: XCircle      },
}

export default function FormDetailPage() {
  const { id } = useParams()          // this is the FORM TEMPLATE id
  const nav    = useNavigate()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()
  const { submissions, loading, refetch } = useFormSubmissions(id)

  const [form,       setForm]       = useState(null)
  const [selected,   setSelected]   = useState(null)   // submission being viewed
  const [editMode,   setEditMode]   = useState(false)
  const [editData,   setEditData]   = useState({})
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    supabase.from('forms')
      .select('*, profiles!forms_created_by_fkey(full_name)')
      .eq('id', id)
      .single()
      .then(({ data }) => setForm(data))
  }, [id])

  function openSubmission(sub) {
    setSelected(sub)
    setEditData({ ...(sub.data || {}) })
    setEditMode(false)
  }

  async function approveSubmission(sub) {
    setSaving(true)
    try {
      const { error } = await supabase.from('form_submissions').update({
        status:      'approved',
        approved_by: profile.id,
      }).eq('id', sub.id)
      if (error) throw error
      toast('Submission approved ✓')
      setSelected(null)
      refetch()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function rejectSubmission(sub) {
    if (!window.confirm('Reject this submission?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('form_submissions').update({
        status: 'rejected',
      }).eq('id', sub.id)
      if (error) throw error
      toast('Submission rejected')
      setSelected(null)
      refetch()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function saveEdit() {
    if (!selected) return
    setSaving(true)
    try {
      const { error } = await supabase.from('form_submissions').update({
        data:      editData,
        status:    'submitted',
        edited_by: profile.id,
      }).eq('id', selected.id)
      if (error) throw error
      toast('Submission updated ✓')
      setEditMode(false)
      setSelected(prev => ({ ...prev, data: editData, status: 'submitted' }))
      refetch()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  // ── CSV export ────────────────────────────────────────────────────────────────
  function exportCSV() {
    if (!submissions.length) return
    const schema = form?.schema || []
    const headers = schema.length > 0
      ? ['Officer', 'Submitted', 'Status', ...schema.map(f => f.label)]
      : ['Officer', 'Submitted', 'Status', 'Data']
    const rows = submissions.map(sub => {
      const base = [
        sub.profiles?.full_name || '—',
        format(new Date(sub.submitted_at), 'dd MMM yyyy HH:mm'),
        sub.status || 'submitted',
      ]
      if (schema.length > 0) {
        return [...base, ...schema.map(f => {
          const v = sub.data?.[f.id] ?? ''
          return typeof v === 'object' ? JSON.stringify(v) : String(v)
        })]
      }
      return [...base, JSON.stringify(sub.data || {})]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `${form?.title || 'submissions'}.csv` })
    a.click()
  }

  const approvedCount  = submissions.filter(s => s.status === 'approved').length
  const pendingCount   = submissions.filter(s => s.status === 'submitted' || s.status === 'edited_pending').length
  const rejectedCount  = submissions.filter(s => s.status === 'rejected').length

  return (
    <div className="page fade-in">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="page-header">
        <button onClick={() => nav('/forms')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n500)', fontSize: 13, fontFamily: 'var(--font)', marginBottom: 10, padding: 0 }}>
          <ArrowLeft size={14} /> Back to Forms
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">{form?.title || '...'}</div>
            <div className="page-subtitle">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
              {' · '}<span style={{ color: '#16a34a', fontWeight: 600 }}>{approvedCount} approved</span>
              {pendingCount > 0 && <span style={{ color: '#92400e' }}> · {pendingCount} pending</span>}
              {rejectedCount > 0 && <span style={{ color: 'var(--red)' }}> · {rejectedCount} rejected</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {submissions.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={exportCSV}><Download size={14} /> CSV</button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => nav(`/forms/${id}/edit`)}>
              <Edit2 size={14} /> Edit Form
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Form schema pills */}
        {form?.schema?.length > 0 && (
          <div className="card" style={{ padding: 14 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Form fields ({form.schema.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {form.schema.map(f => (
                <span key={f.id} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 99, background: 'var(--g50)', color: 'var(--g800)', fontWeight: 500 }}>
                  {f.label}{f.required ? ' *' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Submissions list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }} />
          </div>
        ) : submissions.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <CheckCircle size={40} className="empty-icon" />
              <div className="empty-title">No submissions yet</div>
              <div className="empty-body">Once officers submit this form, entries appear here</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            {submissions.map((sub, i) => {
              const st = STATUS_STYLE[sub.status] || STATUS_STYLE.submitted
              const Icon = st.icon
              return (
                <div
                  key={sub.id}
                  onClick={() => openSubmission(sub)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < submissions.length - 1 ? '1px solid var(--n100)' : 'none', cursor: 'pointer', transition: 'background 0.13s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--n50)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  {/* Status icon */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={st.color} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--n900)' }}>
                      {sub.profiles?.full_name || 'Unknown officer'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--n500)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}</span>
                      {sub.lat && <span>📍 {sub.lat.toFixed(4)}, {sub.lng?.toFixed(4)}</span>}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600, background: st.bg, color: st.color, flexShrink: 0 }}>
                    {st.label}
                  </span>
                  <Eye size={14} color="var(--n300)" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SUBMISSION DETAIL MODAL ── */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) { setSelected(null); setEditMode(false) } }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', padding: 0 }}>

            {/* Modal header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--n200)', background: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--n900)' }}>
                    {form?.title || 'Form Submission'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--n500)', marginTop: 5, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={11} /> {selected.profiles?.full_name || '—'}
                    </span>
                    <span>{format(new Date(selected.submitted_at), 'd MMM yyyy · HH:mm')}</span>
                    {selected.lat && (
                      <a href={`https://maps.google.com/?q=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                        📍 View on map
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setEditMode(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n400)', display: 'flex', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              {/* Current status */}
              <div style={{ marginTop: 10 }}>
                {(() => {
                  const st = STATUS_STYLE[selected.status] || STATUS_STYLE.submitted
                  return (
                    <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 99, fontWeight: 700, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  )
                })()}
              </div>
            </div>

            {/* Form data */}
            <div style={{ padding: '16px 20px' }}>
              {form?.schema?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {form.schema.map(field => (
                    <div key={field.id} style={{ background: 'var(--n50)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--n500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {field.label}{field.required ? ' *' : ''}
                      </div>
                      {editMode ? (
                        field.type === 'select' ? (
                          <select className="form-select" value={editData[field.id] || ''} onChange={e => setEditData(d => ({ ...d, [field.id]: e.target.value }))}>
                            <option value="">Select…</option>
                            {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea className="form-textarea" rows={3} value={editData[field.id] || ''} onChange={e => setEditData(d => ({ ...d, [field.id]: e.target.value }))} />
                        ) : field.type === 'gps' || field.type === 'photo' || field.type === 'signature' ? (
                          <div style={{ fontSize: 13, color: 'var(--n400)', fontStyle: 'italic' }}>Cannot edit {field.type} field</div>
                        ) : (
                          <input className="form-input" value={editData[field.id] || ''} onChange={e => setEditData(d => ({ ...d, [field.id]: e.target.value }))} />
                        )
                      ) : (
                        <div style={{ fontSize: 14, color: editData[field.id] !== undefined && editData[field.id] !== '' ? 'var(--n900)' : 'var(--n400)', fontStyle: editData[field.id] !== undefined && editData[field.id] !== '' ? 'normal' : 'italic', fontWeight: 500 }}>
                          {editData[field.id] !== undefined && editData[field.id] !== ''
                            ? String(editData[field.id])
                            : '— not filled'
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback: show raw data if no schema
                Object.keys(selected.data || {}).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(selected.data || {}).map(([key, value]) => (
                      <div key={key} style={{ background: 'var(--n50)', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--n500)', marginBottom: 4, textTransform: 'capitalize' }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                        {editMode ? (
                          <input className="form-input" value={editData[key] || ''} onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))} />
                        ) : (
                          <div style={{ fontSize: 14, color: 'var(--n800)' }}>
                            {value === null || value === undefined || value === ''
                              ? <span style={{ color: 'var(--n400)', fontStyle: 'italic' }}>—</span>
                              : typeof value === 'object' ? JSON.stringify(value) : String(value)
                            }
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--n400)', padding: '20px 0', fontSize: 13 }}>No data recorded</div>
                )
              )}
            </div>

            {/* Action buttons */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--n200)', background: '#fff', display: 'flex', gap: 10, flexWrap: 'wrap', position: 'sticky', bottom: 0 }}>
              {editMode ? (
                <>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving} style={{ gap: 6 }}>
                    {saving ? <span className="spinner" /> : <><Save size={14} /> Save Changes</>}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditMode(false); setEditData({ ...(selected.data || {}) }) }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {/* Approve — direct, no pending queue */}
                  {selected.status !== 'approved' && (
                    <button className="btn btn-primary btn-sm" onClick={() => approveSubmission(selected)} disabled={saving} style={{ gap: 6 }}>
                      {saving ? <span className="spinner" /> : <><CheckCircle size={14} /> Approve</>}
                    </button>
                  )}
                  {/* Edit */}
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)} style={{ gap: 6 }}>
                    <Edit2 size={14} /> Edit
                  </button>
                  {/* Reject */}
                  {selected.status !== 'rejected' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => rejectSubmission(selected)} disabled={saving} style={{ gap: 6, color: 'var(--red)' }}>
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
