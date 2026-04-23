import React, { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, Users, UserCheck } from 'lucide-react'
import { usePendingActions, useToast } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ToastContainer } from '../../components/Toast'
import { formatDistanceToNow } from 'date-fns'

export default function MyApprovalsPage() {
  const { profile } = useAuth()
  const { actions, loading: actionsLoading, refetch: refetchActions } = usePendingActions(profile?.org_id)
  const { toasts, toast } = useToast()

  const [registrations, setRegistrations] = useState([])
  const [regLoading, setRegLoading]       = useState(true)
  const [processing, setProcessing]       = useState(null)
  const [rejectNote, setRejectNote]       = useState('')
  const [rejectingId, setRejectingId]     = useState(null)

  const fetchRegistrations = useCallback(async () => {
    setRegLoading(true)
    // Supervisor sees officer registrations (no org assigned yet, role=officer)
    // Admin sees supervisor registrations
    const { data } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('status', 'pending')
      .eq('role', 'officer') // supervisor approves officers
      .order('created_at', { ascending: false })
    setRegistrations(data || [])
    setRegLoading(false)
  }, [])

  useEffect(() => { fetchRegistrations() }, [fetchRegistrations])

  async function approveRegistration(reg) {
    setProcessing(reg.id)
    try {
      // Activate profile and assign org
      await supabase.from('profiles').update({
        active:  true,
        org_id:  profile.org_id,
        role:    reg.role,
      }).eq('id', reg.user_id)

      // Mark registration approved
      await supabase.from('pending_registrations').update({
        status:      'approved',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        org_id:      profile.org_id,
      }).eq('id', reg.id)

      // Notify user
      await supabase.from('notifications').insert({
        org_id:     profile.org_id,
        officer_id: reg.user_id,
        type:       'success',
        title:      'Account approved',
        message:    `Your account has been approved. Welcome to ${profile?.organisations?.name || 'the team'}!`,
      })

      toast('Account approved ✓')
      fetchRegistrations()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setProcessing(null)
    }
  }

  async function rejectRegistration(reg) {
    if (!rejectNote.trim()) return toast('Add a rejection reason', 'error')
    setProcessing(reg.id)
    try {
      await supabase.from('profiles').update({ active: false }).eq('id', reg.user_id)
      await supabase.from('pending_registrations').update({
        status:      'rejected',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        review_note: rejectNote,
      }).eq('id', reg.id)

      toast('Registration rejected')
      setRejectingId(null); setRejectNote(''); fetchRegistrations()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setProcessing(null)
    }
  }

  const totalPending = registrations.length + actions.length

  return (
    <div className="page fade-in">
      <ToastContainer toasts={toasts} />
      <div className="page-header">
        <div className="page-title">Approvals</div>
        <div className="page-subtitle">{totalPending} pending</div>
      </div>

      <div className="page-body">

        {/* ── Pending Registrations ── */}
        {(regLoading || registrations.length > 0) && (
          <div>
            <div className="section-label" style={{ marginBottom: 10 }}>New User Registrations</div>
            {regLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner spinner-dark" style={{ width: 24, height: 24, margin: '0 auto' }} /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {registrations.map(reg => (
                  <div key={reg.id} className="card" style={{ overflow: 'hidden', borderLeft: '4px solid var(--g600)' }}>
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <UserCheck size={20} color="var(--g700)" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--n900)' }}>{reg.full_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--n500)', marginTop: 1 }}>{reg.email} · {reg.role} · {formatDistanceToNow(new Date(reg.created_at), { addSuffix: true })}</div>
                        </div>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: '#fffbeb', color: '#92400e', fontWeight: 700 }}>pending</span>
                      </div>

                      {rejectingId === reg.id && (
                        <div className="form-group" style={{ marginBottom: 12 }}>
                          <label className="form-label">Rejection reason *</label>
                          <textarea className="form-textarea" value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Explain why..." style={{ minHeight: 64 }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        {rejectingId === reg.id ? (
                          <>
                            <button className="btn btn-danger btn-sm" onClick={() => rejectRegistration(reg)} disabled={processing === reg.id}>
                              {processing === reg.id ? <span className="spinner" /> : <><XCircle size={13} /> Confirm</>}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setRejectingId(null); setRejectNote('') }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => approveRegistration(reg)} disabled={processing === reg.id}>
                              {processing === reg.id ? <span className="spinner" /> : <><CheckCircle size={13} /> Approve</>}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => setRejectingId(reg.id)}>
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Pending Actions (form approvals etc.) ── */}
        {actions.length > 0 && (
          <div>
            <div className="section-label" style={{ marginBottom: 10 }}>Form & Data Approvals</div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {actions.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < actions.length - 1 ? '1px solid var(--n100)' : 'none' }}>
                  <Clock size={16} color="var(--amber)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n900)', textTransform: 'capitalize' }}>{a.action_type?.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 12, color: 'var(--n500)' }}>by {a.profiles?.full_name} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalPending === 0 && !regLoading && !actionsLoading && (
          <div className="card">
            <div className="empty-state">
              <CheckCircle size={40} className="empty-icon" />
              <div className="empty-title">All clear!</div>
              <div className="empty-body">No pending approvals</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
