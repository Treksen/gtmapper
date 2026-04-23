import React, { useState } from 'react'
import { Clock, XCircle, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function LogoMark() {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div style={{ width: 68, height: 68, borderRadius: 18, background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    )
  }
  return (
    <img
      src="/images/logo.png"
      alt="GT Mapper"
      onError={() => setFailed(true)}
      style={{ width: 68, height: 68, borderRadius: 18, objectFit: 'cover', margin: '0 auto 12px', display: 'block', boxShadow: '0 6px 20px rgba(0,0,0,0.2)', border: '2px solid rgba(255,255,255,0.2)' }}
    />
  )
}

export default function PendingApprovalScreen() {
  const { profile, pendingReg, signOut } = useAuth()

  const status = pendingReg?.status || 'pending'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(155deg, var(--g900) 0%, var(--g800) 55%, var(--g700) 100%)',
      padding: '24px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <LogoMark />
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>GT Mapper</h1>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '32px 28px', textAlign: 'center' }}>
        {status === 'pending' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Clock size={34} color="var(--amber)" />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--n900)', marginBottom: 10 }}>Awaiting Approval</h2>
            <p style={{ fontSize: 14, color: 'var(--n500)', lineHeight: 1.7, marginBottom: 8 }}>
              Hi <strong>{profile?.full_name?.split(' ')[0]}</strong>, your registration as a{' '}
              <strong>{profile?.role === 'supervisor' ? 'Supervisor' : 'Field Officer'}</strong> is pending review.
            </p>
            <p style={{ fontSize: 13, color: 'var(--n400)', lineHeight: 1.6 }}>
              {profile?.role === 'supervisor'
                ? 'A Super Admin will review and approve your account. You will be able to log in once approved.'
                : 'A Supervisor will review your account, assign your zone and organisation, then approve your access.'
              }
            </p>
          </>
        )}

        {status === 'rejected' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <XCircle size={34} color="var(--red)" />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--n900)', marginBottom: 10 }}>Registration Rejected</h2>
            <p style={{ fontSize: 14, color: 'var(--n500)', lineHeight: 1.7, marginBottom: 8 }}>
              Your registration request was not approved.
            </p>
            {pendingReg?.review_note && (
              <div style={{ background: 'var(--n50)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--n700)', marginBottom: 8, textAlign: 'left' }}>
                <strong>Reason:</strong> {pendingReg.review_note}
              </div>
            )}
            <p style={{ fontSize: 13, color: 'var(--n400)' }}>Please contact your administrator for more information.</p>
          </>
        )}

        <button
          onClick={signOut}
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 24, width: '100%', justifyContent: 'center', gap: 6, color: 'var(--n500)' }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  )
}
