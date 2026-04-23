import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useOfficers, useOrgSubmissions, getOfficerStatus } from '../../hooks/useData'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw, FileText, Eye, EyeOff } from 'lucide-react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function officerIcon(status) {
  const color = status === 'active' ? '#22c55e' : status === 'inactive' ? '#f59e0b' : '#ef4444'
  return L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <circle cx="17" cy="15" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="17" cy="15" r="6" fill="white"/>
      <path d="M17 29 L10 42 L17 37 L24 42 Z" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`,
    iconSize: [34, 44], iconAnchor: [17, 44], popupAnchor: [0, -46],
  })
}

function submissionIcon() {
  return L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="9" fill="#3b82f6" stroke="white" stroke-width="2"/>
      <rect x="7" y="7" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/>
      <path d="M8.5 11h5M8.5 13h3" stroke="#3b82f6" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,
    iconSize: [22, 22], iconAnchor: [11, 11],
  })
}

function AutoBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) { map.setView([points[0][0], points[0][1]], 14); return }
    const bounds = L.latLngBounds(points)
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 })
  }, [points.length])
  return null
}

export default function LiveMapPage() {
  const { officers, loading: offLoading, refetch } = useOfficers()
  const { submissions } = useOrgSubmissions()

  const [showSubmissions, setShowSubmissions] = useState(true)
  const [filter,          setFilter]          = useState('all')
  const [mapType,         setMapType]         = useState('satellite')

  const filtered = filter === 'all' ? officers : officers.filter(o => {
    const st = getOfficerStatus(o)
    if (filter === 'active')   return st === 'active'
    if (filter === 'inactive') return st === 'inactive'
    if (filter === 'offline')  return st === 'offline'
    return true
  })

  const submissionPoints = submissions.filter(s => s.lat && s.lng)

  const allPoints = [
    ...filtered.filter(o => o.officer_locations?.[0]).map(o => [o.officer_locations[0].lat, o.officer_locations[0].lng]),
    ...(showSubmissions ? submissionPoints.map(s => [s.lat, s.lng]) : []),
  ].filter(p => p[0] && p[1])

  const defaultCenter = [-1.1015, 37.0144]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>

      {/* Controls */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--n200)', padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, zIndex: 5 }}>
        {/* Officer filter */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[
            { key: 'all',      label: `All (${officers.length})` },
            { key: 'active',   label: `Online (${officers.filter(o => getOfficerStatus(o) === 'active').length})` },
            { key: 'inactive', label: 'Recent'  },
            { key: 'offline',  label: 'Offline' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font)', background: filter === key ? 'var(--g800)' : '#fff', color: filter === key ? '#fff' : 'var(--n500)', borderColor: filter === key ? 'transparent' : 'var(--n300)' }}>
              {label}
            </button>
          ))}
        </div>
        {/* Layer toggles */}
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => setShowSubmissions(v => !v)} style={{ padding: '4px 8px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: showSubmissions ? '#eff6ff' : '#fff', border: `1px solid ${showSubmissions ? '#93c5fd' : 'var(--n300)'}`, color: showSubmissions ? '#1d4ed8' : 'var(--n500)', fontFamily: 'var(--font)', fontWeight: 600, display: 'flex', gap: 4, alignItems: 'center' }}>
            {showSubmissions ? <Eye size={12} /> : <EyeOff size={12} />} <FileText size={12} /> Forms ({submissionPoints.length})
          </button>
          <button onClick={refetch} style={{ padding: '4px 8px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: '#fff', border: '1px solid var(--n300)', color: 'var(--n500)', fontFamily: 'var(--font)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, isolation: 'isolate' }}>
        {offLoading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f4' }}>
            <div className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <MapContainer center={defaultCenter} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            {mapType === 'osm'
              ? <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
              : <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri" />
            }
            <ZoomControl position="bottomleft" />
            <AutoBounds points={allPoints} />

            {/* Form submissions */}
            {showSubmissions && submissionPoints.map(s => (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={submissionIcon()}>
                <Popup>
                  <div style={{ padding: '10px', minWidth: 180, fontFamily: 'var(--font)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{s.forms?.title || 'Form Submission'}</div>
                    <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, marginTop: 2 }}>{s.profiles?.full_name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--n400)', marginTop: 4 }}>{s.lat?.toFixed(5)}, {s.lng?.toFixed(5)}</div>
                    <div style={{ fontSize: 11, color: 'var(--n400)', marginTop: 2 }}>{formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true })}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Officers */}
            {filtered.map(o => {
              const loc = o.officer_locations?.[0]
              if (!loc) return null
              const st = getOfficerStatus(o)
              const statusColor = st === 'active' ? '#22c55e' : st === 'inactive' ? '#f59e0b' : '#ef4444'
              return (
                <Marker key={o.id} position={[loc.lat, loc.lng]} icon={officerIcon(st)}>
                  <Popup>
                    <div style={{ padding: '12px', minWidth: 200, fontFamily: 'var(--font)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, fontWeight: 700 }}>
                          {o.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{o.full_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--n500)' }}>{o.organisations?.name || '—'}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--n500)', marginBottom: 3 }}>
                        {st === 'active' ? '🟢 Online now' : o.last_seen_at ? `Last seen: ${formatDistanceToNow(new Date(o.last_seen_at), { addSuffix: true })}` : 'Never seen'}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--n400)', marginBottom: 6 }}>
                        {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 10px', borderRadius: 99, fontWeight: 600, background: st === 'active' ? '#f0fdf4' : st === 'inactive' ? '#fffbeb' : '#fef2f2', color: statusColor }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                        {st === 'active' ? 'Online' : st === 'inactive' ? 'Recently active' : 'Offline'}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}

        {/* Map type toggle */}
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, background: '#fff', borderRadius: 9, padding: '5px', boxShadow: 'var(--sh-md)', border: '1px solid var(--n200)', display: 'flex', gap: 3 }}>
          {[['satellite', 'Satellite'], ['osm', 'Street']].map(([type, label]) => (
            <button key={type} onClick={() => setMapType(type)} style={{ padding: '5px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: mapType === type ? 'var(--g800)' : 'transparent', color: mapType === type ? '#fff' : 'var(--n500)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: '#fff', borderRadius: 9, padding: '8px 10px', boxShadow: 'var(--sh-md)', border: '1px solid var(--n200)', fontSize: 11 }}>
          {[
            { color: '#22c55e', label: 'Online'    },
            { color: '#f59e0b', label: 'Recent'    },
            { color: '#ef4444', label: 'Offline'   },
            { color: '#3b82f6', label: 'Submission'},
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, border: '1.5px solid white', boxShadow: `0 0 0 1px ${color}`, flexShrink: 0 }} />
              <span style={{ color: 'var(--n600)', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
