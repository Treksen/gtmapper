import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useOfficers, getOfficerStatus } from '../../hooks/useData'
import { format, formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Phone, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react'

export default function OfficerDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { officers } = useOfficers()
  const officer = officers.find(o => o.id === id)
  const today   = new Date().toISOString().split('T')[0]
  // const { visits, loading } = useVisits({ officerId: id, limit: 50 })
  // const todayVisits = visits.filter(v => v.visit_date === today)

  if (!officer) return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => nav(-1)} className="btn btn-ghost btn-sm"><ArrowLeft size={15}/> Back</button>
      </div>
      <div className="empty-state"><div className="empty-title">Officer not found</div></div>
    </div>
  )

  // Use heartbeat-based status (profiles.is_online + last_seen_at)
  const status      = getOfficerStatus(officer)
  const loc         = officer.officer_locations?.[0]
  const initials    = officer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)

  // Status display config
  const statusConfig = {
    active:   { color: '#22c55e', bg: '#f0fdf4', label: 'Online now'       },
    inactive: { color: '#f59e0b', bg: '#fffbeb', label: 'Recently active'  },
    offline:  { color: '#ef4444', bg: '#fef2f2', label: 'Offline'          },
  }
  const sc = statusConfig[status]

  // Last seen — use profiles.last_seen_at (set by heartbeat) not officer_locations
  const lastSeenValue = (() => {
    if (status === 'active') return 'Online now'
    if (officer.last_seen_at) return formatDistanceToNow(new Date(officer.last_seen_at), { addSuffix: true })
    if (loc) return formatDistanceToNow(new Date(loc.recorded_at), { addSuffix: true })
    return 'Never'
  })()

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n600)', display: 'flex', padding: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="page-title">{officer.full_name}</div>
          <div className="page-subtitle">Officer Profile</div>
        </div>
      </div>

      <div className="page-body">
        {/* Profile card */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
            {/* Avatar with live status ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                className="avatar"
                style={{
                  width: 64, height: 64, fontSize: 22, fontWeight: 800,
                  background: 'var(--g50)', color: 'var(--g800)',
                  outline: `3px solid ${sc.color}`,
                  outlineOffset: 2,
                }}
              >
                {initials}
              </div>
              {/* Status dot */}
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 14, height: 14, borderRadius: '50%',
                background: sc.color, border: '2px solid #fff',
              }} />
            </div>

            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--n900)' }}>{officer.full_name}</div>
              <div style={{ fontSize: 13, color: 'var(--n500)', marginTop: 2 }}>
                {officer.role === 'supervisor' ? 'Supervisor' : 'Field Officer'} · {officer.organisations?.name || officer.org_id || 'GeoTreks Kenya'}
              </div>
              {/* Status pill */}
              <span style={{
                marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: sc.bg, color: sc.color,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                {sc.label}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { icon: <Phone size={14}/>,    label: 'PHONE',     value: officer.phone || 'Not set' },
              { icon: <Calendar size={14}/>, label: 'JOINED',    value: officer.created_at ? format(new Date(officer.created_at), 'dd MMM yyyy') : '—' },
              { icon: null,                  label: 'ROLE',      value: officer.role === 'supervisor' ? 'Supervisor' : 'Field Officer' },
              { icon: <Clock size={14}/>,    label: 'LAST SEEN', value: lastSeenValue },
            ].map(({ icon, label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--n400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  {icon} {label}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  color: label === 'LAST SEEN' && status === 'active' ? sc.color : 'var(--n800)',
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today stats */}
        {/* <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: "Today's Visits", value: todayVisits.length,                                        color: 'var(--g700)'  },
            { label: 'Completed',      value: todayVisits.filter(v => v.outcome === 'Completed').length, color: 'var(--g600)'  },
            { label: 'No Shows',       value: todayVisits.filter(v => v.outcome === 'No show').length,   color: 'var(--amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="metric">
              <div className="metric-label" style={{ fontSize: 10 }}>{label.toUpperCase()}</div>
              <div className="metric-value" style={{ fontSize: 22, color }}>{value}</div>
            </div>
          ))}
        </div> */}

        {/* Recent visits */}
        {/* <div>
          <div className="section-label" style={{ marginBottom: 10 }}>Recent visits</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div className="spinner spinner-dark" style={{ width: 24, height: 24, margin: '0 auto' }} />
            </div>
          ) : visits.length === 0 ? (
            <div className="card">
              <div className="empty-state"><div className="empty-title">No visits recorded yet</div></div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              {visits.slice(0, 20).map((v, i) => (
                <div key={v.id} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: i < Math.min(19, visits.length - 1) ? '1px solid var(--n100)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: v.outcome === 'Completed' ? 'var(--g50)' : '#fffbeb' }}>
                    {v.outcome === 'Completed'
                      ? <CheckCircle size={17} color="var(--g600)" />
                      : <AlertCircle size={17} color="var(--amber)" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n900)' }}>{v.visit_purpose}</div>
                    <div style={{ fontSize: 12, color: 'var(--n500)', marginTop: 1 }}>
                      {v.beneficiary_type}{v.household_name ? ` · ${v.household_name}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: v.outcome === 'Completed' ? 'var(--g50)' : '#fffbeb', color: v.outcome === 'Completed' ? 'var(--g800)' : '#92400e' }}>
                        {v.outcome}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--n400)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> {format(new Date(v.visited_at), 'dd MMM · HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div> */}

        {/* Action buttons */}
        {/* <div style={{ display: 'flex', gap: 10 }}>
          {officer.phone && (
            <a href={`tel:${officer.phone}`} className="btn btn-secondary" style={{ flex: 1 }}>
              <Phone size={15} /> Call Officer
            </a>
          )}
          {loc && (
            <a href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ flex: 1 }}>
              <MapPin size={15} /> View on Maps
            </a>
          )}
        </div> */}
      </div>
    </div>
  )
}
