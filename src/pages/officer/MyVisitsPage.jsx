import React, { useState } from 'react'
import { CheckCircle, AlertCircle, ArrowRightCircle, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useMyVisits } from '../../hooks/useData'
import { format, formatDistanceToNow } from 'date-fns'

const OC = {
  'Completed':        { bg: 'var(--g50)',  text: 'var(--g800)',  icon: <CheckCircle size={18} color="var(--g600)"/> },
  'No show':          { bg: '#fffbeb',     text: '#92400e',      icon: <AlertCircle size={18} color="var(--amber)"/> },
  'Referred':         { bg: '#eff6ff',     text: '#1e40af',      icon: <ArrowRightCircle size={18} color="var(--blue)"/> },
  'Follow-up needed': { bg: '#eff6ff',     text: '#1e40af',      icon: <ArrowRightCircle size={18} color="var(--blue)"/> },
}

export default function MyVisitsPage() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const [date,     setDate]    = useState(today)
  const [filter,   setFilter]  = useState('all')
  const [expanded, setExpanded]= useState(null)
  const { visits, loading } = useMyVisits(date)

  const filtered = filter === 'all' ? visits : visits.filter(v => v.outcome === filter)

  const counts = {
    all:       visits.length,
    Completed: visits.filter(v => v.outcome === 'Completed').length,
    'No show': visits.filter(v => v.outcome === 'No show').length,
    Referred:  visits.filter(v => ['Referred','Follow-up needed'].includes(v.outcome)).length,
  }

  return (
    <div style={{ padding: '18px 16px' }} className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>My Visits</h2>

      {/* Date */}
      <div className="form-group" style={{ marginBottom: 14 }}>
        <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} max={today}/>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { v: 'all',       l: `All (${counts.all})` },
          { v: 'Completed', l: `Done (${counts.Completed})` },
          { v: 'No show',   l: `No show (${counts['No show']})` },
          { v: 'Referred',  l: `Referred (${counts.Referred})` },
        ].map(({ v, l }) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, border: '1.5px solid', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.13s', background: filter===v?'var(--g800)':'#fff', color: filter===v?'#fff':'var(--n600)', borderColor: filter===v?'transparent':'var(--n300)' }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }}/></div>
      ) : filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <CheckCircle size={40} className="empty-icon"/>
          <div className="empty-title">No visits here</div>
          <div className="empty-body">Try a different date or filter</div>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(v => {
            const oc = OC[v.outcome] || OC['Completed']
            const isExp = expanded === v.id
            return (
              <div key={v.id} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 12, padding: '13px 14px', cursor: 'pointer', alignItems: 'flex-start' }}
                  onClick={() => setExpanded(isExp ? null : v.id)}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: oc.bg }}>{oc.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--n900)' }}>{v.visit_purpose}</div>
                    <div style={{ fontSize: 12, color: 'var(--n500)', marginTop: 1 }}>{v.beneficiary_type}{v.household_name ? ` · ${v.household_name}` : ''}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: oc.bg, color: oc.text }}>{v.outcome}</span>
                      <span style={{ fontSize: 11, color: 'var(--n400)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10}/> {format(new Date(v.visited_at), 'HH:mm')}</span>
                      {v.duration_minutes && <span style={{ fontSize: 11, color: 'var(--n400)' }}>{v.duration_minutes}min</span>}
                    </div>
                  </div>
                  {isExp ? <ChevronUp size={15} color="var(--n300)"/> : <ChevronDown size={15} color="var(--n300)"/>}
                </div>

                {isExp && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--n100)', paddingTop: 12, animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      {[
                        { label: 'GPS',       value: `${v.lat?.toFixed(5)}, ${v.lng?.toFixed(5)}`, mono: true },
                        { label: 'Recorded',  value: format(new Date(v.visited_at), 'HH:mm, dd MMM') },
                        { label: 'Age / Sex', value: [v.beneficiary_age ? v.beneficiary_age+'yrs' : null, v.beneficiary_sex].filter(Boolean).join(', ') || '—' },
                        { label: 'Condition', value: v.health_condition || '—' },
                        { label: 'Referred to',value: v.referred_to || '—' },
                        { label: 'Next visit', value: v.next_visit_date ? format(new Date(v.next_visit_date), 'dd MMM yyyy') : '—' },
                      ].map(({ label, value, mono }) => (
                        <div key={label}>
                          <div style={{ fontSize: 10, color: 'var(--n400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                          <div style={{ fontSize: 12, color: 'var(--n700)', marginTop: 2, fontFamily: mono ? 'var(--mono)' : 'var(--font)' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {v.notes && (
                      <div style={{ background: 'var(--n50)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--n200)', fontSize: 13, color: 'var(--n700)', lineHeight: 1.55, marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--n400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes</div>
                        {v.notes}
                      </div>
                    )}
                    <a href={`https://maps.google.com/?q=${v.lat},${v.lng}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                      <MapPin size={13}/> Open in Maps
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {visits.length > 0 && (
        <div style={{ marginTop: 16, background: 'var(--g50)', border: '1px solid var(--g100)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g800)', marginBottom: 8 }}>
            {date === today ? "Today's summary" : `Summary for ${format(new Date(date), 'dd MMM')}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
            {[{l:'Total',v:visits.length},{l:'Completed',v:counts.Completed},{l:'Referred',v:counts.Referred}].map(({l,v})=>(
              <div key={l}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--g700)' }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--g600)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
