import React, { useState, useMemo } from 'react'
import { Search, Download, RefreshCw, ChevronDown, ChevronRight, Activity, Filter } from 'lucide-react'
import { useAuditLog } from '../../hooks/useData'
import { format, formatDistanceToNow, subDays, isAfter } from 'date-fns'

// ── Event category colours ────────────────────────────────────────────────────
const EVENT_META = {
  // Users
  user_invited:              { color: '#0a5c47', bg: '#f0fdf4', cat: 'Users'       },
  user_updated:              { color: '#1d4ed8', bg: '#eff6ff', cat: 'Users'       },
  user_activated:            { color: '#0a5c47', bg: '#f0fdf4', cat: 'Users'       },
  user_deactivated:          { color: '#dc2626', bg: '#fef2f2', cat: 'Users'       },
  profiles_created:          { color: '#0a5c47', bg: '#f0fdf4', cat: 'Users'       },
  profiles_updated:          { color: '#1d4ed8', bg: '#eff6ff', cat: 'Users'       },
  // Orgs
  organisations_created:     { color: '#0a5c47', bg: '#f0fdf4', cat: 'Orgs'        },
  organisations_updated:     { color: '#1d4ed8', bg: '#eff6ff', cat: 'Orgs'        },
  organisations_deleted:     { color: '#dc2626', bg: '#fef2f2', cat: 'Orgs'        },
  org_created:               { color: '#0a5c47', bg: '#f0fdf4', cat: 'Orgs'        },
  org_suspended:             { color: '#dc2626', bg: '#fef2f2', cat: 'Orgs'        },
  // Zones
  zones_created:             { color: '#7c3aed', bg: '#f5f3ff', cat: 'Zones'       },
  zones_updated:             { color: '#7c3aed', bg: '#f5f3ff', cat: 'Zones'       },
  zones_deleted:             { color: '#dc2626', bg: '#fef2f2', cat: 'Zones'       },
  // Forms
  form_created:              { color: '#0a5c47', bg: '#f0fdf4', cat: 'Forms'       },
  form_updated:              { color: '#1d4ed8', bg: '#eff6ff', cat: 'Forms'       },
  form_approved:             { color: '#16a34a', bg: '#f0fdf4', cat: 'Forms'       },
  form_rejected:             { color: '#dc2626', bg: '#fef2f2', cat: 'Forms'       },
  form_deleted:              { color: '#dc2626', bg: '#fef2f2', cat: 'Forms'       },
  forms_created:             { color: '#0a5c47', bg: '#f0fdf4', cat: 'Forms'       },
  forms_updated:             { color: '#1d4ed8', bg: '#eff6ff', cat: 'Forms'       },
  forms_deleted:             { color: '#dc2626', bg: '#fef2f2', cat: 'Forms'       },
  // Submissions
  form_submissions_created:  { color: '#0891b2', bg: '#ecfeff', cat: 'Submissions' },
  form_submissions_updated:  { color: '#1d4ed8', bg: '#eff6ff', cat: 'Submissions' },
  form_submissions_deleted:  { color: '#dc2626', bg: '#fef2f2', cat: 'Submissions' },
  // Approvals / Pending
  action_approved:           { color: '#16a34a', bg: '#f0fdf4', cat: 'Approvals'   },
  action_rejected:           { color: '#dc2626', bg: '#fef2f2', cat: 'Approvals'   },
  pending_actions_created:   { color: '#f59e0b', bg: '#fffbeb', cat: 'Approvals'   },
  pending_actions_updated:   { color: '#f59e0b', bg: '#fffbeb', cat: 'Approvals'   },
}

function getMeta(type) {
  return EVENT_META[type] || { color: '#6b7280', bg: '#f9fafb', cat: 'Other' }
}

const ROLE_STYLE = {
  super_admin: { bg: '#fef2f2', color: '#dc2626', label: 'Super Admin' },
  supervisor:  { bg: '#eff6ff', color: '#1e40af', label: 'Supervisor'  },
  officer:     { bg: '#f0fdf4', color: '#16a34a', label: 'Officer'     },
}

const DATE_RANGES = [
  { key: 'all',   label: 'All time'    },
  { key: '1d',    label: 'Last 24h'   },
  { key: '7d',    label: 'Last 7 days' },
  { key: '30d',   label: 'Last 30 days'},
]

