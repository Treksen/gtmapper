import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, ShieldCheck,
  ClipboardCheck, BookOpen, Radio, Map, LogOut,
  Menu, X
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePendingActions } from '../hooks/useData'

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/organisations', icon: Building2,       label: 'Organisations' },
  { to: '/approvals',     icon: ClipboardCheck,  label: 'Approvals',  badge: true },
  { to: '/presence',      icon: Radio,           label: 'Presence'      },
  { to: '/map',           icon: Map,             label: 'Global Map'    },
  { to: '/audit',         icon: BookOpen,        label: 'Audit Log'     },
  { to: '/admins',        icon: ShieldCheck,     label: 'Admin Roster'  },
]

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const { actions }   = usePendingActions()
  const [open, setOpen] = useState(false)
  const pendingCount    = actions.length

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', height: '100dvh', overflow: 'hidden', background: 'var(--n100)' }}>

      {/* Desktop sidebar */}
      <aside className="desktop-sidebar" style={{
        width: 248, flexShrink: 0, background: 'var(--g900)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        <SidebarInner profile={profile} pendingCount={pendingCount} onLogout={signOut} />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex' }}>
          <div onClick={() => setOpen(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.55)' }} />
          <aside style={{ width: 268, background: 'var(--g900)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--sh-lg)', position: 'relative', zIndex: 2001 }}>
            <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
              <X size={20} />
            </button>
            <SidebarInner profile={profile} pendingCount={pendingCount} onLogout={signOut} onNav={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        {/* Mobile topbar */}
        <header className="mobile-topbar" style={{
          background: 'var(--g900)', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 1500,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 4 }}>
              <Menu size={22} />
            </button>
            <LogoMark size={28} radius={8} />
            <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>GT Mapper</span>
          </div>
          {pendingCount > 0 && (
            <span style={{ background: 'var(--amber)', color: '#fff', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              {pendingCount} pending
            </span>
          )}
        </header>

        <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 900px)  { .desktop-sidebar { display: flex !important; } .mobile-topbar { display: none !important; } }
        @media (max-width: 899px)  { .desktop-sidebar { display: none !important; } }
      `}</style>
    </div>
  )
}

/* ── Logo image with fallback ── */
function LogoMark({ size = 38, radius = 11 }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

function SidebarInner({ profile, pendingCount, onLogout, onNav }) {
  return (
    <>
      {/* Logo block */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={40} radius={11} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-0.2px' }}>GT Mapper</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Super Admin</div>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Super Administrator</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNav}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 'var(--r-md)',
              textDecoration: 'none', transition: 'all 0.13s',
              background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
              fontWeight: isActive ? 700 : 500, fontSize: 14,
            })}>
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && pendingCount > 0 && (
                  <span style={{ background: 'var(--amber)', color: '#fff', minWidth: 18, height: 18, borderRadius: 99, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{pendingCount}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r-md)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'var(--font)', fontWeight: 500 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fca5a5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </>
  )
}
