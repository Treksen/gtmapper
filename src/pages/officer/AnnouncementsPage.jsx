import React from 'react'
import { Megaphone } from 'lucide-react'
import { useAnnouncements } from '../../hooks/useData'
import { formatDistanceToNow } from 'date-fns'

export default function AnnouncementsPage() {
  const { announcements } = useAnnouncements()

  return (
    <div style={{ padding: '18px 16px' }} className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Announcements</h2>
      <p style={{ fontSize: 13, color: 'var(--n500)', marginBottom: 20 }}>Messages from your supervisor</p>

      {announcements.length === 0 ? (
        <div className="card"><div className="empty-state">
          <Megaphone size={40} className="empty-icon"/>
          <div className="empty-title">No announcements</div>
          <div className="empty-body">Your supervisor hasn't posted any messages yet</div>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {announcements.map(a => (
            <div key={a.id} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Megaphone size={20} color="var(--g700)"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--n900)', marginBottom: 6 }}>{a.title}</div>
                  <div style={{ fontSize: 14, color: 'var(--n700)', lineHeight: 1.6 }}>{a.body}</div>
                  <div style={{ fontSize: 12, color: 'var(--n400)', marginTop: 8, display: 'flex', gap: 10 }}>
                    {a.profiles?.full_name && <span>From: {a.profiles.full_name}</span>}
                    <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