// Expandable detail row
function LogRow({ log }) {
  const [open, setOpen] = useState(false)
  const meta = getMeta(log.event_type)
  const rs   = ROLE_STYLE[log.actor_role] || { bg: 'var(--n100)', color: 'var(--n500)', label: log.actor_role || '—' }

  const detailEntries = log.details ? Object.entries(log.details) : []

  return (
    <>
      <tr
        onClick={() => setOpen(v => !v)}
        style={{ cursor: 'pointer', background: open ? 'var(--n50)' : '#fff', transition: 'background 0.1s' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--n50)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = '#fff' }}
      >
        {/* Expand icon */}
        <td style={{ width: 32, padding: '10px 8px 10px 16px', color: 'var(--n300)' }}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </td>
        {/* Time */}
        <td style={{ whiteSpace: 'nowrap', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--n600)', padding: '10px 12px' }}
          title={format(new Date(log.created_at), 'PPpp')}>
          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
        </td>
        {/* Actor */}
        <td style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', padding: '10px 12px' }}>
          {log.profiles?.full_name
            ? <span>{log.profiles.full_name}</span>
            : <span style={{ color: 'var(--n400)', fontStyle: 'italic', fontWeight: 400 }}>System / DB Trigger</span>
          }
          {log.organisations?.name && (
            <div style={{ fontSize: 11, color: 'var(--n400)', fontWeight: 400, marginTop: 1 }}>
              {log.organisations.name}
            </div>
          )}
        </td>
        {/* Role */}
        <td style={{ padding: '10px 12px' }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: rs.bg, color: rs.color }}>
            {rs.label}
          </span>
        </td>
        {/* Event */}
        <td style={{ padding: '10px 12px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: meta.bg, color: meta.color }}>
            {log.event_type?.replace(/_/g, ' ')}
          </span>
        </td>
        {/* Table */}
        <td style={{ fontSize: 12, color: 'var(--n500)', padding: '10px 12px', whiteSpace: 'nowrap' }}>
          {log.target_table || '—'}
        </td>
        {/* Summary */}
        <td style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--n500)', padding: '10px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {detailEntries.length > 0
            ? detailEntries.slice(0, 2).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v).slice(0, 30) : String(v).slice(0, 40)}`).join(' · ')
            : '—'
          }
        </td>
      </tr>
      {/* Expanded detail panel */}
      {open && (
        <tr style={{ background: 'var(--n50)' }}>
          <td colSpan={7} style={{ padding: '0 16px 14px 48px', borderBottom: '1px solid var(--n200)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, paddingTop: 10 }}>
              {/* Fixed fields */}
              {[
                { label: 'Timestamp',  value: format(new Date(log.created_at), 'dd MMM yyyy · HH:mm:ss') },
                { label: 'Target ID',  value: log.target_id || '—' },
                { label: 'Org',        value: log.organisations?.name || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--n200)' }}>
                  <div style={{ fontSize: 10, color: 'var(--n400)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--n700)', wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
              {/* Dynamic detail fields */}
              {detailEntries.map(([key, value]) => (
                <div key={key} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--n200)' }}>
                  <div style={{ fontSize: 10, color: 'var(--n400)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{key.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--n700)', wordBreak: 'break-all', maxHeight: 80, overflow: 'auto' }}>
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AuditLogPage() {
  const { logs, loading, refetch } = useAuditLog(null, 1000)

  const [search,      setSearch]      = useState('')
  const [roleFilter,  setRoleFilter]  = useState('all')
  const [tableFilter, setTableFilter] = useState('all')
  const [catFilter,   setCatFilter]   = useState('all')
  const [dateRange,   setDateRange]   = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Unique values for filter dropdowns
  const tables     = useMemo(() => [...new Set(logs.map(l => l.target_table).filter(Boolean))].sort(), [logs])
  const categories = useMemo(() => [...new Set(Object.values(EVENT_META).map(m => m.cat))].sort(), [])

  const filtered = useMemo(() => {
    const cutoff = dateRange === '1d' ? subDays(new Date(), 1)
      : dateRange === '7d' ? subDays(new Date(), 7)
      : dateRange === '30d' ? subDays(new Date(), 30)
      : null

    const q = search.toLowerCase()

    return logs.filter(l => {
      if (cutoff && !isAfter(new Date(l.created_at), cutoff)) return false
      if (roleFilter  !== 'all' && l.actor_role    !== roleFilter)  return false
      if (tableFilter !== 'all' && l.target_table  !== tableFilter) return false
      if (catFilter   !== 'all' && getMeta(l.event_type).cat !== catFilter) return false
      if (q) {
        const haystack = [
          l.event_type, l.profiles?.full_name, l.target_table,
          l.organisations?.name, l.actor_role,
          JSON.stringify(l.details || {}),
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [logs, search, roleFilter, tableFilter, catFilter, dateRange])

  function exportCSV() {
    const headers = ['Time', 'Actor', 'Org', 'Role', 'Event', 'Table', 'Target ID', 'Details']
    const rows = filtered.map(l => [
      format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss'),
      l.profiles?.full_name || 'System',
      l.organisations?.name || '',
      l.actor_role || '',
      l.event_type || '',
      l.target_table || '',
      l.target_id || '',
      JSON.stringify(l.details || {}),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `audit_log_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    a.click()
  }

  // Event category counts for summary bar
  const catCounts = useMemo(() => {
    const counts = {}
    logs.forEach(l => {
      const cat = getMeta(l.event_type).cat
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [logs])

  return (
    <div className="page fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} color="var(--g700)" />
            Audit Log
          </div>
          <div className="page-subtitle">
            {loading ? 'Loading…' : `${filtered.length} of ${logs.length} entries · Real-time · All users & DB events`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(v => !v)}>
            <Filter size={14} /> Filters {showFilters ? '▲' : '▼'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={refetch}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* Category summary pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div
            onClick={() => setCatFilter('all')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: catFilter === 'all' ? 'var(--g800)' : '#fff', color: catFilter === 'all' ? '#fff' : 'var(--n600)', border: '1px solid', borderColor: catFilter === 'all' ? 'transparent' : 'var(--n200)', transition: 'all 0.13s' }}
          >
            All <span style={{ opacity: 0.75 }}>{logs.length}</span>
          </div>
          {categories.map(cat => (
            <div
              key={cat}
              onClick={() => setCatFilter(catFilter === cat ? 'all' : cat)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: catFilter === cat ? 'var(--g800)' : '#fff', color: catFilter === cat ? '#fff' : 'var(--n600)', border: '1px solid', borderColor: catFilter === cat ? 'transparent' : 'var(--n200)', transition: 'all 0.13s' }}
            >
              {cat} <span style={{ opacity: 0.75 }}>{catCounts[cat] || 0}</span>
            </div>
          ))}
        </div>

        {/* Search bar — always visible */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--n400)' }} />
          <input
            className="form-input"
            placeholder="Search events, actors, orgs, details…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40, fontSize: 14 }}
            autoFocus={false}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n400)', fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
          )}
        </div>

        {/* Advanced filters (collapsible) */}
        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, padding: '14px 16px', background: 'var(--n50)', borderRadius: 10, border: '1px solid var(--n200)' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n500)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Time range</label>
              <select className="form-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
                {DATE_RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n500)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Role</label>
              <select className="form-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="officer">Officer</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n500)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Table</label>
              <select className="form-select" value={tableFilter} onChange={e => setTableFilter(e.target.value)}>
                <option value="all">All tables</option>
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setRoleFilter('all'); setTableFilter('all'); setCatFilter('all'); setDateRange('all') }}>
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* Log table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Activity size={36} className="empty-icon" />
              <div className="empty-title">No matching entries</div>
              <div className="empty-body">Try adjusting your filters or search terms</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
              <table className="data-table" style={{ minWidth: 900 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff', boxShadow: '0 1px 0 var(--n200)' }}>
                  <tr>
                    <th style={{ width: 32, padding: '10px 8px 10px 16px' }} />
                    <th style={{ minWidth: 120 }}>Time</th>
                    <th style={{ minWidth: 160 }}>Actor</th>
                    <th style={{ minWidth: 110 }}>Role</th>
                    <th style={{ minWidth: 160 }}>Event</th>
                    <th style={{ minWidth: 110 }}>Table</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--n100)', fontSize: 12, color: 'var(--n400)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Showing {filtered.length} of {logs.length} entries</span>
              <span>Click any row to expand details · Updates in real-time</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
