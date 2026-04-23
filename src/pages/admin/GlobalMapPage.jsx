import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../../lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw, Users, FileText } from 'lucide-react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const ORG_PALETTE = [
  '#0a5c47','#1d4ed8','#7c3aed','#db2777','#d97706',
  '#0891b2','#16a34a','#dc2626','#9333ea','#0284c7',
]
function getOrgColor(orgId, map) { return map[orgId] || '#6b7280' }

function makeUserIcon(status, role) {
  const c = role === 'super_admin' ? '#dc2626'
    : role === 'supervisor'        ? '#1d4ed8'
    : status === 'active'          ? '#22c55e'
    : status === 'inactive'        ? '#f59e0b'
    : '#9ca3af'
  return L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <circle cx="16" cy="14" r="13" fill="${c}" stroke="white" stroke-width="2.5"/>
      <circle cx="16" cy="14" r="5.5" fill="white"/>
      <path d="M16 27 L9 40 L16 35 L23 40 Z" fill="${c}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`,
    iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -44],
  })
}

function makeSubmissionIcon(color) {
  return L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2.5" opacity="0.9"/>
      <rect x="6.5" y="6.5" width="7" height="7" rx="1.5" fill="white" opacity="0.95"/>
    </svg>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  })
}

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }, [points.length])
  return null
}

function profileStatus(p) {
  const minsAgo = p.last_seen_at ? (Date.now() - new Date(p.last_seen_at)) / 60000 : Infinity
  if (p.is_online && minsAgo < 5) return 'active'
  if (minsAgo < 30)               return 'inactive'
  return 'offline'
}

