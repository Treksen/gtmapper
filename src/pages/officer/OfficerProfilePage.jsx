import React, { useState } from 'react'
import { Phone, Calendar, LogOut, Save, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useData'
import { ToastContainer } from '../../components/Toast'
import { format } from 'date-fns'

export default function OfficerProfilePage() {
  const { profile, signOut, updateProfile } = useAuth()
  const { toasts, toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone: profile?.phone || '' })

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'

  // Real status from heartbeat fields
  const isOnline    = profile?.is_online === true
  const lastSeenAt  = profile?.last_seen_at
  const minsAgo     = lastSeenAt ? (Date.now() - new Date(lastSeenAt)) / 60000 : Infinity
  const onlineStatus = isOnline && minsAgo < 5 ? 'active' : minsAgo < 30 ? 'inactive' : 'offline'
  const statusLabel  = onlineStatus === 'active' ? 'Online now' : onlineStatus === 'inactive' ? 'Recently active' : 'Offline'
  const statusColor  = onlineStatus === 'active' ? '#22c55e' : onlineStatus === 'inactive' ? '#f59e0b' : '#ef4444'
  const statusBg     = onlineStatus === 'active' ? '#f0fdf4' : onlineStatus === 'inactive' ? '#fffbeb' : '#fef2f2'

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile(form)
      setEditing(false)
      toast('Profile updated')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: "18px 16px" }} className="fade-in">
      <ToastContainer toasts={toasts} />

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div
          className="avatar"
          style={{
            width: 80,
            height: 80,
            fontSize: 26,
            fontWeight: 800,
            margin: "0 auto 14px",
            background: "var(--g800)",
            color: "#fff",
            boxShadow: "0 4px 18px rgba(10,92,71,0.28)",
          }}
        >
          {initials}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--n900)" }}>
          {profile?.full_name}
        </h2>
        <div style={{ fontSize: 13, color: "var(--n500)", marginTop: 3 }}>
          Field Officer · {profile?.organisations?.name || "GeoTreks Kenya"}
        </div>
        <span
          style={{
            marginTop: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 11px",
            borderRadius: 99,
            background: statusBg,
            color: statusColor,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: statusColor,
              flexShrink: 0,
            }}
          />
          {statusLabel}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 24px', textAlign: 'center', border: '1px solid var(--n200)', boxShadow: 'var(--sh-sm)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--g700)' }}>{profile?.organisations?.name || 'GeoTreks'}</div>
          <div style={{ fontSize: 11, color: 'var(--n500)', marginTop: 2 }}>Organisation</div>
        </div>
      </div>

      {/* Profile details */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 14 }}>
        <div
          style={{
            padding: "13px 16px",
            borderBottom: "1px solid var(--n100)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <User size={15} color="var(--g700)" /> Your details
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
        {editing ? (
          <div
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                className="form-input"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone number</label>
              <input
                className="form-input"
                type="tel"
                placeholder="+254 7XX XXX XXX"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ alignSelf: "flex-start" }}
            >
              {saving ? (
                <span className="spinner" />
              ) : (
                <>
                  <Save size={14} /> Save
                </>
              )}
            </button>
          </div>
        ) : (
          <div>
            {[
              {
                icon: <Phone size={14} />,
                label: 'Phone',
                value: profile?.phone || 'Not set',
              },
              {
                icon: <User size={14} />,
                label: 'Organisation',
                value: profile?.organisations?.name || 'GeoTreks Kenya',
              },
              {
                icon: <Calendar size={14} />,
                label: 'Joined',
                value: profile?.created_at
                  ? format(new Date(profile.created_at), 'dd MMM yyyy')
                  : '—',
              },
              {
                icon: <User size={14} />,
                label: 'Role',
                value: profile?.role === 'supervisor' ? 'Supervisor' : 'Field Officer',
              },
            ].map(({ icon, label, value }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  padding: '12px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--n100)' : 'none',
                }}
              >
                <div style={{ color: "var(--g600)", flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--n400)",
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--n800)",
                      fontWeight: 500,
                      marginTop: 1,
                    }}
                  >
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="btn btn-danger btn-full"
        onClick={signOut}
        style={{ padding: 14, fontSize: 15 }}
      >
        <LogOut size={16} /> Sign out
      </button>
      <p
        style={{
          fontSize: 12,
          color: "var(--n400)",
          textAlign: "center",
          marginTop: 14,
        }}
      >
        GT Mapper v1.0 · GeoTreks Kenya
      </p>
    </div>
  );
}
