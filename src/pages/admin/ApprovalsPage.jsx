import React, { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Building2, Users, FileText, UserCheck } from 'lucide-react'
import { usePendingActions, useToast, useOrganisations } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ToastContainer } from '../../components/Toast'
import { formatDistanceToNow } from 'date-fns'

const ICONS  = { create_user:Users, edit_user:Users, delete_user:Users, create_form:FileText, edit_form:FileText, delete_form:FileText, edit_submission:FileText, register_org:Building2 }
const COLORS = { create_user:'var(--g600)', edit_user:'var(--amber)', delete_user:'var(--red)', create_form:'#3b82f6', edit_form:'var(--amber)', delete_form:'var(--red)', edit_submission:'var(--amber)', register_org:'var(--g600)' }

export default function ApprovalsPage() {
  const { profile } = useAuth()
  const { actions, loading, refetch } = usePendingActions()
  const { orgs } = useOrganisations()
  const { toasts, toast } = useToast()

  const [expanded,    setExpanded]    = useState(null)
  const [rejectNote,  setRejectNote]  = useState('')
  const [rejectingId, setRejectingId] = useState(null)
  const [processing,  setProcessing]  = useState(null)

  // Supervisor registrations (admin approves supervisors)
  const [supervisorRegs, setSupervisorRegs] = useState([])
  const [regLoading, setRegLoading]         = useState(true)
  const [assignOrg, setAssignOrg]           = useState({})
  const [rejectingRegId, setRejectingRegId] = useState(null)
  const [regRejectNote, setRegRejectNote]   = useState('')

  const fetchSupervisorRegs = useCallback(async () => {
    setRegLoading(true)
    const { data } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('status', 'pending')
      .eq('role', 'supervisor')
      .order('created_at', { ascending: false })
    setSupervisorRegs(data || [])
    setRegLoading(false)
  }, [])

  useEffect(() => { fetchSupervisorRegs() }, [fetchSupervisorRegs])

  async function approveSupervisor(reg) {
    const orgId = assignOrg[reg.id]
    if (!orgId) return toast('Please assign an organisation first', 'error')
    setProcessing(reg.id)
    try {
      await supabase.from('profiles').update({ active: true, org_id: orgId, role: 'supervisor' }).eq('id', reg.user_id)
      await supabase.from('pending_registrations').update({ status: 'approved', reviewed_by: profile.id, reviewed_at: new Date().toISOString(), org_id: orgId }).eq('id', reg.id)
      await supabase.from('notifications').insert({ org_id: orgId, officer_id: reg.user_id, type: 'success', title: 'Account approved', message: 'Your supervisor account has been approved. You can now log in.' })
      toast('Supervisor approved ✓')
      fetchSupervisorRegs()
    } catch (e) { toast(e.message, 'error') } finally { setProcessing(null) }
  }

  async function rejectSupervisor(reg) {
    if (!regRejectNote.trim()) return toast('Add rejection reason', 'error')
    setProcessing(reg.id)
    try {
      await supabase.from('profiles').update({ active: false }).eq('id', reg.user_id)
      await supabase.from('pending_registrations').update({ status: 'rejected', reviewed_by: profile.id, reviewed_at: new Date().toISOString(), review_note: regRejectNote }).eq('id', reg.id)
      toast('Registration rejected')
      setRejectingRegId(null); setRegRejectNote(''); fetchSupervisorRegs()
    } catch (e) { toast(e.message, 'error') } finally { setProcessing(null) }
  }

  async function approve(action) {
    setProcessing(action.id)
    try {
      const p = action.payload || {}
      if (action.action_type === 'create_form')        await supabase.from('forms').update({ status: 'approved', approved_by: profile.id, approved_at: new Date().toISOString(), active: true }).eq('id', action.target_id)
      else if (action.action_type === 'edit_form')     await supabase.from('forms').update({ ...p, status: 'approved', approved_by: profile.id, approved_at: new Date().toISOString() }).eq('id', action.target_id)
      else if (action.action_type === 'delete_form')   await supabase.from('forms').update({ active: false }).eq('id', action.target_id)
      else if (action.action_type === 'edit_submission') await supabase.from('form_submissions').update({ data: p.new_data, status: 'approved', approved_by: profile.id, edit_payload: null }).eq('id', action.target_id)
      await supabase.from('pending_actions').update({ status: 'approved', reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq('id', action.id)
      await supabase.from('notifications').insert({ org_id: action.org_id, type: 'success', title: 'Action approved', message: `Your request to ${action.action_type?.replace(/_/g, ' ')} was approved.`, officer_id: action.requested_by })
      toast('Approved ✓'); setExpanded(null); refetch()
    } catch (e) { toast(e.message, 'error') } finally { setProcessing(null) }
  }

  async function reject(action) {
    if (!rejectNote.trim()) return toast('Add rejection reason', 'error')
    setProcessing(action.id)
    try {
      await supabase.from('pending_actions').update({ status: 'rejected', reviewed_by: profile.id, reviewed_at: new Date().toISOString(), review_note: rejectNote }).eq('id', action.id)
      await supabase.from('notifications').insert({ org_id: action.org_id, type: 'warning', title: 'Action rejected', message: `Your request to ${action.action_type?.replace(/_/g, ' ')} was rejected. ${rejectNote}`, officer_id: action.requested_by })
      toast('Rejected'); setRejectingId(null); setRejectNote(''); setExpanded(null); refetch()
    } catch (e) { toast(e.message, 'error') } finally { setProcessing(null) }
  }

  const totalPending = supervisorRegs.length + actions.length

  return (
    <div className="page fade-in">
      <ToastContainer toasts={toasts} />
      <div className="page-header">
        <div className="page-title">Approval Queue</div>
        <div className="page-subtitle">{totalPending} pending</div>
      </div>

      <div className="page-body">

        {/* ── Supervisor registrations ── */}
        {supervisorRegs.length > 0 && (
          <div>
            <div className="section-label" style={{ marginBottom: 10 }}>Supervisor Registrations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {supervisorRegs.map(reg => (
                <div key={reg.id} className="card" style={{ overflow: 'hidden', borderLeft: '4px solid var(--g600)' }}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserCheck size={20} color="var(--g700)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{reg.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--n500)' }}>{reg.email} · {formatDistanceToNow(new Date(reg.created_at), { addSuffix: true })}</div>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Assign Organisation *</label>
                      <select className="form-select" value={assignOrg[reg.id] || ''} onChange={e => setAssignOrg(o => ({ ...o, [reg.id]: e.target.value }))}>
                        <option value="">Select organisation...</option>
                        {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>

                    {rejectingRegId === reg.id && (
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Rejection reason *</label>
                        <textarea className="form-textarea" value={regRejectNote} onChange={e => setRegRejectNote(e.target.value)} placeholder="Explain why..." style={{ minHeight: 60 }} />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      {rejectingRegId === reg.id ? (
                        <>
                          <button className="btn btn-danger btn-sm" onClick={() => rejectSupervisor(reg)} disabled={processing === reg.id}>
                            {processing === reg.id ? <span className="spinner" /> : <><XCircle size={13} /> Confirm Reject</>}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setRejectingRegId(null); setRegRejectNote('') }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => approveSupervisor(reg)} disabled={processing === reg.id}>
                            {processing === reg.id ? <span className="spinner" /> : <><CheckCircle size={13} /> Approve</>}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setRejectingRegId(reg.id)}><XCircle size={13} /> Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pending actions ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }} /></div>
        ) : actions.length === 0 && supervisorRegs.length === 0 && !regLoading ? (
          <div className="card"><div className="empty-state"><CheckCircle size={40} className="empty-icon" /><div className="empty-title">All clear!</div><div className="empty-body">No pending actions</div></div></div>
        ) : (
          <div>
            {actions.length > 0 && <div className="section-label" style={{ marginBottom: 10 }}>Form & Data Actions</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {actions.map(action => {
                const Icon  = ICONS[action.action_type] || Clock
                const color = COLORS[action.action_type] || 'var(--n500)'
                const isExp = expanded === action.id
                const isRej = rejectingId === action.id
                return (
                  <div key={action.id} className="card" style={{ overflow: 'hidden', borderLeft: `4px solid ${color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(isExp ? null : action.id)}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} color={color} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--n900)', textTransform: 'capitalize' }}>{action.action_type?.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: 12, color: 'var(--n500)', marginTop: 2 }}>{action.profiles?.full_name} · {action.organisations?.name} · {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}</div>
                      </div>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: '#fffbeb', color: '#92400e', fontWeight: 600 }}>pending</span>
                      {isExp ? <ChevronUp size={16} color="var(--n400)" /> : <ChevronDown size={16} color="var(--n400)" />}
                    </div>
                    {isExp && (
                      <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--n100)' }}>
                        <pre style={{ background: 'var(--n50)', border: '1px solid var(--n200)', borderRadius: 8, padding: 12, fontSize: 12, fontFamily: 'var(--mono)', overflowX: 'auto', color: 'var(--n700)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: 12, marginBottom: 12 }}>{JSON.stringify(action.payload, null, 2)}</pre>
                        {isRej && <div className="form-group" style={{ marginBottom: 12 }}><label className="form-label">Rejection reason *</label><textarea className="form-textarea" value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Explain why..." style={{ minHeight: 64 }} /></div>}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => approve(action)} disabled={processing === action.id}>{processing === action.id ? <span className="spinner" /> : <><CheckCircle size={14} /> Approve</>}</button>
                          {isRej ? (
                            <>
                              <button className="btn btn-danger btn-sm" onClick={() => reject(action)} disabled={processing === action.id}><XCircle size={14} /> Confirm</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setRejectingId(null); setRejectNote('') }}>Cancel</button>
                            </>
                          ) : (
                            <button className="btn btn-danger btn-sm" onClick={() => setRejectingId(action.id)}><XCircle size={14} /> Reject</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
