import React, { useState } from 'react'
import { Eye, EyeOff, AlertCircle, Key, ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ── Logo ──────────────────────────────────────────────────────────────────────
function LoginLogoMark() {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      style={{ width: 72, height: 72, borderRadius: 20, objectFit: 'cover', margin: '0 auto 14px', display: 'block', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', border: '2px solid rgba(255,255,255,0.2)' }}
    />
  )
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { signIn } = useAuth()
  const [tab, setTab] = useState('login') // 'login' | 'redeem'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(155deg, var(--g900) 0%, var(--g800) 55%, var(--g700) 100%)',
      padding: '24px', overflowY: 'auto',
    }}>
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -100, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 24 }} className="fade-in">
        <LoginLogoMark />
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>GT Mapper</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>GeoTreks Kenya · Field Operations</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
        {[['login','Sign In'], ['redeem','Invite Code']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 22px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 700, fontSize: 13, transition: 'all 0.15s', background: tab === t ? '#fff' : 'transparent', color: tab === t ? 'var(--g900)' : 'rgba(255,255,255,0.75)' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'login'  ? <LoginForm signIn={signIn} /> : <RedeemForm onSuccess={() => setTab('login')} />}

      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 20 }}>GT Mapper v1.0 · GeoTreks Kenya</p>
    </div>
  )
}

// ── Sign-in form ──────────────────────────────────────────────────────────────
function LoginForm({ signIn }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showReset, setShowReset] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  if (showReset) {
    return <ForgotPasswordForm onBack={() => setShowReset(false)} />
  }

  return (
    <div className="card slide-up" style={{ width: '100%', maxWidth: 400, padding: '28px 28px 24px' }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--n900)', marginBottom: 20, textAlign: 'center' }}>Sign in to your account</h2>
      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-md)', padding: '11px 14px' }}>
          <AlertCircle size={15} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Email address</label>
          <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input className="form-input" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={{ paddingRight: 46 }} required />
            <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n400)', display: 'flex', padding: 0 }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {/* Forgot password link */}
          <button
            type="button"
            onClick={() => setShowReset(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g700)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)', marginTop: 6, padding: 0, textAlign: 'right', width: '100%' }}
          >
            Forgot password?
          </button>
        </div>
        <button className="btn btn-primary btn-full" type="submit" disabled={loading || !email || !password} style={{ marginTop: 4 }}>
          {loading ? <span className="spinner" /> : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

// ── Forgot Password form ──────────────────────────────────────────────────────
function ForgotPasswordForm({ onBack }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleReset(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (resetErr) throw resetErr
      setSent(true)
    } catch (err) {
      setError(err.message || 'Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="card slide-up" style={{ width: '100%', maxWidth: 400, padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--g50)', border: '2px solid var(--g200)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Check size={26} color="var(--g700)" strokeWidth={2.5} />
        </div>
        <h3 style={{ fontWeight: 800, fontSize: 17, color: 'var(--n900)', marginBottom: 8 }}>Check your email</h3>
        <p style={{ fontSize: 13, color: 'var(--n500)', lineHeight: 1.65, marginBottom: 20 }}>
          We sent a password reset link to<br />
          <strong style={{ color: 'var(--n800)' }}>{email}</strong><br />
          Click the link in the email to set a new password.
        </p>
        <button className="btn btn-ghost btn-full" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="card slide-up" style={{ width: '100%', maxWidth: 400, padding: '28px 28px 24px' }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n500)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontFamily: 'var(--font)', marginBottom: 16, padding: 0 }}
      >
        <ArrowLeft size={14} /> Back
      </button>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--n900)', marginBottom: 6 }}>Reset your password</h2>
      <p style={{ fontSize: 13, color: 'var(--n500)', marginBottom: 20, lineHeight: 1.5 }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>
      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-md)', padding: '11px 14px' }}>
          <AlertCircle size={15} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
        </div>
      )}
      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Email address</label>
          <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <button className="btn btn-primary btn-full" type="submit" disabled={loading || !email}>
          {loading ? <span className="spinner" /> : 'Send Reset Link'}
        </button>
      </form>
    </div>
  )
}

