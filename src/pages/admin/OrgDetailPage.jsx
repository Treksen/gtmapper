import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, Layers, UserPlus, X, Check,
  FileText, Plus, Edit2, Trash2, CheckCircle, Clock, XCircle, Save
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast, writeAuditLog } from '../../hooks/useData'
import { ToastContainer } from '../../components/Toast'
import { formatDistanceToNow } from 'date-fns'

const STATUS_STYLE = {
  approved:         { bg: 'var(--g50)',  color: 'var(--g800)', icon: CheckCircle, label: 'Approved'  },
  pending_approval: { bg: '#fffbeb',     color: '#92400e',     icon: Clock,       label: 'Pending'   },
  draft:            { bg: 'var(--n100)', color: 'var(--n600)', icon: FileText,    label: 'Draft'     },
  rejected:         { bg: '#fef2f2',     color: 'var(--red)',  icon: XCircle,     label: 'Rejected'  },
}

export default function OrgDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [org, setOrg]               = useState(null)
  const [members, setMembers]       = useState([])
  const [forms, setForms]           = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading]       = useState(true)
  const [subTab, setSubTab]         = useState('forms')

  // Add User
  const [inviting, setInviting] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [inv, setInv]           = useState({ email: '', full_name: '', role: 'supervisor', password: '' })

  // Edit User
  const [editingMember, setEditingMember] = useState(null) // member object being edited
  const [editMemberData, setEditMemberData] = useState({})
  const [savingMember, setSavingMember]   = useState(false)

  // Form CRUD
  const [formModal, setFormModal]   = useState(null)  // null | 'create' | 'edit'
  const [editingForm, setEditingForm] = useState(null)
  const [formData, setFormData]     = useState({ title: '', description: '', status: 'draft' })
  const [savingForm, setSavingForm] = useState(false)

  async function loadData() {
    setLoading(true)
    const [o, m, f, s] = await Promise.all([
      supabase.from('organisations').select('*').eq('id', id).single(),
      supabase.from('profiles').select('*, organisations!profiles_org_id_fkey(name)').eq('org_id', id).order('full_name'),
      supabase.from('forms').select('*, profiles!forms_created_by_fkey(full_name)').eq('org_id', id).order('created_at', { ascending: false }),
      supabase.from('form_submissions')
        .select('id, form_id, officer_id, submitted_at, status, lat, lng, forms(title), profiles!form_submissions_officer_id_fkey(full_name)')
        .eq('org_id', id)
        .order('submitted_at', { ascending: false })
        .limit(200),
    ])
    setOrg(o.data)
    setMembers(m.data || [])
    setForms(f.data || [])
    setSubmissions(s.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  // ── ADD USER ────────────────────────────────────────────────────────────────
  async function inviteUser() {
    if (!inv.email.trim() || !inv.full_name.trim() || !inv.password.trim()) return toast('All fields are required', 'error')
    if (inv.password.length < 6) return toast('Password must be at least 6 characters', 'error')
    setSaving(true)
    try {
      const { data: rpcData, error } = await supabase.rpc('create_platform_user', {
        p_email: inv.email.trim(), p_password: inv.password,
        p_full_name: inv.full_name.trim(), p_role: inv.role, p_org_id: id,
      })
      if (error) throw error
      await writeAuditLog(profile.id, 'super_admin', 'user_invited', 'profiles', rpcData?.id, { email: inv.email, role: inv.role }, id)
      toast('User created successfully ✓')
      setInviting(false); setInv({ email: '', full_name: '', role: 'supervisor', password: '' })
      loadData()
    } catch (e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  // ── EDIT USER ───────────────────────────────────────────────────────────────
  function openEditMember(member) {
    setEditingMember(member)
    setEditMemberData({
      full_name: member.full_name,
      phone:     member.phone || '',
      role:      member.role,
      active:    member.active,
    })
  }

  async function saveMember() {
    setSavingMember(true)
    try {
      const updates = {
        full_name:  editMemberData.full_name,
        phone:      editMemberData.phone || null,
        role:       editMemberData.role,
        active:     editMemberData.active,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('profiles').update(updates).eq('id', editingMember.id)
      if (error) throw error
      await writeAuditLog(profile.id, 'super_admin', 'user_updated', 'profiles', editingMember.id, updates, id)
      toast('User updated ✓')
      setEditingMember(null)
      loadData()
    } catch (e) { toast(e.message, 'error') } finally { setSavingMember(false) }
  }

  async function toggleActive(member) {
    const newActive = !member.active
    await supabase.from('profiles').update({ active: newActive }).eq('id', member.id)
    await writeAuditLog(profile.id, 'super_admin', newActive ? 'user_activated' : 'user_deactivated', 'profiles', member.id, {}, id)
    toast(newActive ? 'User activated' : 'User deactivated')
    setMembers(ms => ms.map(x => x.id === member.id ? { ...x, active: newActive } : x))
  }

  // ── FORM CRUD ───────────────────────────────────────────────────────────────
  function openCreateForm() {
    setFormData({ title: '', description: '', status: 'draft' })
    setEditingForm(null)
    setFormModal('create')
  }

  function openEditForm(form) {
    setFormData({ title: form.title, description: form.description || '', status: form.status })
    setEditingForm(form)
    setFormModal('edit')
  }

  async function saveForm() {
    if (!formData.title.trim()) return toast('Form title is required', 'error')
    setSavingForm(true)
    try {
      if (formModal === 'create') {
        const { data, error } = await supabase.from('forms').insert({
          org_id:      id,
          created_by:  profile.id,
          title:       formData.title.trim(),
          description: formData.description,
          schema:      [],
          status:      formData.status,
          active:      formData.status === 'approved',
          version:     1,
        }).select().single()
        if (error) throw error
        await writeAuditLog(profile.id, 'super_admin', 'form_created', 'forms', data.id, { title: formData.title }, id)
        toast('Form created ✓')
      } else {
        const { error } = await supabase.from('forms').update({
          title:       formData.title.trim(),
          description: formData.description,
          status:      formData.status,
          active:      formData.status === 'approved',
          updated_at:  new Date().toISOString(),
          ...(formData.status === 'approved' ? { approved_by: profile.id, approved_at: new Date().toISOString() } : {}),
        }).eq('id', editingForm.id)
        if (error) throw error
        await writeAuditLog(profile.id, 'super_admin', 'form_updated', 'forms', editingForm.id, formData, id)
        toast('Form updated ✓')
      }
      setFormModal(null); loadData()
    } catch (e) { toast(e.message, 'error') } finally { setSavingForm(false) }
  }

  async function deleteForm(form) {
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return
    const { error } = await supabase.from('forms').delete().eq('id', form.id)
    if (error) return toast(error.message, 'error')
    await writeAuditLog(profile.id, 'super_admin', 'form_deleted', 'forms', form.id, { title: form.title }, id)
    toast('Form deleted')
    loadData()
  }

  async function approveForm(form) {
    await supabase.from('forms').update({
      status: 'approved', active: true,
      approved_by: profile.id, approved_at: new Date().toISOString()
    }).eq('id', form.id)
    await writeAuditLog(profile.id, 'super_admin', 'form_approved', 'forms', form.id, { title: form.title }, id)
    toast('Form approved ✓'); loadData()
  }

  async function rejectForm(form) {
    await supabase.from('forms').update({ status: 'rejected', active: false }).eq('id', form.id)
    await writeAuditLog(profile.id, 'super_admin', 'form_rejected', 'forms', form.id, { title: form.title }, id)
    toast('Form rejected'); loadData()
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
      <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
    </div>
  )
  if (!org) return <div style={{ padding: 24, color: 'var(--n500)' }}>Organisation not found.</div>

  const supervisors = members.filter(m => m.role === 'supervisor')
  const officers    = members.filter(m => m.role === 'officer')

  return (
    <div className="page fade-in">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--n200)', padding: '16px 24px' }}>
        <button onClick={() => nav('/organisations')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n500)', fontSize: 13, fontFamily: 'var(--font)', marginBottom: 12, padding: 0 }}>
          <ArrowLeft size={14} /> Back to Organisations
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--n900)' }}>{org.name}</div>
            <div style={{ fontSize: 13, color: 'var(--n500)', marginTop: 2 }}>{org.country} · {org.status || 'active'}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setInviting(v => !v)} style={{ gap: 6 }}>
            <UserPlus size={15} />{inviting ? 'Cancel' : 'Add User'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Supervisors',    value: supervisors.length,  color: 'var(--g600)' },
            { label: 'Field Officers', value: officers.length,     color: '#3b82f6'     },
            { label: 'Forms',          value: forms.length,        color: 'var(--amber)'},
            { label: 'Submissions',    value: submissions.length,  color: 'var(--info)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="metric" style={{ borderLeft: `4px solid ${color}`, padding: 14 }}>
              <div className="metric-label">{label}</div>
              <div className="metric-value" style={{ color, fontSize: 22 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Add user form */}
        {inviting && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--n900)', marginBottom: 16 }}>Add User to {org.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group"><label className="form-label">Full name *</label>
                  <input className="form-input" value={inv.full_name} onChange={e => setInv(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Jane Mwangi" autoComplete="off" /></div>
                <div className="form-group"><label className="form-label">Email address *</label>
                  <input className="form-input" type="email" value={inv.email} onChange={e => setInv(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" autoComplete="off" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group"><label className="form-label">Role</label>
                  <select className="form-select" value={inv.role} onChange={e => setInv(f => ({ ...f, role: e.target.value }))}>
                    <option value="supervisor">Supervisor</option>
                    <option value="officer">Field Officer</option>
                  </select></div>
                <div className="form-group"><label className="form-label">Password *</label>
                  <input className="form-input" type="password" value={inv.password} onChange={e => setInv(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" autoComplete="new-password" /></div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={inviteUser} disabled={saving}>
                  {saving ? <span className="spinner" /> : <><Check size={14} /> Create User</>}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setInviting(false); setInv({ email: '', full_name: '', role: 'supervisor', password: '' }) }}>
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit user modal */}
        {editingMember && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) setEditingMember(null) }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 460, boxShadow: 'var(--sh-lg)' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--n900)', marginBottom: 20 }}>
                Edit {editingMember.full_name}
              </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group"><label className="form-label">Full name</label>
                  <input className="form-input" value={editMemberData.full_name} onChange={e => setEditMemberData(d => ({ ...d, full_name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Phone</label>
                  <input className="form-input" value={editMemberData.phone} onChange={e => setEditMemberData(d => ({ ...d, phone: e.target.value }))} placeholder="+254 7..." /></div>
                <div className="form-group"><label className="form-label">Role</label>
                  <select className="form-select" value={editMemberData.role} onChange={e => setEditMemberData(d => ({ ...d, role: e.target.value }))}>
                    <option value="supervisor">Supervisor</option>
                    <option value="officer">Field Officer</option>
                  </select></div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={editMemberData.active} onChange={e => setEditMemberData(d => ({ ...d, active: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--g700)' }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--n800)' }}>Account active</span>
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-primary btn-sm" onClick={saveMember} disabled={savingMember}>
                  {savingMember ? <span className="spinner" /> : <><Save size={14} /> Save Changes</>}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingMember(null)}><X size={14} /> Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Members */}
        <div>
          <div className="section-label" style={{ marginBottom: 10 }}>Members ({members.length})</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {members.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <Users size={32} className="empty-icon" />
                <div className="empty-title">No members yet</div>
                <div className="empty-body">Use Add User to create the first member</div>
              </div>
            ) : members.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < members.length - 1 ? '1px solid var(--n100)' : 'none' }}>
                <div style={{ position: 'relative' }}>
                  <div className="avatar" style={{ width: 38, height: 38, fontSize: 12 }}>
                    {m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: (() => { const mins = m.last_seen_at ? (Date.now() - new Date(m.last_seen_at)) / 60000 : Infinity; return m.is_online && mins < 5 ? '#22c55e' : mins < 30 ? '#f59e0b' : 'var(--n300)' })(), border: '2px solid #fff' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n900)' }}>{m.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--n500)' }}>
                    {m.role.replace('_', ' ')} · {m.organisations?.name || 'GeoTreks Kenya'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: m.active ? 'var(--g50)' : '#fef2f2', color: m.active ? 'var(--g800)' : 'var(--red)' }}>
                    {m.active ? 'active' : 'inactive'}
                  </span>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} title="Edit user" onClick={() => openEditMember(m)}>
                    <Edit2 size={13} />
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => toggleActive(m)}>
                    {m.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FORMS SECTION (tabbed: Templates + Submitted) ── */}
        <div>
          {/* Tab switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', background: 'var(--n100)', borderRadius: 10, padding: 3, gap: 2 }}>
              {[
                { key: 'forms',     label: `Form Templates (${forms.length})`       },
                { key: 'submitted', label: `Submitted Forms (${submissions.length})` },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setSubTab(key)} style={{
                  padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font)', fontWeight: 700, fontSize: 12,
                  background: subTab === key ? '#fff' : 'transparent',
                  color: subTab === key ? 'var(--n900)' : 'var(--n500)',
                  boxShadow: subTab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  {label}
                </button>
              ))}
            </div>
            {subTab === 'forms' && (
              <button className="btn btn-primary btn-sm" onClick={openCreateForm}>
                <Plus size={13} /> New Form
              </button>
            )}
          </div>

          {subTab === 'forms' && (
            <>
          {forms.length === 0 ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <FileText size={32} style={{ color: 'var(--n300)', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, color: 'var(--n500)' }}>No forms yet — create the first one</div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              {forms.map((f, i) => {
                const st = STATUS_STYLE[f.status] || STATUS_STYLE.draft
                const Icon = st.icon
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < forms.length - 1 ? '1px solid var(--n100)' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={17} color={st.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n900)' }}>{f.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--n500)', marginTop: 1 }}>
                        v{f.version} · {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                        {f.profiles?.full_name ? ` · by ${f.profiles.full_name}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: st.bg, color: st.color, flexShrink: 0 }}>
                      {st.label}
                    </span>
                    {f.status === 'pending_approval' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => approveForm(f)}>
                          <Check size={12} /> Approve
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--red)' }} onClick={() => rejectForm(f)}>
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} title="Edit" onClick={() => openEditForm(f)}>
                        <Edit2 size={13} color="var(--n500)" />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} title="Delete" onClick={() => deleteForm(f)}>
                        <Trash2 size={13} color="var(--red)" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
            </>
          )}

          {subTab === 'submitted' && (
            <>
          {submissions.length === 0 ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <FileText size={32} style={{ color: 'var(--n300)', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, color: 'var(--n500)' }}>No submissions yet from this organisation</div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden', maxHeight: 520, overflowY: 'auto' }}>
              {submissions.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < submissions.length - 1 ? '1px solid var(--n100)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={17} color="#3b82f6" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.forms?.title || 'Untitled Form'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--n500)', marginTop: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{s.profiles?.full_name || 'Unknown officer'}</span>
                      <span>· {formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {s.lat && (
                    <a
                      href={`https://maps.google.com/?q=${s.lat},${s.lng}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                      onClick={e => e.stopPropagation()}
                    >
                      📍 Map
                    </a>
                  )}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: 'var(--g50)', color: 'var(--g800)', flexShrink: 0 }}>
                    {s.status || 'submitted'}
                  </span>
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Form create/edit modal */}
      {formModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setFormModal(null) }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 460, boxShadow: 'var(--sh-lg)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--n900)', marginBottom: 20 }}>
              {formModal === 'create' ? 'Create New Form' : `Edit "${editingForm?.title}"`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group"><label className="form-label">Title *</label>
                <input className="form-input" value={formData.title} onChange={e => setFormData(d => ({ ...d, title: e.target.value }))} placeholder="e.g. Household Survey" /></div>
              <div className="form-group"><label className="form-label">Description</label>
                <input className="form-input" value={formData.description} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} placeholder="What is this form for?" /></div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="form-select" value={formData.status} onChange={e => setFormData(d => ({ ...d, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved (active)</option>
                  <option value="rejected">Rejected</option>
                </select>
                {formData.status === 'approved' && (
                  <div style={{ fontSize: 12, color: 'var(--g700)', marginTop: 5 }}>✓ Setting to Approved will make this form available to officers immediately.</div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary btn-sm" onClick={saveForm} disabled={savingForm}>
                {savingForm ? <span className="spinner" /> : <><Save size={14} /> {formModal === 'create' ? 'Create Form' : 'Save Changes'}</>}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setFormModal(null)}><X size={14} /> Cancel</button>
            </div>
            {formModal === 'edit' && (
              <div style={{ fontSize: 12, color: 'var(--n400)', marginTop: 12 }}>
                To edit the form fields/schema, use the Form Builder from the Forms page.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
