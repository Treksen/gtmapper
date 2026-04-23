import React from 'react'
import { Bell, AlertTriangle, Info, CheckCircle, Clock, X } from 'lucide-react'
import { useNotifications } from '../../hooks/useData'
import { formatDistanceToNow } from 'date-fns'

const STYLES = {
  alert:   { bg: '#fef2f2', border: '#fecaca', icon: color => <AlertTriangle size={15} color="#ef4444" /> },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: color => <AlertTriangle size={15} color="#f59e0b" /> },
  info:    { bg: '#eff6ff', border: '#bfdbfe', icon: color => <Info size={15} color="#3b82f6" /> },
  success: { bg: 'var(--g50)', border: 'var(--g100)', icon: color => <CheckCircle size={15} color="var(--g600)" /> },
}

export default function NotificationsPage() {
  const { notifications, loading, unread, markRead, markAllRead, dismiss } = useNotifications()

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Alerts & Notifications
            {unread > 0 && (
              <span style={{ background: 'var(--red)', color: '#fff', padding: '1px 8px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{unread}</span>
            )}
          </div>
          <div className="page-subtitle">Field activity alerts</div>
        </div>
        {unread > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            <CheckCircle size={14}/> Mark all read
          </button>
        )}
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }}/></div>
        ) : notifications.length === 0 ? (
          <div className="card"><div className="empty-state">
            <Bell size={44} className="empty-icon"/>
            <div className="empty-title">All clear</div>
            <div className="empty-body">No notifications at this time</div>
          </div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map(n => {
              const s = STYLES[n.type] || STYLES.info
              return (
                <div key={n.id} onClick={() => markRead(n.id)}
                  style={{ background: !n.read ? s.bg : '#fff', border: `1px solid ${!n.read ? s.border : 'var(--n200)'}`, borderRadius: 'var(--r-lg)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {s.icon(n.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {n.title && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n800)', marginBottom: 2 }}>{n.title}</div>}
                    <div style={{ fontSize: 13, color: 'var(--n700)', lineHeight: 1.45, fontWeight: n.read ? 400 : 500 }}>{n.message}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: 'var(--n400)' }}>
                      <Clock size={10}/> {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--g600)' }}/>}
                    <button onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n300)', padding: 2, display: 'flex' }}>
                      <X size={16}/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