export default function GlobalMapPage() {
  const [profiles,    setProfiles]    = useState([])
  const [submissions, setSubmissions] = useState([])
  const [orgs,        setOrgs]        = useState([])
  const [orgFilter,   setOrgFilter]   = useState('all')
  const [loading,     setLoading]     = useState(true)
  const [showUsers,       setShowUsers]       = useState(true)
  const [showSubmissions, setShowSubmissions] = useState(true)
  const [mapType,         setMapType]         = useState('satellite')

  const orgColorMap = useMemo(() => {
    const m = {}
    orgs.forEach((o, i) => { m[o.id] = ORG_PALETTE[i % ORG_PALETTE.length] })
    return m
  }, [orgs])

  async function loadAll() {
    setLoading(true)
    const [profilesRes, subsRes, orgsRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, role, org_id, is_online, last_seen_at, organisations!profiles_org_id_fkey(id, name), officer_locations(lat, lng, recorded_at)')
        .in('role', ['officer', 'supervisor', 'super_admin'])
        .eq('active', true),
      supabase.from('form_submissions')
        .select('id, lat, lng, submitted_at, org_id, form_id, profiles!form_submissions_officer_id_fkey(full_name), forms(title)')
        .not('lat', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(600),
      supabase.from('organisations').select('id, name').order('name'),
    ])

    const all = profilesRes.data || []
    const withLoc = all
      .filter(p => p.officer_locations?.length > 0)
      .map(p => {
        const locs   = p.officer_locations
        const latest = locs.reduce((a, b) => new Date(a.recorded_at) > new Date(b.recorded_at) ? a : b, locs[0])
        return { ...p, loc: latest }
      })

    setProfiles(withLoc)
    setSubmissions((subsRes.data || []).filter(s => s.lat && s.lng))
    setOrgs(orgsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const fp  = orgFilter === 'all' ? profiles    : profiles.filter(p => p.org_id === orgFilter)
  const fs  = orgFilter === 'all' ? submissions : submissions.filter(s => s.org_id === orgFilter)

  const activeCount = fp.filter(p => profileStatus(p) === 'active').length

  const allPoints = [
    ...(showUsers       ? fp.map(p => ({ lat: p.loc.lat, lng: p.loc.lng })) : []),
    ...(showSubmissions ? fs.map(s => ({ lat: s.lat,     lng: s.lng     })) : []),
  ]

  return (
    <div style={{ height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Controls */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--n200)', padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0, zIndex: 5 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--n900)', marginRight: 4 }}>Global Map</div>
        <select className="form-select" value={orgFilter} onChange={e => setOrgFilter(e.target.value)} style={{ width: 200 }}>
          <option value="all">All organisations</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => setShowUsers(v => !v)}
            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, background: showUsers ? '#eff6ff' : '#fff', border: `1px solid ${showUsers ? '#1d4ed8' : 'var(--n300)'}`, color: showUsers ? '#1d4ed8' : 'var(--n500)' }}>
            <Users size={13} /> Users ({fp.length})
          </button>
          <button onClick={() => setShowSubmissions(v => !v)}
            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, background: showSubmissions ? '#fffbeb' : '#fff', border: `1px solid ${showSubmissions ? 'var(--amber)' : 'var(--n300)'}`, color: showSubmissions ? '#92400e' : 'var(--n500)' }}>
            <FileText size={13} /> Submissions ({fs.length})
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>● {activeCount} online</div>
        <button className="btn btn-ghost btn-sm" onClick={loadAll} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Map */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, isolation: 'isolate' }}>
          <MapContainer center={[-1.2921, 36.8219]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            {mapType === 'satellite'
              ? <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri" />
              : <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
            }
            {/* <ZoomControl position="topleft" /> */}
            <FitBounds points={allPoints} />

            {/* Officers with GPS */}
            {showUsers && fp.map(p => {
              const st = profileStatus(p)
              return (
                <Marker key={p.id} position={[p.loc.lat, p.loc.lng]} icon={makeUserIcon(st, p.role)}>
                  <Popup>
                    <div style={{ fontFamily: 'var(--font)', padding: '8px 4px', minWidth: 190 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.full_name}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{p.organisations?.name}</div>
                      <div style={{ fontSize: 11, color: '#888', textTransform: 'capitalize', marginTop: 2 }}>{p.role.replace(/_/g,' ')}</div>
                      <div style={{ fontSize: 11, marginTop: 5, fontWeight: 600, color: st === 'active' ? '#22c55e' : st === 'inactive' ? '#f59e0b' : '#9ca3af' }}>
                        {st === 'active' ? 'Online now' : p.last_seen_at ? `Last seen ${formatDistanceToNow(new Date(p.last_seen_at), { addSuffix: true })}` : 'Offline'}
                      </div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2, fontFamily: 'monospace' }}>
                        {p.loc.lat.toFixed(5)}, {p.loc.lng.toFixed(5)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Form submissions — colour-coded by org */}
            {showSubmissions && fs.map(sub => {
              const color = getOrgColor(sub.org_id, orgColorMap)
              return (
                <Marker key={sub.id} position={[sub.lat, sub.lng]} icon={makeSubmissionIcon(color)}>
                  <Popup>
                    <div style={{ fontFamily: 'var(--font)', padding: '8px 4px', minWidth: 190 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{sub.forms?.title || 'Form submission'}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>by {sub.profiles?.full_name || '—'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#888' }}>{orgs.find(o => o.id === sub.org_id)?.name || '—'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}</div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2, fontFamily: 'monospace' }}>{sub.lat.toFixed(5)}, {sub.lng.toFixed(5)}</div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          {/* Map type toggle */}
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: '#fff', borderRadius: 10, padding: 6, boxShadow: 'var(--sh-md)', border: '1px solid var(--n200)', display: 'flex', gap: 4 }}>
            {[['satellite','Satellite'],['osm','Street']].map(([val, label]) => (
              <button key={val} onClick={() => setMapType(val)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: mapType === val ? 'var(--g800)' : 'transparent', color: mapType === val ? '#fff' : 'var(--n500)' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--sh-md)', border: '1px solid var(--n200)', fontSize: 11, minWidth: 150 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--n700)', marginBottom: 8 }}>Users</div>
            {[
              { color: '#22c55e', label: 'Online (officer)' },
              { color: '#f59e0b', label: 'Recent (officer)' },
              { color: '#9ca3af', label: 'Offline (officer)' },
              { color: '#1d4ed8', label: 'Supervisor'        },
              { color: '#dc2626', label: 'Super Admin'       },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, border: '1.5px solid white', boxShadow: `0 0 0 1px ${color}`, flexShrink: 0 }} />
                <span style={{ color: 'var(--n600)', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
            {orgs.length > 0 && fs.length > 0 && (
              <>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--n700)', marginTop: 10, marginBottom: 6 }}>Submissions by org</div>
                {orgs.filter(o => fs.some(s => s.org_id === o.id)).map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: getOrgColor(o.id, orgColorMap), border: '1.5px solid white', flexShrink: 0 }} />
                    <span style={{ color: 'var(--n600)', fontWeight: 500, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