// ── Invite Code Redemption ────────────────────────────────────────────────────
function RedeemForm({ onSuccess }) {
  // step: 'enter_code' → 'setup_account' → 'done'
  const [step,     setStep]     = useState('enter_code')
  const [code,     setCode]     = useState('')
  const [invite,   setInvite]   = useState(null)   // the invite_codes row
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Account setup fields
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPwd,  setShowPwd]  = useState(false)

  // ── Step 1: Validate the code ─────────────────────────────────────────────
  async function handleCheckCode(e) {
    e.preventDefault()
    const trimmed = code.replace(/\s/g, '')
    if (trimmed.length !== 6) return setError('Please enter a 6-digit code')
    setError(''); setLoading(true)
    try {
      const { data, error: fetchErr } = await supabase
        .from('invite_codes')
        .select('*, organisations(name)')
        .eq('code', trimmed)
        .eq('status', 'pending')
        .maybeSingle()

      if (fetchErr) throw fetchErr
      if (!data) throw new Error('Code not found or already used')

      // Check expiry
      if (new Date(data.expires_at) < new Date()) {
        // Mark expired
        await supabase.from('invite_codes').update({ status: 'expired' }).eq('id', data.id)
        throw new Error('This invite code has expired. Ask your supervisor for a new one.')
      }

      setInvite(data)
      setStep('setup_account')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Create the account ────────────────────────────────────────────
  async function handleCreateAccount(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirm)  return setError('Passwords do not match')
    setLoading(true)
    try {
      // Pass ALL profile fields in metadata so the DB trigger sets everything
      // in one transaction — no post-signup update needed, no race condition
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email:    email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: invite.full_name,
            role:      invite.role,
            org_id:    invite.org_id || '',
            phone:     invite.phone  || '',
            active:    true,
          }
        }
      })
      if (authErr) throw authErr
      const userId = authData.user?.id
      if (!userId) throw new Error('Account creation failed — please try again')

      // Mark invite code as used (does not require auth)
      await supabase.from('invite_codes').update({
        status:  'used',
        used_by: userId,
      }).eq('id', invite.id)

      // Try signing in immediately (works if email confirmation is OFF)
      // If email confirmation is ON, the user will see the done screen and
      // sign in manually after confirming their email
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      })
      // Don't throw on sign-in error — just show done screen
      if (signInErr) console.warn('Auto sign-in after signup:', signInErr.message)

      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1 UI: Enter code ─────────────────────────────────────────────────
  if (step === 'enter_code') {
    return (
      <div className="card slide-up" style={{ width: '100%', maxWidth: 400, padding: '28px 28px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Key size={24} color="var(--g700)" />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--n900)', marginBottom: 4 }}>Enter Invite Code</h2>
          <p style={{ fontSize: 13, color: 'var(--n500)' }}>Your supervisor will give you a 6-digit code</p>
        </div>

        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-md)', padding: '11px 14px' }}>
            <AlertCircle size={15} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleCheckCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">6-digit invite code</label>
            <input
              className="form-input"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="e.g. 847291"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              style={{
                fontSize: 28, fontWeight: 800, letterSpacing: '0.25em',
                textAlign: 'center', fontFamily: 'var(--mono)',
                color: 'var(--g900)', padding: '14px',
              }}
              autoFocus
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading || code.length !== 6}>
            {loading ? <span className="spinner" /> : 'Verify Code →'}
          </button>
        </form>
      </div>
    )
  }

  // ── Step 2 UI: Set up account ─────────────────────────────────────────────
  if (step === 'setup_account') {
    return (
      <div className="card slide-up" style={{ width: '100%', maxWidth: 400, padding: '28px 28px 24px' }}>
        {/* Invite summary */}
        <div style={{ background: 'var(--g50)', border: '1px solid var(--g100)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g700)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            ✓ Code verified — your account details
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--n900)' }}>{invite.full_name}</div>
          <div style={{ fontSize: 13, color: 'var(--n600)', marginTop: 2 }}>
            {invite.role === 'officer' ? 'Field Officer' : 'Supervisor'} · {invite.organisations?.name}
          </div>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--n900)', marginBottom: 16 }}>Set up your login</h2>

        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-md)', padding: '11px 14px' }}>
            <AlertCircle size={15} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Your email address *</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Create a password *</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                style={{ paddingRight: 46 }}
                required
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n400)', display: 'flex', padding: 0 }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm password *</label>
            <input
              className="form-input"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStep('enter_code'); setInvite(null); setError('') }}>
              <ArrowLeft size={14} /> Back
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} type="submit" disabled={loading || !email || !password || !confirm}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ── Step 3 UI: Done ───────────────────────────────────────────────────────
  return (
    <div className="card slide-up" style={{ width: '100%', maxWidth: 400, padding: '36px 28px', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--g50)', border: '2px solid var(--g200)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
        <Check size={34} color="var(--g700)" strokeWidth={2.5} />
      </div>
      <h3 style={{ fontWeight: 800, fontSize: 20, color: 'var(--n900)', marginBottom: 8 }}>You're all set!</h3>
      <p style={{ fontSize: 14, color: 'var(--n500)', lineHeight: 1.65, marginBottom: 8 }}>
        Welcome, <strong>{invite?.full_name?.split(' ')[0]}</strong>!<br />
        Your account is ready. Sign in with your email and password.
      </p>
      <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={onSuccess}>
        Sign in now →
      </button>
    </div>
  )
}
