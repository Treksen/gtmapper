import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, ChevronRight, Clock, UserPlus, X, Copy, Check, RefreshCw } from 'lucide-react'
import { useOfficers, useDashboardStats, getOfficerStatus } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

// ── Generate a random 6-digit numeric code ────────────────────────────────────
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ── Add User Modal ────────────────────────────────────────────────────────────
function AddUserModal({ onClose, orgId, createdBy }) {
  const [step, setStep] = useState('form') // 'form' | 'code'
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [copied, setCopied] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    phone:     '',
    role:      'officer',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleCreate() {
    if (!form.full_name.trim()) return setError('Full name is required')
    setError('')
    setSaving(true)
    try {
      let code = generateCode()
      let attempts = 0
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from('invite_codes').select('id').eq('code', code).eq('status', 'pending').maybeSingle()
        if (!existing) break
        code = generateCode()
        attempts++
      }

      const { error: insertErr } = await supabase.from('invite_codes').insert({
        code,
        org_id:     orgId,
        created_by: createdBy,
        full_name:  form.full_name.trim(),
        phone:      form.phone.trim() || null,
        role:       form.role,
        status:     'pending',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      if (insertErr) throw insertErr

      setGeneratedCode(code)
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback — select text
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--n900)' }}>
              {step === 'form' ? 'Add New User' : 'Invite Code Generated'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--n400)', marginTop: 2 }}>
              {step === 'form' ? 'Fill in the user details then share the invite code' : 'Share this code with the new user'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n400)', padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* ── STEP 1: FORM ── */}
        {step === 'form' && (
          <>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full name *</label>
                <input className="form-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="e.g. Jane Mwangi" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone number</label>
                <input className="form-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+254 7XX XXX XXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['officer','Field Officer'], ['supervisor','Supervisor']].map(([val, lbl]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--r-md)', border: `2px solid ${form.role === val ? 'var(--g600)' : 'var(--n200)'}`, background: form.role === val ? 'var(--g50)' : '#fff', cursor: 'pointer', transition: 'all 0.13s' }}>
                      <input type="radio" name="role" value={val} checked={form.role === val} onChange={() => set('role', val)} style={{ accentColor: 'var(--g700)' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: form.role === val ? 'var(--g800)' : 'var(--n600)' }}>{lbl}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleCreate}
                disabled={saving || !form.full_name.trim()}
              >
                {saving ? <span className="spinner" /> : <><UserPlus size={15} /> Generate Invite Code</>}
              </button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {/* ── STEP 2: CODE DISPLAY ── */}
        {step === 'code' && (
          <div style={{ textAlign: 'center' }}>
            {/* Success icon */}
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--g50)', border: '2px solid var(--g200)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={30} color="var(--g700)" strokeWidth={2.5} />
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--n900)', marginBottom: 4 }}>
              Invite code created for <span style={{ color: 'var(--g700)' }}>{form.full_name}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--n500)', marginBottom: 24 }}>
              {form.role === 'officer' ? 'Field Officer' : 'Supervisor'}
            </div>

            {/* The Code */}
            <div style={{ background: 'var(--g50)', border: '2px dashed var(--g300)', borderRadius: 16, padding: '24px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g700)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Invite Code
              </div>
              <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '0.18em', color: 'var(--g900)', fontFamily: 'var(--mono)' }}>
                {generatedCode}
              </div>
              <div style={{ fontSize: 12, color: 'var(--n400)', marginTop: 10 }}>
                Expires in 48 hours
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={copyCode}
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 10, gap: 8 }}
            >
              {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Code</>}
            </button>

            {/* Instructions */}
            <div style={{ background: 'var(--n50)', borderRadius: 10, padding: '14px 16px', textAlign: 'left', fontSize: 13, color: 'var(--n600)', lineHeight: 1.6, marginBottom: 16 }}>
              <strong>Instructions for {form.full_name}:</strong>
              <ol style={{ paddingLeft: 18, marginTop: 6 }}>
                <li>Open GT Mapper and tap <strong>Sign In</strong></li>
                <li>Tap <strong>"Redeem Invite Code"</strong></li>
                <li>Enter the code: <strong style={{ fontFamily: 'var(--mono)', color: 'var(--g800)', fontSize: 15 }}>{generatedCode}</strong></li>
                <li>Set up your email and password</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => { setStep('form'); setForm({ full_name: '', phone: '', role: 'officer' }); setGeneratedCode('') }}
              >
                <UserPlus size={15} /> Add Another
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main OfficersPage ─────────────────────────────────────────────────────────
export default function OfficersPage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const { officers, loading } = useOfficers()
  const { stats }             = useDashboardStats()
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('all')
  const [sortBy,   setSortBy]   = useState('name')
  const [showAdd,  setShowAdd]  = useState(false)

  const activeCount   = officers.filter(o => getOfficerStatus(o) === 'active').length
  const inactiveCount = officers.filter(o => getOfficerStatus(o) === 'inactive').length

  const filtered = officers
    .filter(o => {
      const matchSearch = o.full_name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = status === 'all' || getOfficerStatus(o) === status
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      if (sortBy === 'name')   return a.full_name.localeCompare(b.full_name)
      if (sortBy === 'status') {
        const order = { active: 0, inactive: 1, offline: 2 }
        return (order[getOfficerStatus(a)] ?? 2) - (order[getOfficerStatus(b)] ?? 2)
      }
      return 0
    })

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">Field Officers</div>
          <div className="page-subtitle">
            {officers.length} registered · {activeCount} online now · {inactiveCount} recently active
          </div>
        </div>
        {/* ── ADD USER BUTTON ── */}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAdd(true)}
          style={{ gap: 6, flexShrink: 0 }}
        >
          <UserPlus size={15} /> Add User
        </button>
      </div>

      <div className="page-body">
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--n400)' }} />
          <input
            className="form-input"
            placeholder="Search by name or zone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {[
              { key: 'all',      label: `All (${officers.length})` },
              { key: 'active',   label: `Online (${activeCount})`  },
              { key: 'inactive', label: 'Recent'                   },
              { key: 'offline',  label: 'Offline'                  },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setStatus(key)}
                className={`btn btn-sm ${status === key ? 'btn-primary' : 'btn-ghost'}`}>
                {label}
              </button>
            ))}
          </div>
          <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 140 }}>
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>

        {/* Officer list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-title">No officers found</div>
              <div className="empty-body">Tap "Add User" to invite your first officer</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            {filtered.map((o, i) => {
              const st          = getOfficerStatus(o)
              // const todayVisits = stats?.visits?.filter(v => v.officer_id === o.id).length || 0
              // const zTarget     = zones.find(z => z.id === o.zone_id)?.daily_target || 0
              const statusColor = st === 'active' ? '#22c55e' : st === 'inactive' ? '#f59e0b' : '#ef4444'
              const statusBg    = st === 'active' ? '#f0fdf4' : st === 'inactive' ? '#fffbeb' : '#fef2f2'

              return (
                <div
                  key={o.id}
                  onClick={() => nav(`/officers/${o.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--n100)' : 'none', cursor: 'pointer', transition: 'background 0.13s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--n50)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div className="avatar" style={{ width: 42, height: 42, fontSize: 14, fontWeight: 700 }}>
                      {o.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: statusColor, border: '2px solid #fff' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--n900)' }}>{o.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--n500)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      {/* <MapPin size={11} /> {o.zones?.name || 'No zone assigned'} */}
                    </div>
                    {o.last_seen_at && (
                      <div style={{ fontSize: 11, color: 'var(--n400)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} />
                        {st === 'active' ? 'Online now' : `Last seen ${formatDistanceToNow(new Date(o.last_seen_at), { addSuffix: true })}`}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', marginRight: 6 }}>
                    {/* <div style={{ fontSize: 15, fontWeight: 800, color: todayVisits >= zTarget && zTarget > 0 ? 'var(--g700)' : 'var(--n700)' }}>
                      {todayVisits}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--n400)' }}>/{zTarget}</span>
                    </div> */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, marginTop: 4, padding: '2px 8px', borderRadius: 99, background: statusBg, color: statusColor }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                      {st === 'active' ? 'Online' : st === 'inactive' ? 'Recent' : 'Offline'}
                    </span>
                  </div>
                  <ChevronRight size={15} color="var(--n300)" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          orgId={profile.org_id}
          createdBy={profile.id}
        />
      )}
    </div>
  )
}
