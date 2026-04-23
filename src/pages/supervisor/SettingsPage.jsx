import React, { useState } from 'react'
import { User, Building, Save, LogOut, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useData'
import { ToastContainer } from '../../components/Toast'

export default function SettingsPage() {
  const { profile, updateProfile, signOut } = useAuth()
  const { toasts, toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone:     profile?.phone || '',
  })
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile(form)
      toast('Profile updated successfully')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page fade-in">
      <ToastContainer toasts={toasts} />
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Manage your account and preferences</div>
      </div>

      <div className="page-body">
        {/* Profile */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--n100)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <User size={16} color="var(--g700)"/> Profile
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 6 }}>
              <div className="avatar" style={{ width: 56, height: 56, fontSize: 20, fontWeight: 800 }}>
                {profile?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{profile?.full_name}</div>
                <div style={{ fontSize: 13, color: 'var(--n500)', textTransform: 'capitalize' }}>{profile?.role}</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone number</label>
              <input className="form-input" type="tel" placeholder="+254 7XX XXX XXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email (cannot change)</label>
              <input className="form-input" value={profile?.id || ''} disabled style={{ color: 'var(--n400)', background: 'var(--n50)' }} />
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ alignSelf: 'flex-start' }}>
              {saving ? <span className="spinner"/> : <><Save size={15}/> Save changes</>}
            </button>
          </div>
        </div>

        {/* Organisation */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--n100)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <Building size={16} color="var(--g700)"/> Organisation
          </div>
          <div style={{ padding: 18 }}>
            {[
              { label: 'Name',    value: profile?.organisations?.name || 'GeoTreks Kenya' },
              { label: 'Country', value: profile?.organisations?.country || 'Kenya' },
              { label: 'Role',    value: profile?.role || '—', capitalize: true },
            ].map(({ label, value, capitalize }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--n100)' }}>
                <span style={{ fontSize: 13, color: 'var(--n500)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--n800)', textTransform: capitalize ? 'capitalize' : 'none' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--n100)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <Shield size={16} color="var(--g700)"/> Security
          </div>
          <div style={{ padding: 18 }}>
            <div className="info-box-blue" style={{ marginBottom: 14 }}>
              Password changes must be done through Supabase Auth or via the password reset email flow.
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button className="btn btn-danger btn-full" onClick={signOut} style={{ padding: 14 }}>
          <LogOut size={16}/> Sign out
        </button>

        <p style={{ fontSize: 12, color: 'var(--n400)', textAlign: 'center' }}>
          GT Mapper v1.0 · GeoTreks Kenya
        </p>
      </div>
    </div>
  )
}
