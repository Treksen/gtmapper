import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, GripVertical, Check, X,
  Type, Hash, List, CheckSquare, Calendar, MapPin,
  Camera, PenTool, AlignLeft, ChevronDown, ChevronUp
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { proposePendingAction, useToast } from '../../hooks/useData'
import { ToastContainer } from '../../components/Toast'

const FIELD_TYPES = [
  { type: 'text',        icon: Type,        label: 'Short Text'   },
  { type: 'textarea',    icon: AlignLeft,   label: 'Long Text'    },
  { type: 'number',      icon: Hash,        label: 'Number'       },
  { type: 'select',      icon: List,        label: 'Dropdown'     },
  { type: 'multiselect', icon: CheckSquare, label: 'Multi-select' },
  { type: 'date',        icon: Calendar,    label: 'Date'         },
  { type: 'gps',         icon: MapPin,      label: 'GPS Location' },
  { type: 'photo',       icon: Camera,      label: 'Photo'        },
  { type: 'signature',   icon: PenTool,     label: 'Signature'    },
]

function newField(type) {
  return { id: `f_${Date.now()}`, type, label: '', required: false, options: type === 'select' || type === 'multiselect' ? ['Option 1'] : undefined }
}

export default function FormBuilderPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [fields, setFields]       = useState([])
  const [expandedId, setExpanded] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const isEdit = !!id

  // Load existing form for edit
  useEffect(() => {
    if (!id) return
    supabase.from('forms').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setTitle(data.title)
        setDesc(data.description || '')
        setFields(Array.isArray(data.schema) ? data.schema : [])
      }
    })
  }, [id])

  function addField(type) {
    const f = newField(type)
    setFields(fs => [...fs, f])
    setExpanded(f.id)
    setShowPicker(false)
  }

  function updateField(fieldId, updates) {
    setFields(fs => fs.map(f => f.id === fieldId ? { ...f, ...updates } : f))
  }

  function removeField(fieldId) {
    setFields(fs => fs.filter(f => f.id !== fieldId))
  }

  function moveField(fieldId, dir) {
    setFields(fs => {
      const idx = fs.findIndex(f => f.id === fieldId)
      if (idx < 0) return fs
      const newFs = [...fs]
      const swap = idx + dir
      if (swap < 0 || swap >= newFs.length) return fs
      ;[newFs[idx], newFs[swap]] = [newFs[swap], newFs[idx]]
      return newFs
    })
  }

  function addOption(fieldId) {
    setFields(fs => fs.map(f => f.id === fieldId ? { ...f, options: [...(f.options || []), `Option ${(f.options?.length || 0) + 1}`] } : f))
  }

  function updateOption(fieldId, idx, val) {
    setFields(fs => fs.map(f => {
      if (f.id !== fieldId) return f
      const opts = [...(f.options || [])]
      opts[idx] = val
      return { ...f, options: opts }
    }))
  }

  function removeOption(fieldId, idx) {
    setFields(fs => fs.map(f => {
      if (f.id !== fieldId) return f
      return { ...f, options: f.options.filter((_, i) => i !== idx) }
    }))
  }

  async function submit() {
    if (!title.trim()) return toast('Form title is required', 'error')
    if (fields.length === 0) return toast('Add at least one field', 'error')
    const unlabelled = fields.filter(f => !f.label.trim())
    if (unlabelled.length > 0) return toast('All fields must have a label', 'error')

    setSaving(true)
    try {
      if (isEdit) {
        // Propose edit
        await proposePendingAction(profile.org_id, profile.id, 'edit_form', 'forms', id, { title: title.trim(), description, schema: fields })
        toast('Form edit submitted for approval ⏳')
      } else {
        // Insert as draft, then propose approval
        const { data: formData, error } = await supabase.from('forms').insert({
          org_id: profile.org_id, created_by: profile.id,
          title: title.trim(), description,
          schema: fields, status: 'pending_approval',
          version: 1, active: false,
        }).select().single()
        if (error) throw error
        await proposePendingAction(profile.org_id, profile.id, 'create_form', 'forms', formData.id, { title: title.trim(), field_count: fields.length })
        toast('Form submitted for approval ⏳')
      }
      nav('/forms')
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="page fade-in">
      <ToastContainer toasts={toasts} />
      <div className="page-header">
        <button onClick={() => nav('/forms')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n500)', fontSize: 13, fontFamily: 'var(--font)', marginBottom: 10, padding: 0 }}>
          <ArrowLeft size={14} /> Back to Forms
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="page-title">{isEdit ? 'Edit Form' : 'Build New Form'}</div>
            <div className="page-subtitle">Changes require Super Admin approval</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving}>
            {saving ? <span className="spinner" /> : <><Check size={14} /> {isEdit ? 'Submit Edit' : 'Submit for Approval'}</>}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Form metadata */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Form title *</label>
              <input className="form-input" placeholder="e.g. Household Health Survey" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="What is this form for?" value={description} onChange={e => setDesc(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Fields list */}
        {fields.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fields.map((field, idx) => {
              const typeInfo = FIELD_TYPES.find(t => t.type === field.type)
              const Icon = typeInfo?.icon || Type
              const isExp = expandedId === field.id
              return (
                <div key={field.id} className="card" style={{ overflow: 'hidden', borderLeft: `3px solid var(--g600)` }}>
                  {/* Field header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpanded(isExp ? null : field.id)}>
                    <GripVertical size={16} color="var(--n300)" />
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color="var(--g700)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--n900)' }}>{field.label || <span style={{ color: 'var(--n400)', fontStyle: 'italic' }}>Unlabelled field</span>}</div>
                      <div style={{ fontSize: 11, color: 'var(--n400)' }}>{typeInfo?.label} {field.required ? '· Required' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={e => { e.stopPropagation(); moveField(field.id, -1) }} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? 'var(--n300)' : 'var(--n500)', padding: '2px 4px', display: 'flex' }}>
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); moveField(field.id, 1) }} style={{ background: 'none', border: 'none', cursor: idx === fields.length - 1 ? 'not-allowed' : 'pointer', color: idx === fields.length - 1 ? 'var(--n300)' : 'var(--n500)', padding: '2px 4px', display: 'flex' }}>
                        <ChevronDown size={14} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeField(field.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '2px 4px', display: 'flex' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Field config */}
                  {isExp && (
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--n100)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                        <div className="form-group">
                          <label className="form-label">Label *</label>
                          <input className="form-input" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} placeholder="Field label shown to officer" />
                        </div>
                        <div className="form-group" style={{ paddingTop: 2 }}>
                          <label className="form-label">Required</label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', height: 42, paddingLeft: 4 }}>
                            <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--g700)' }} />
                            <span style={{ fontSize: 13 }}>Yes</span>
                          </label>
                        </div>
                      </div>

                      {field.type === 'number' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div className="form-group"><label className="form-label">Min value</label><input className="form-input" type="number" value={field.validation?.min ?? ''} onChange={e => updateField(field.id, { validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined } })} /></div>
                          <div className="form-group"><label className="form-label">Max value</label><input className="form-input" type="number" value={field.validation?.max ?? ''} onChange={e => updateField(field.id, { validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined } })} /></div>
                        </div>
                      )}

                      {(field.type === 'select' || field.type === 'multiselect') && (
                        <div>
                          <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Options</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(field.options || []).map((opt, oi) => (
                              <div key={oi} style={{ display: 'flex', gap: 6 }}>
                                <input className="form-input" value={opt} onChange={e => updateOption(field.id, oi, e.target.value)} style={{ flex: 1 }} />
                                <button onClick={() => removeOption(field.id, oi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex', alignItems: 'center' }}>
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                            <button className="btn btn-ghost btn-sm" onClick={() => addOption(field.id)} style={{ alignSelf: 'flex-start' }}>
                              <Plus size={13} /> Add option
                            </button>
                          </div>
                        </div>
                      )}

                      {(field.type === 'gps' || field.type === 'photo' || field.type === 'signature') && (
                        <div className="info-box info-box-green" style={{ fontSize: 12 }}>
                          This field type is auto-captured on the officer's device — no additional configuration needed.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add field */}
        {showPicker ? (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--n800)', marginBottom: 12 }}>Choose field type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {FIELD_TYPES.map(({ type, icon: Icon, label }) => (
                <button key={type} onClick={() => addField(type)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1.5px solid var(--n200)', borderRadius: 'var(--r-md)', background: '#fff', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 500, color: 'var(--n700)', transition: 'all 0.13s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--g600)'; e.currentTarget.style.color = 'var(--g800)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--n200)'; e.currentTarget.style.color = 'var(--n700)' }}>
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setShowPicker(false)}>
              <X size={13} /> Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-full" onClick={() => setShowPicker(true)} style={{ gap: 8, padding: 14 }}>
            <Plus size={16} /> Add Field
          </button>
        )}

        {/* Preview summary */}
        {fields.length > 0 && (
          <div className="info-box info-box-green" style={{ fontSize: 13 }}>
            <strong>{fields.length} field{fields.length !== 1 ? 's' : ''}</strong> configured · {fields.filter(f => f.required).length} required · This form will be submitted for Super Admin approval before officers can use it.
          </div>
        )}
      </div>
    </div>
  )
}
