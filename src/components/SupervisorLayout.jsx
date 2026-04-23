import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Map, Users, BarChart2,
  Bell, Settings, LogOut, Menu, X, ClipboardCheck, FileText
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications, usePendingActions } from '../hooks/useData'

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/map',           icon: Map,             label: 'Live Map'   },
  { to: '/officers',      icon: Users,           label: 'Officers'   },
  { to: '/forms',         icon: FileText,        label: 'Forms'      },
  { to: '/reports',       icon: BarChart2,       label: 'Reports'    },
  { to: '/my-approvals',  icon: ClipboardCheck,  label: 'Approvals', badge: 'approvals' },
  { to: '/notifications', icon: Bell,            label: 'Alerts',    badge: 'alerts'    },
  { to: '/settings',      icon: Settings,        label: 'Settings'   },
]

/* ── Logo image with fallback ── */
function LogoMark({ size = 38, radius = 11, dark = false }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, background: dark ? 'rgba(255,255,255,0.15)' : 'var(--g800)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
      style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0 }}
    />
  )
}

export default function SupervisorLayout() {
  const { profile, signOut } = useAuth()
  const { unread }  = useNotifications()
  const { actions } = usePendingActions(profile?.org_id)
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', height: '100dvh', overflow: 'hidden', background: 'var(--n100)' }}>

      {/* Desktop sidebar */}
      <aside className="desktop-sidebar" style={{ width: 248, flexShrink: 0, background: '#fff', borderRight: '1px solid var(--n200)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <SidebarInner profile={profile} unread={unread} pending={actions.length} onLogout={signOut} />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex' }}>
          <div onClick={() => setOpen(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.45)' }} />
          <aside style={{ width: 268, background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: 'var(--sh-lg)', position: 'relative', zIndex: 2001 }}>
            <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n500)' }}><X size={20} /></button>
            <SidebarInner profile={profile} unread={unread} pending={actions.length} onLogout={signOut} onNav={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        {/* Mobile topbar */}
        <header className="mobile-topbar" style={{ background: '#fff', borderBottom: '1px solid var(--n200)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1500 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n700)', padding: 4 }}><Menu size={22} /></button>
            <LogoMark size={28} radius={8} />
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--n900)' }}>GT Mapper</span>
          </div>
          <NavLink to="/notifications" style={{ position: 'relative', color: 'var(--n600)', display: 'flex' }}>
            <Bell size={22} />
            {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: '#fff', width: 16, height: 16, borderRadius: '50%', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
          </NavLink>
        </header>

        <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}><Outlet /></main>

        {/* Mobile bottom nav */}
        <nav className="mobile-bottom-nav" style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid var(--n200)', display: 'flex', padding: '6px 0 10px', zIndex: 1500 }}>
          {NAV.slice(0, 5).map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', fontSize: 10, fontWeight: 600, color: isActive ? 'var(--g800)' : 'var(--n400)' })}>
              {({ isActive }) => (<><div style={{ padding: '4px 14px', borderRadius: 20, background: isActive ? 'var(--g50)' : 'transparent', transition: 'all 0.15s' }}><Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} /></div><span>{label}</span></>)}
            </NavLink>
          ))}
        </nav>
      </div>

      <style>{`
        @media(min-width:900px)  { .desktop-sidebar { display:flex!important } .mobile-topbar,.mobile-bottom-nav { display:none!important } }
        @media(max-width:899px)  { .desktop-sidebar { display:none!important } }
      `}</style>
    </div>
  )
}

function SidebarInner({ profile, unread, pending, onLogout, onNav }) {
  return (
    <>
      {/* Logo block */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--n100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={40} radius={11} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--n900)', letterSpacing: '-0.2px' }}>GT Mapper</div>
            <div style={{ fontSize: 11, color: 'var(--n400)', fontWeight: 500 }}>Supervisor Panel</div>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--n100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>{profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
            <div style={{ fontSize: 11, color: 'var(--n400)' }}>Supervisor · {profile?.organisations?.name}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNav}
            style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r-md)', textDecoration: 'none', transition: 'all 0.13s', background: isActive ? 'var(--g50)' : 'transparent', color: isActive ? 'var(--g800)' : 'var(--n500)', fontWeight: isActive ? 700 : 500, fontSize: 14 })}>
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge === 'alerts'    && unread  > 0 && <span style={{ background: 'var(--red)',   color: '#fff', minWidth: 18, height: 18, borderRadius: 99, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unread}</span>}
                {badge === 'approvals' && pending > 0 && <span style={{ background: 'var(--amber)', color: '#fff', minWidth: 18, height: 18, borderRadius: 99, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{pending}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--n100)' }}>
        <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r-md)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n400)', fontSize: 14, fontFamily: 'var(--font)', fontWeight: 500 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = 'var(--red)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none';    e.currentTarget.style.color = 'var(--n400)' }}>
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </>
  )
}
