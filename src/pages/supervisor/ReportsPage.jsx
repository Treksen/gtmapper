import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, LineChart, Line
} from 'recharts'
import { Download, TrendingUp, FileText, Users, BarChart2 } from 'lucide-react'
import { useOrgSubmissions, useOfficers, useForms } from '../../hooks/useData'
import { format, subDays, isAfter, formatDistanceToNow } from 'date-fns'
import { useAuth } from '../../context/AuthContext'

const STATUS_COLORS = {
  submitted: '#0a5c47',
  approved:  '#16a34a',
  rejected:  '#dc2626',
  pending:   '#f59e0b',
}

export default function ReportsPage() {
  const { profile } = useAuth()
  const { submissions, loading } = useOrgSubmissions()
  const { officers }             = useOfficers()
  const { forms }                = useForms()
  const [period, setPeriod]      = useState('week')
  const [exported, setExported]  = useState(false)

  // Filter by period
  const cutoff = period === 'today'
    ? new Date(new Date().setHours(0, 0, 0, 0))
    : period === 'week'
      ? subDays(new Date(), 7)
      : period === 'month'
        ? subDays(new Date(), 30)
        : null

  const display = cutoff
    ? submissions.filter(s => isAfter(new Date(s.submitted_at), cutoff))
    : submissions

  // ── Summary metrics ──────────────────────────────────────────────────────
  const totalSubs     = display.length
  const approvedSubs  = display.filter(s => s.status === 'approved').length
  const pendingSubs   = display.filter(s => s.status === 'submitted' || s.status === 'pending').length
  const rejectedSubs  = display.filter(s => s.status === 'rejected').length
  const uniqueOfficers = new Set(display.map(s => s.officer_id)).size

  // ── Submissions by day (last 7 or 30) ────────────────────────────────────
  const dayCount = period === 'month' ? 30 : 7
  const dailyData = useMemo(() => {
    const days = Array.from({ length: dayCount }, (_, i) => {
      const d = subDays(new Date(), dayCount - 1 - i)
      return d.toISOString().split('T')[0]
    })
    const counts = {}
    days.forEach(d => { counts[d] = 0 })
    display.forEach(s => {
      const d = new Date(s.submitted_at).toISOString().split('T')[0]
      if (counts[d] !== undefined) counts[d]++
    })
    return days.map(d => ({
      day:   format(new Date(d), dayCount <= 7 ? 'EEE' : 'dd MMM'),
      count: counts[d],
    }))
  }, [display.length, period])

  // ── Submissions per form ──────────────────────────────────────────────────
  const perForm = useMemo(() => {
    const map = {}
    display.forEach(s => {
      const title = s.forms?.title || s.form_title || 'Untitled'
      map[title] = (map[title] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, count }))
  }, [display.length])

  // ── Submissions per officer ───────────────────────────────────────────────
  const perOfficer = useMemo(() => {
    const map = {}
    display.forEach(s => {
      const name = s.profiles?.full_name || 'Unknown'
      map[name] = (map[name] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({
        name:  name.split(' ')[0],
        count,
      }))
  }, [display.length])

  // ── Status breakdown ─────────────────────────────────────────────────────
  const statusData = [
    { name: 'Submitted', value: pendingSubs,  color: '#f59e0b' },
    { name: 'Approved',  value: approvedSubs, color: '#0a5c47' },
    { name: 'Rejected',  value: rejectedSubs, color: '#dc2626' },
  ].filter(s => s.value > 0)

  // ── Recent submissions ────────────────────────────────────────────────────
  const recent = display.slice(0, 10)

  // ── Export ────────────────────────────────────────────────────────────────
  function exportReport() {
    setExported(true)
    setTimeout(() => setExported(false), 3000)
    const today = new Date().toISOString().split('T')[0]
    const lines = [
      'GT MAPPER · FORM SUBMISSIONS REPORT',
      '═'.repeat(50),
      `Organisation: ${profile?.organisations?.name || 'GeoTreks Kenya'}`,
      `Generated:    ${format(new Date(), 'dd MMM yyyy HH:mm')}`,
      `Period:       ${period === 'today' ? 'Today' : period === 'week' ? 'Last 7 days' : period === 'month' ? 'Last 30 days' : 'All time'}`,
      '',
      'SUMMARY',
      '─'.repeat(50),
      `Total submissions:  ${totalSubs}`,
      `Approved:           ${approvedSubs}`,
      `Pending review:     ${pendingSubs}`,
      `Rejected:           ${rejectedSubs}`,
      `Officers active:    ${uniqueOfficers}`,
      '',
      'SUBMISSIONS PER FORM',
      '─'.repeat(50),
      ...perForm.map(f => `${f.name.padEnd(25)} ${String(f.count).padStart(4)}`),
      '',
      'SUBMISSIONS PER OFFICER',
      '─'.repeat(50),
      ...perOfficer.map(o => `${o.name.padEnd(25)} ${String(o.count).padStart(4)}`),
      '',
      `GT Mapper v1.0 · GeoTreks Kenya · ${new Date().toISOString()}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a    = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(blob),
      download: `GT_Mapper_Report_${today}.txt`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">Reports & Analytics</div>
          <div className="page-subtitle">{totalSubs} submissions · {forms.length} forms · {officers.length} officers</div>
        </div>
        <button className={`btn btn-sm ${exported ? 'btn-secondary' : 'btn-primary'}`} onClick={exportReport}>
          <Download size={14} /> {exported ? 'Downloaded!' : 'Export'}
        </button>
      </div>

      <div className="page-body">
        {/* Period toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: 'var(--n100)', borderRadius: 'var(--r-md)', padding: 4, gap: 4 }}>
          {[{v:'today',l:'Today'},{v:'week',l:'7 days'},{v:'month',l:'30 days'},{v:'all',l:'All time'}].map(({v,l}) => (
            <button key={v} onClick={() => setPeriod(v)} style={{ padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', background: period===v ? '#fff' : 'transparent', color: period===v ? 'var(--g800)' : 'var(--n500)', fontFamily: 'var(--font)', fontWeight: period===v ? 700 : 500, fontSize: 13, boxShadow: period===v ? 'var(--sh-sm)' : 'none' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Summary metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {[
            { label: 'Total submissions', value: totalSubs,      color: 'var(--g800)', icon: FileText },
            { label: 'Officers active',   value: uniqueOfficers, color: '#3b82f6',     icon: Users   },
            { label: 'Approved',          value: approvedSubs,   color: '#16a34a',     icon: BarChart2 },
            { label: 'Pending review',    value: pendingSubs,    color: 'var(--amber)', icon: BarChart2 },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="metric">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <div className="metric-label">{label.toUpperCase()}</div>
                <Icon size={14} color={color} />
              </div>
              <div className="metric-value" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Daily submissions chart */}
        {totalSubs > 0 && dailyData.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Submissions over time</div>
              <TrendingUp size={17} color="var(--g600)" />
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} barSize={period === 'month' ? 8 : 20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--n100)" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--n400)', fontFamily: 'var(--font)' }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--n200)', fontSize: 12, fontFamily: 'var(--font)' }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="count" fill="var(--g600)" radius={[4,4,0,0]} name="Submissions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Per-form chart */}
        {perForm.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Submissions by form</div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perForm} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--n100)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--n600)', fontFamily: 'var(--font)' }} width={110} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--n200)', fontSize: 12, fontFamily: 'var(--font)' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0,4,4,0]} name="Submissions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Per-officer chart */}
        {perOfficer.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Submissions by officer</div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perOfficer} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--n100)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--n400)', fontFamily: 'var(--font)' }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--n200)', fontSize: 12, fontFamily: 'var(--font)' }} />
                  <Bar dataKey="count" fill="var(--g600)" radius={[4,4,0,0]} name="Submissions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Status breakdown */}
        {statusData.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Status breakdown</div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" paddingAngle={3}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--n200)', fontSize: 12, fontFamily: 'var(--font)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 4, justifyContent: 'center' }}>
              {statusData.map(({ name, value, color }) => (
                <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--n600)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                  {name} <strong style={{ color: 'var(--n900)' }}>{value}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent submissions list */}
        {recent.length > 0 && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--n100)', fontWeight: 700, fontSize: 13, color: 'var(--n700)' }}>
              Recent submissions
            </div>
            {recent.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < recent.length - 1 ? '1px solid var(--n100)' : 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={16} color="#3b82f6" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.forms?.title || s.form_title || 'Untitled Form'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--n500)', marginTop: 1 }}>
                    {s.profiles?.full_name || '—'} · {formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true })}
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600, flexShrink: 0,
                  background: s.status === 'approved' ? 'var(--g50)'  : s.status === 'rejected' ? '#fef2f2' : '#fffbeb',
                  color:      s.status === 'approved' ? 'var(--g800)' : s.status === 'rejected' ? 'var(--red)' : '#92400e',
                }}>
                  {s.status || 'submitted'}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalSubs === 0 && !loading && (
          <div className="card">
            <div className="empty-state">
              <TrendingUp size={40} className="empty-icon" />
              <div className="empty-title">No submissions yet</div>
              <div className="empty-body">Form submissions will appear here as officers collect data</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
