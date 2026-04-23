import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Clock, CheckCircle, XCircle, Edit2, Trash2, Send, User, Eye } from 'lucide-react'
import { useForms, useOrgSubmissions, useToast, writeAuditLog } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ToastContainer } from '../../components/Toast'
import { formatDistanceToNow } from 'date-fns'

const STATUS_STYLE = {
  approved:         { bg: 'var(--g50)',   color: 'var(--g800)',  icon: CheckCircle, label: 'Approved'  },
  pending_approval: { bg: '#fffbeb',      color: '#92400e',      icon: Clock,       label: 'Pending'   },
  draft:            { bg: 'var(--n100)',  color: 'var(--n600)',  icon: FileText,    label: 'Draft'     },
  rejected:         { bg: '#fef2f2',      color: 'var(--red)',   icon: XCircle,     label: 'Rejected'  },
}

const SUB_STATUS_STYLE = {
  submitted:      { bg: 'var(--g50)',  color: 'var(--g800)', label: 'Submitted'    },
  edited_pending: { bg: '#fffbeb',     color: '#92400e',     label: 'Edit Pending' },
  approved:       { bg: '#f0fdf4',     color: '#16a34a',     label: 'Approved'     },
  rejected:       { bg: '#fef2f2',     color: '#dc2626',     label: 'Rejected'     },
}

