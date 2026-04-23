import React, { useState } from 'react'
import { CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import { useVisits, useOfficers, getOfficerStatus } from '../../hooks/useData'
import { format, formatDistanceToNow } from 'date-fns'

export default function VisitsPage() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate]       = useState(today)
  const [officerFilter, setOfficerFilter] = useState('all')

  const { visits, loading: visitsLoading } = useVisits({ date })
  const { officers } = useOfficers()

  // Filter by selected officer
  const displayVisits = officerFilter === 'all'
    ? visits
    : visits.filter(v => v.officer_id === officerFilter)

  // Per-officer summary
  const officerSummaries = officers.map(o => ({
    officer:   o,
    total:     visits.filter(v => v.officer_id === o.id).length,
    completed: visits.filter(v => v.officer_id === o.id && v.outcome === 'Completed').length,
    status:    getOfficerStatus(o),
  })).sort((a, b) => b.total - a.total)

  const totalVisits  = visits.length
  const completed    = visits.filter(v => v.outcome === 'Completed').length
  const noShow       = visits.filter(v => v.outcome === 'No show').length
  const referred     = visits.filter(v => ['Referred','Follow-up needed'].includes(v.outcome)).length

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div className="page-title">Field Visits</div>
        <div className="page-subtitle">All officer submissions by date</div>
      </div>

      <div className="page-body">
        {/* Date + officer filter */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} max={today} />
          </div>
          <div className="form-group">
            <label className="form-label">Officer</label>
            <select className="form-select" value={officerFilter} onChange={e => setOfficerFilter(e.target.value)}>
              <option value="all">All officers</option>
              {officers.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
            </select>
          </div>
        </div>

        {/* Summary metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            { label: 'Total',     value: totalVisits, color: 'var(--g800)' },
            { label: 'Completed', value: completed,   color: 'var(--g600)' },
            { label: 'No show',   value: noShow,      color: 'var(--amber)'},
            { label: 'Referred',  value: referred,    color: 'var(--blue)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="metric" style={{ padding: 12, textAlign: 'center' }}>
              <div className="metric-value" style={{ color, fontSize: 22 }}>{value}</div>
              <div className="metric-label" style={{ fontSize: 10 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Officer performance summary */}
        {officerSummaries.length > 0 && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--n100)', fontWeight: 700, fontSize: 13, color: 'var(--n700)' }}>
              Officer performance — {date === today ? 'Today' : format(new Date(date), 'dd MMM yyyy')}
            </div>
            {officerSummaries.map((s, i) => {
              const statusColor = s.status === 'active' ? '#22c55e' : s.status === 'inactive' ? '#f59e0b' : '#9ca3af'
              return (
                <div key={s.officer.id}
                  onClick={() => setOfficerFilter(officerFilter === s.officer.id ? 'all' : s.officer.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < officerSummaries.length - 1 ? '1px solid var(--n100)' : 'none', cursor: 'pointer', background: officerFilter === s.officer.id ? 'var(--g50)' : '#fff', transition: 'background 0.13s' }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, fontWeight: 700 }}>
                      {s.officer.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: statusColor, border: '2px solid #fff' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n900)' }}>{s.officer.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--n400)', marginTop: 1 }}>
                      {s.completed} completed · {s.total - s.completed} other
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.total > 0 ? 'var(--g700)' : 'var(--n300)', minWidth: 28, textAlign: 'right' }}>
                    {s.total}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Visit list */}
        {visitsLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div className="spinner spinner-dark" style={{ width: 26, height: 26, margin: '0 auto' }} />
          </div>
        ) : displayVisits.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <TrendingUp size={36} className="empty-icon" />
              <div className="empty-title">No visits recorded</div>
              <div className="empty-body">
                {officerFilter !== 'all'
                  ? 'This officer has no visits on this date'
                  : 'No field visits on this date'}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--n100)', fontWeight: 700, fontSize: 13, color: 'var(--n700)' }}>
              {displayVisits.length} visit{displayVisits.length !== 1 ? 's' : ''}
              {officerFilter !== 'all' && ` · ${officers.find(o => o.id === officerFilter)?.full_name}`}
            </div>
            {displayVisits.map((v, i) => (
              <div key={v.id} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: i < displayVisits.length - 1 ? '1px solid var(--n100)' : 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: v.outcome === 'Completed' ? 'var(--g50)' : v.outcome === 'No show' ? '#fffbeb' : '#eff6ff' }}>
                  {v.outcome === 'Completed'
                    ? <CheckCircle size={17} color="var(--g600)" />
                    : v.outcome === 'No show'
                      ? <AlertCircle size={17} color="var(--amber)" />
                      : <Clock size={17} color="#3b82f6" />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n900)' }}>
                    {v.visit_purpose || 'Visit'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--n500)', marginTop: 1 }}>
                    {v.beneficiary_type}{v.household_name ? ` · ${v.household_name}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                      background: v.outcome === 'Completed' ? 'var(--g50)' : '#fffbeb',
                      color: v.outcome === 'Completed' ? 'var(--g800)' : '#92400e' }}>
                      {v.outcome}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--n400)' }}>
                      {v.officer_name || '—'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--n400)' }}>
                      {format(new Date(v.visited_at), 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
