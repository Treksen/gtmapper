import React, { useState } from 'react'
import { MapPin, Plus, Edit2, Check, X, Layers } from 'lucide-react'
import { useZones } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useData'
import { ToastContainer } from '../../components/Toast'

export default function ZonesPage() {
  const { profile } = useAuth()
  const { zones, loading } = useZones()
  const { toasts, toast } = useToast()
  const [adding,  setAdding]  = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState({ name: '', description: '', daily_target: 20, color: '#0a5c47', center_lat: -1.313, center_lng: 36.791 })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function saveZone() {
    if (!form.name.trim()) return toast('Zone name is required', 'error')
    setSaving(true)
    try {
      if (editing) {
        await supabase.from('zones').update({ ...form, daily_target: Number(form.daily_target) }).eq('id', editing)
        toast('Zone updated')
      } else {
        await supabase.from('zones').insert({ ...form, org_id: profile.org_id, daily_target: Number(form.daily_target) })
        toast('Zone created')
      }
      setAdding(false); setEditing(null)
      setForm({ name: '', description: '', daily_target: 20, color: '#0a5c47', center_lat: -1.313, center_lng: 36.791 })
      window.location.reload()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deactivateZone(id) {
    if (!confirm('Deactivate this zone?')) return
    await supabase.from('zones').update({ active: false }).eq('id', id)
    toast('Zone deactivated')
    window.location.reload()
  }

  function startEdit(zone) {
    setEditing(zone.id)
    setForm({ name: zone.name, description: zone.description || '', daily_target: zone.daily_target, color: zone.color, center_lat: zone.center_lat, center_lng: zone.center_lng })
    setAdding(true)
  }

  return (
    <div className="page fade-in">
      <ToastContainer toasts={toasts} />
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">Coverage Zones</div>
          <div className="page-subtitle">{zones.length} active zones</div>
        </div>
        {!adding && (
          <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setEditing(null); setForm({ name: '', description: '', daily_target: 20, color: '#0a5c47', center_lat: -1.313, center_lng: 36.791 }) }}>
            <Plus size={14} /> Add Zone
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Add/Edit form */}
        {adding && (
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--n900)' }}>
              {editing ? 'Edit Zone' : 'New Zone'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Zone name *</label>
                  <input className="form-input" placeholder="e.g. Kibera South" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Daily visit target</label>
                  <input className="form-input" type="number" min="1" max="200" value={form.daily_target} onChange={e => set('daily_target', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" placeholder="Brief description of this zone" value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                      style={{ width: 42, height: 36, border: '1.5px solid var(--n200)', borderRadius: 'var(--r-sm)', cursor: 'pointer', padding: 2 }} />
                    <input className="form-input" value={form.color} onChange={e => set('color', e.target.value)} style={{ fontFamily: 'var(--mono)', fontSize: 13 }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Centre latitude</label>
                  <input className="form-input" type="number" step="0.0001" value={form.center_lat} onChange={e => set('center_lat', parseFloat(e.target.value))} style={{ fontFamily: 'var(--mono)', fontSize: 13 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Centre longitude</label>
                  <input className="form-input" type="number" step="0.0001" value={form.center_lng} onChange={e => set('center_lng', parseFloat(e.target.value))} style={{ fontFamily: 'var(--mono)', fontSize: 13 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={saveZone} disabled={saving}>
                  {saving ? <span className="spinner"/> : <><Check size={15}/> {editing ? 'Update' : 'Create'} Zone</>}
                </button>
                <button className="btn btn-ghost" onClick={() => { setAdding(false); setEditing(null) }}>
                  <X size={15}/> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Zones list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }}/></div>
        ) : zones.length === 0 ? (
          <div className="card"><div className="empty-state">
            <Layers size={40} className="empty-icon"/>
            <div className="empty-title">No zones yet</div>
            <div className="empty-body">Create your first coverage zone to assign officers</div>
          </div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {zones.map(zone => (
              <div key={zone.id} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: zone.color + '20', border: `2px solid ${zone.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin size={20} color={zone.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--n900)' }}>{zone.name}</div>
                      {zone.description && <div style={{ fontSize: 13, color: 'var(--n500)', marginTop: 2 }}>{zone.description}</div>}
                      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 12, color: 'var(--n600)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--n800)' }}>{zone.daily_target}</span> daily target
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--n400)' }}>
                          {zone.center_lat?.toFixed(4)}, {zone.center_lng?.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(zone)}>
                      <Edit2 size={13}/> Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deactivateZone(zone.id)}>
                      <X size={13}/>
                    </button>
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