export default function FormsPage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const { forms, loading: formsLoading, refetch } = useForms()
  const { submissions, loading: subsLoading, refetch: refetchSubs } = useOrgSubmissions()
  const { toasts, toast } = useToast()

  // Main tab: 'forms' or 'submissions'
  const [mainTab,      setMainTab]      = useState('forms')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting,     setDeleting]     = useState(null)

  // Submission detail modal
  const [selectedSub,  setSelectedSub]  = useState(null)
  const [subSchema,    setSubSchema]    = useState([])   // form schema for selected submission
  const [editMode,     setEditMode]     = useState(false)
  const [editData,     setEditData]     = useState({})
  const [saving,       setSaving]       = useState(false)

  // Open a submission — fetch its form schema on demand
  async function openSub(sub) {
    setSelectedSub(sub)
    setEditData({ ...(sub.data || {}) })
    setEditMode(false)
    setSubSchema([])
    // Fetch form schema
    const { data: formData } = await supabase
      .from('forms').select('schema').eq('id', sub.form_id).single()
    setSubSchema(formData?.schema || [])
  }

  function closeSub() { setSelectedSub(null); setEditMode(false); setSubSchema([]) }

  // Approve directly
  async function approveSub() {
    if (!selectedSub) return
    setSaving(true)
    try {
      const { error } = await supabase.from('form_submissions').update({
        status:      'approved',
        approved_by: profile.id,
      }).eq('id', selectedSub.id)
      if (error) throw error
      toast('Submission approved ✓')
      closeSub()
      refetchSubs()
    } catch (err) { toast(err.message, 'error') } finally { setSaving(false) }
  }

  // Reject directly
  async function rejectSub() {
    if (!selectedSub) return
    if (!window.confirm('Reject this submission?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('form_submissions').update({
        status: 'rejected',
      }).eq('id', selectedSub.id)
      if (error) throw error
      toast('Submission rejected')
      closeSub()
      refetchSubs()
    } catch (err) { toast(err.message, 'error') } finally { setSaving(false) }
  }

  // Save edit directly
  async function saveEdit() {
    if (!selectedSub) return
    setSaving(true)
    try {
      const { error } = await supabase.from('form_submissions').update({
        data:      editData,
        status:    'submitted',
        edited_by: profile.id,
      }).eq('id', selectedSub.id)
      if (error) throw error
      toast('Submission updated ✓')
      setEditMode(false)
      setSelectedSub(prev => ({ ...prev, data: editData, status: 'submitted' }))
      refetchSubs()
    } catch (err) { toast(err.message, 'error') } finally { setSaving(false) }
  }

  // ── Forms tab ──────────────────────────────────────────────────────
  const filtered = statusFilter === 'all' ? forms : forms.filter(f => f.status === statusFilter)

  const statusCounts = {
    all:              forms.length,
    approved:         forms.filter(f => f.status === 'approved').length,
    pending_approval: forms.filter(f => f.status === 'pending_approval').length,
    draft:            forms.filter(f => f.status === 'draft').length,
    rejected:         forms.filter(f => f.status === 'rejected').length,
  }

  async function deleteForm(form, e) {
    e.stopPropagation()
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return
    setDeleting(form.id)
    try {
      const { error } = await supabase.from('forms').delete().eq('id', form.id)
      if (error) throw error
      await writeAuditLog(profile.id, profile.role, 'form_deleted', 'forms', form.id, { title: form.title }, profile.org_id)
      toast('Form deleted')
      refetch()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="page fade-in">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div className="page-title">Data Collection Forms</div>
          <div className="page-subtitle">
            {forms.length} form{forms.length !== 1 ? "s" : ""} ·{" "}
            {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => nav("/forms/new")}
        >
          <Plus size={14} /> Build Form
        </button>
      </div>

      <div className="page-body">
        {/* Main tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--n100)",
            borderRadius: 10,
            padding: 4,
            marginBottom: 16,
          }}
        >
          {[
            { key: "forms", label: "Form Templates", count: forms.length },
            {
              key: "submissions",
              label: "Submitted Forms",
              count: submissions.length,
            },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font)",
                fontWeight: 700,
                fontSize: 13,
                background: mainTab === key ? "#fff" : "transparent",
                color: mainTab === key ? "var(--n900)" : "var(--n500)",
                boxShadow:
                  mainTab === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {label}
              <span
                style={{
                  background: mainTab === key ? "var(--g600)" : "var(--n300)",
                  color: mainTab === key ? "#fff" : "var(--n600)",
                  borderRadius: 99,
                  padding: "1px 7px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── FORMS TAB ── */}
        {mainTab === "forms" && (
          <>
            <div className="info-box info-box-blue" style={{ fontSize: 13 }}>
              Approved forms are available to field officers. Drafts and pending
              forms are only visible to supervisors and admins.
            </div>

            {/* Status filter tabs */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { key: "all", label: "All" },
                { key: "approved", label: "Approved" },
                { key: "pending_approval", label: "Pending" },
                { key: "draft", label: "Draft" },
                { key: "rejected", label: "Rejected" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`btn btn-sm ${statusFilter === key ? "btn-primary" : "btn-ghost"}`}
                >
                  {label}
                  {statusCounts[key] > 0 && (
                    <span
                      style={{
                        marginLeft: 5,
                        background:
                          statusFilter === key
                            ? "rgba(255,255,255,0.25)"
                            : "var(--n200)",
                        borderRadius: 99,
                        padding: "1px 6px",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {statusCounts[key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {formsLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div
                  className="spinner spinner-dark"
                  style={{ width: 28, height: 28, margin: "0 auto" }}
                />
              </div>
            ) : filtered.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <FileText size={40} className="empty-icon" />
                  <div className="empty-title">
                    No{" "}
                    {statusFilter === "all"
                      ? ""
                      : statusFilter.replace("_", " ")}{" "}
                    forms
                  </div>
                  <div className="empty-body">
                    {statusFilter === "all"
                      ? "Build your first data collection form to get started"
                      : `No forms with status "${statusFilter.replace("_", " ")}"`}
                  </div>
                  {statusFilter === "all" && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: 8 }}
                      onClick={() => nav("/forms/new")}
                    >
                      <Plus size={14} /> Build Form
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {filtered.map((form) => {
                  const st = STATUS_STYLE[form.status] || STATUS_STYLE.draft;
                  const Icon = st.icon;
                  const fieldCount = Array.isArray(form.schema)
                    ? form.schema.length
                    : 0;
                  return (
                    <div
                      key={form.id}
                      className="card"
                      style={{
                        padding: "16px 18px",
                        cursor: "pointer",
                        borderLeft: `4px solid ${st.color}`,
                        transition: "background 0.13s",
                      }}
                      onClick={() => nav(`/forms/${form.id}`)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--n50)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 14,
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: st.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={22} color={st.color} />
                        </div>

                        {/* Main content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 15,
                                color: "var(--n900)",
                              }}
                            >
                              {form.title}
                            </div>
                            {/* Status pill */}
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 9px",
                                borderRadius: 99,
                                background: st.bg,
                                color: st.color,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {st.label}
                            </span>
                          </div>

                          {form.description && (
                            <div
                              style={{
                                fontSize: 13,
                                color: "var(--n500)",
                                marginTop: 3,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {form.description}
                            </div>
                          )}

                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              marginTop: 5,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{ fontSize: 12, color: "var(--n400)" }}
                            >
                              {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                            </span>
                            <span
                              style={{ fontSize: 12, color: "var(--n400)" }}
                            >
                              v{form.version}
                            </span>
                            <span
                              style={{ fontSize: 12, color: "var(--n400)" }}
                            >
                              {formatDistanceToNow(new Date(form.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                            {form.profiles?.full_name && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "var(--n400)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                <User size={10} /> {form.profiles.full_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div
                          style={{ display: "flex", gap: 4, flexShrink: 0 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            title="Edit form"
                            onClick={(e) => {
                              e.stopPropagation();
                              nav(`/forms/${form.id}/edit`);
                            }}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "5px 8px", color: "var(--n500)" }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            title="Delete form"
                            onClick={(e) => deleteForm(form, e)}
                            className="btn btn-ghost btn-sm"
                            disabled={deleting === form.id}
                            style={{ padding: "5px 8px", color: "var(--red)" }}
                          >
                            {deleting === form.id ? (
                              <span
                                className="spinner"
                                style={{ width: 12, height: 12 }}
                              />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── SUBMISSIONS TAB ── */}
        {mainTab === "submissions" && (
          <>
            <div className="info-box info-box-blue" style={{ fontSize: 13 }}>
              All form submissions from officers across your organisation. Click
              any row to view the full response.
            </div>

            {subsLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div
                  className="spinner spinner-dark"
                  style={{ width: 28, height: 28, margin: "0 auto" }}
                />
              </div>
            ) : submissions.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <Send size={40} className="empty-icon" />
                  <div className="empty-title">No submissions yet</div>
                  <div className="empty-body">
                    Once officers submit forms, they will appear here
                  </div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ overflow: "hidden" }}>
                {submissions.map((sub, i) => {
                  const st =
                    SUB_STATUS_STYLE[sub.status] || SUB_STATUS_STYLE.submitted;
                  return (
                    <div
                      key={sub.id}
                      onClick={() => openSub(sub)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "13px 16px",
                        borderBottom:
                          i < submissions.length - 1
                            ? "1px solid var(--n100)"
                            : "none",
                        cursor: "pointer",
                        transition: "background 0.13s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--n50)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: "#eff6ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Send size={17} color="#3b82f6" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: "var(--n900)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sub.forms?.title ||
                            sub.form_title ||
                            "Untitled Form"}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--n500)",
                            marginTop: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <User size={11} /> {sub.profiles?.full_name || "—"}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(sub.submitted_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: st.bg,
                          color: st.color,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {st.label}
                      </span>
                      <Eye size={14} color="var(--n300)" />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      {/* </div> */}
      {/* ── SUBMISSION DETAIL MODAL ── */}
      {selectedSub && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSub();
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflow: "auto",
              padding: 0,
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 20px 14px",
                borderBottom: "1px solid var(--n200)",
                background: "#fff",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      color: "var(--n900)",
                    }}
                  >
                    {selectedSub.forms?.title ||
                      selectedSub.form_title ||
                      "Form Submission"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--n500)",
                      marginTop: 5,
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <User size={11} />{" "}
                      {selectedSub.profiles?.full_name || "—"}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(selectedSub.submitted_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {selectedSub.lat && (
                      <a
                        href={`https://maps.google.com/?q=${selectedSub.lat},${selectedSub.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#3b82f6",
                          fontSize: 11,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        📍 View on map
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={closeSub}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--n400)",
                    display: "flex",
                    padding: 4,
                  }}
                >
                  ×
                </button>
              </div>
              {/* Status */}
              <div style={{ marginTop: 10 }}>
                {(() => {
                  const st =
                    SUB_STATUS_STYLE[selectedSub.status] ||
                    SUB_STATUS_STYLE.submitted;
                  return (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "3px 12px",
                        borderRadius: 99,
                        fontWeight: 700,
                        background: st.bg,
                        color: st.color,
                      }}
                    >
                      {st.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Form fields */}
            <div style={{ padding: "16px 20px" }}>
              {subSchema.length > 0 ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {subSchema.map((field) => (
                    <div
                      key={field.id}
                      style={{
                        background: "var(--n50)",
                        borderRadius: 10,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--n500)",
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {field.label}
                        {field.required ? " *" : ""}
                      </div>
                      {editMode ? (
                        field.type === "select" ? (
                          <select
                            className="form-select"
                            value={editData[field.id] || ""}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                [field.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select…</option>
                            {(field.options || []).map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "textarea" ? (
                          <textarea
                            className="form-textarea"
                            rows={3}
                            value={editData[field.id] || ""}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                [field.id]: e.target.value,
                              }))
                            }
                          />
                        ) : field.type === "gps" ||
                          field.type === "photo" ||
                          field.type === "signature" ? (
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--n400)",
                              fontStyle: "italic",
                            }}
                          >
                            Cannot edit {field.type} field
                          </div>
                        ) : (
                          <input
                            className="form-input"
                            value={editData[field.id] || ""}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                [field.id]: e.target.value,
                              }))
                            }
                          />
                        )
                      ) : (
                        <div
                          style={{
                            fontSize: 14,
                            color:
                              editData[field.id] !== undefined &&
                              editData[field.id] !== ""
                                ? "var(--n900)"
                                : "var(--n400)",
                            fontStyle:
                              editData[field.id] !== undefined &&
                              editData[field.id] !== ""
                                ? "normal"
                                : "italic",
                            fontWeight: 500,
                          }}
                        >
                          {editData[field.id] !== undefined &&
                          editData[field.id] !== ""
                            ? String(editData[field.id])
                            : "— not filled"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : Object.keys(selectedSub.data || {}).length > 0 ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {Object.entries(selectedSub.data || {}).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        style={{
                          background: "var(--n50)",
                          borderRadius: 10,
                          padding: "10px 14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--n500)",
                            marginBottom: 4,
                            textTransform: "capitalize",
                          }}
                        >
                          {key.replace(/_/g, " ")}
                        </div>
                        {editMode ? (
                          <input
                            className="form-input"
                            value={editData[key] || ""}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <div style={{ fontSize: 14, color: "var(--n800)" }}>
                            {value === null ||
                            value === undefined ||
                            value === "" ? (
                              <span
                                style={{
                                  color: "var(--n400)",
                                  fontStyle: "italic",
                                }}
                              >
                                —
                              </span>
                            ) : typeof value === "object" ? (
                              JSON.stringify(value)
                            ) : (
                              String(value)
                            )}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--n400)",
                    padding: "20px 0",
                    fontSize: 13,
                  }}
                >
                  No data recorded
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--n200)",
                background: "#fff",
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                position: "sticky",
                bottom: 0,
              }}
            >
              {editMode ? (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={saveEdit}
                    disabled={saving}
                    style={{ gap: 6 }}
                  >
                    {saving ? <span className="spinner" /> : "Save Changes"}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditMode(false);
                      setEditData({ ...(selectedSub.data || {}) });
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {selectedSub.status !== "approved" && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={approveSub}
                      disabled={saving}
                      style={{ gap: 6 }}
                    >
                      {saving ? <span className="spinner" /> : "✓ Approve"}
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditMode(true)}
                    style={{ gap: 6 }}
                  >
                    Edit
                  </button>
                  {selectedSub.status !== "rejected" && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={rejectSub}
                      disabled={saving}
                      style={{ gap: 6, color: "var(--red)" }}
                    >
                      Reject
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => nav(`/forms/${selectedSub.form_id}`)}
                    style={{ marginLeft: "auto" }}
                  >
                    View all for this form →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
