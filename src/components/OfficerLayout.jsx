import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Home, PlusCircle, ClipboardList, Megaphone, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/',             icon: Home,          label: 'Home'      },
  { to: '/collect',      icon: PlusCircle,    label: 'Collect'   },
  { to: '/submissions',  icon: ClipboardList, label: 'Submitted' },
  { to: '/announcements',icon: Megaphone,     label: 'News'      },
  { to: '/profile',      icon: User,          label: 'Profile'   },
]

/* ── Logo image with fallback ── */
function LogoMark({ size = 32, radius = 8 }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
      style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }}
    />
  )
}

export default function OfficerLayout() {
  const { profile } = useAuth()

  return (
    <div style={{ minHeight: '100vh', maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', background: 'var(--n100)', position: 'relative' }}>

      {/* Top bar */}
      <div style={{ background: 'linear-gradient(135deg, var(--g900) 0%, var(--g800) 100%)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={34} radius={9} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-0.2px' }}>GT Mapper</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>GeoTreks Kenya</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 0 3px rgba(74,222,128,0.25)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
            {profile?.full_name?.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* Page content */}
      <main style={{ flex: 1, overflow: 'auto', paddingBottom: 'var(--bottom-h)' }}>
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 500, background: '#fff', borderTop: '1px solid var(--n200)', display: 'flex', padding: '6px 0 max(10px, env(safe-area-inset-bottom))', zIndex: 50, boxShadow: '0 -4px 16px rgba(0,0,0,0.07)' }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', fontSize: 10, fontWeight: 600, color: isActive ? 'var(--g800)' : 'var(--n400)' })}>
            {({ isActive }) => (
              <>
                <div style={{ padding: '4px 10px', borderRadius: 20, background: isActive ? 'var(--g50)' : 'transparent', transition: 'all 0.15s' }}>
                  <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
