import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AlertTriangle, Clock, Activity, Trash2, ChevronDown, ChevronUp, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDashboardStats, useWeeklyData, useOfficers, useNotifications, useForms, useOrgSubmissions, getOfficerStatus } from '../../hooks/useData'
import { supabase } from '../../lib/supabase'
import { formatDistanceToNow, format } from 'date-fns'

export default function DashboardPage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const { stats, loading: statsLoading } = useDashboardStats()
  const { data: weeklyData }  = useWeeklyData()
  const { officers }          = useOfficers()
  const { notifications }     = useNotifications()
  const { forms }             = useForms()
  const { submissions, refetch: refetchSubmissions } = useOrgSubmissions()

  const [deletingId, setDeletingId]         = useState(null)
  const [deleteExpanded, setDeleteExpanded] = useState(false)
  const [deleteError, setDeleteError]       = useState(null)

  // Accurate active count from stats (uses profiles.is_online + last_seen_at heartbeat)
  const activeOfficers = stats?.activeOfficers ?? officers.filter(o => getOfficerStatus(o) === 'active').length
  const unreadAlerts   = notifications.filter(n => !n.read).length

  const formDrafts    = forms.filter(f => f.status === 'draft').length
  const formPending   = forms.filter(f => f.status === 'pending_approval').length
  const formApproved  = forms.filter(f => f.status === 'approved').length
  const formRejected  = forms.filter(f => f.status === 'rejected').length

  const firstName = profile?.full_name?.split(' ')[1] || 'Supervisor'
  const greeting  = (() => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening' })()

  const handleDeleteSubmission = async (subId) => {
    if (!window.confirm('Delete this submitted form record? This cannot be undone.')) return
    setDeletingId(subId)
    setDeleteError(null)
    const { error } = await supabase.from('form_submissions').delete().eq('id', subId)
    if (error) { setDeleteError('Failed to delete. Please try again.') }
    else { await refetchSubmissions() }
    setDeletingId(null)
  }

  if (statsLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
    </div>
  )


  return (
    <div className="page fade-in">
      <div style={{ padding: "20px 20px 0" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 22 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--n900)",
              letterSpacing: "-0.3px",
            }}
          >
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ fontSize: 13, color: "var(--n500)", marginTop: 3 }}>
            {format(new Date(), "EEEE, d MMMM yyyy")} ·{" "}
            {profile?.organisations?.name}
          </p>
        </div>

        {/* Metric cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            className="metric"
            style={{ borderLeft: "4px solid var(--g600)" }}
          >
            <div className="metric-label">FORM SUBMISSIONS TODAY</div>
            <div className="metric-value" style={{ color: "var(--g800)" }}>
              {submissions.length === 0
                ? "No submitted forms"
                : `${submissions.length}`}
            </div>
            {/* <div className="metric-sub">Target: {totalTarget}</div> */}
            {/* <div className="prog-track" style={{ marginTop: 10 }}>
              <div className="prog-fill" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 80 ? 'var(--g600)' : pct >= 50 ? 'var(--amber)' : 'var(--red)' }} />
            </div> */}
            {/* <div style={{ fontSize: 11, color: 'var(--n400)', marginTop: 4 }}>{pct}% of daily target</div> */}
          </div>

          <div className="metric" style={{ borderLeft: "4px solid #3b82f6" }}>
            <div className="metric-label">OFFICERS</div>
            <div className="metric-value">
              {activeOfficers}
              <span
                style={{ fontSize: 14, fontWeight: 400, color: "var(--n400)" }}
              >
                {" "}
                / {stats?.totalOfficers ?? 0}
              </span>
            </div>
            <div className="metric-sub">Active in last hour</div>
            {/* <div className="page-subtitle">
              {officers.length} registered · {activeCount} online now ·{" "}
              {inactiveCount} recently active
            </div> */}
          </div>

          <div
            className="metric"
            style={{
              borderLeft: `4px solid ${unreadAlerts > 0 ? "var(--red)" : "var(--g600)"}`,
            }}
          >
            <div className="metric-label">ALERTS</div>
            <div
              className="metric-value"
              style={{ color: unreadAlerts > 0 ? "var(--red)" : "var(--g600)" }}
            >
              {unreadAlerts}
            </div>
            <div className="metric-sub">Unread notifications</div>
          </div>
        </div>

        {/* Forms summary */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div className="section-label">Forms</div>
            <button
              onClick={() => nav("/forms")}
              style={{
                background: "none",
                border: "none",
                color: "var(--g700)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font)",
                fontWeight: 700,
              }}
            >
              Manage →
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}
          >
            {[
              {
                label: "Draft",
                value: formDrafts,
                color: "var(--n500)",
                bg: "var(--n50)",
              },
              {
                label: "Pending",
                value: formPending,
                color: "var(--amber)",
                bg: "#fffbeb",
              },
              {
                label: "Approved",
                value: formApproved,
                color: "var(--g700)",
                bg: "var(--g50)",
              },
              {
                label: "Rejected",
                value: formRejected,
                color: "var(--red)",
                bg: "#fef2f2",
              },
            ].map(({ label, value, color, bg }) => (
              <div
                key={label}
                onClick={() => nav("/forms")}
                style={{
                  background: bg,
                  borderRadius: 12,
                  padding: "12px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color }}>
                  {value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--n500)",
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delete Submitted Forms card */}
        <div style={{ marginBottom: 20 }}>
          <div
            onClick={() => setDeleteExpanded((e) => !e)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fff",
              borderRadius: deleteExpanded ? "12px 12px 0 0" : 12,
              padding: "14px 16px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.07)",
              cursor: "pointer",
              border: "1px solid var(--n200)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Send size={16} color="var(--red)" />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--n800)",
                  }}
                >
                  Delete Submitted Forms
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--n400)", marginTop: 1 }}
                >
                  {submissions.length === 0
                    ? "No submitted forms"
                    : `${submissions.length} submission${submissions.length !== 1 ? "s" : ""} from all officers`}
                </div>
              </div>
            </div>
            {deleteExpanded ? (
              <ChevronUp size={16} color="var(--n400)" />
            ) : (
              <ChevronDown size={16} color="var(--n400)" />
            )}
          </div>

          {deleteExpanded && (
            <div
              style={{
                background: "#fff",
                borderRadius: "0 0 12px 12px",
                padding: "4px 16px 12px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.06)",
                border: "1px solid var(--n200)",
                borderTop: "none",
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {deleteError && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--red)",
                    padding: "6px 0 4px",
                  }}
                >
                  {deleteError}
                </div>
              )}
              {submissions.length === 0 ? (
                <div
                  style={{
                    padding: "16px 0",
                    textAlign: "center",
                    color: "var(--n400)",
                    fontSize: 13,
                  }}
                >
                  No submitted forms to delete
                </div>
              ) : (
                submissions.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom:
                        i < submissions.length - 1
                          ? "1px solid var(--n100)"
                          : "none",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--n800)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.forms?.title || "Untitled Form"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--n400)",
                          marginTop: 2,
                        }}
                      >
                        {s.profiles?.full_name || "Unknown officer"}
                        {" · "}
                        {formatDistanceToNow(new Date(s.submitted_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                    <button
                      disabled={deletingId === s.id}
                      onClick={() => handleDeleteSubmission(s.id)}
                      style={{
                        marginLeft: 12,
                        flexShrink: 0,
                        background:
                          deletingId === s.id ? "var(--n100)" : "#fef2f2",
                        border: "1px solid var(--red)",
                        borderRadius: 8,
                        padding: "5px 10px",
                        color: "var(--red)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: deletingId === s.id ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontFamily: "var(--font)",
                      }}
                    >
                      <Trash2 size={12} />
                      {deletingId === s.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
       
        {/* Weekly chart */}
        {submissions.length > 0 && (
          <div className="card" style={{ padding: "16px", marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--n800)",
                  }}
                >
                  Weekly Form Submissions
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--n400)", marginTop: 2 }}
                >
                  Last 7 days
                </div>
              </div>
              <Activity size={18} color="var(--g600)" />
            </div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barSize={28}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--n400)",
                      fontFamily: "var(--font)",
                    }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid var(--n200)",
                      fontSize: 12,
                      fontFamily: "var(--font)",
                    }}
                    cursor={{ fill: "rgba(0,0,0,0.03)" }}
                  />
                  <Bar
                    dataKey="submissions"
                    radius={[5, 5, 0, 0]}
                    name="Submissions"
                  >
                    {weeklyData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.submissions > 0 ? "var(--g600)" : "var(--n200)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent alerts */}
        {notifications.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div className="section-label">Recent alerts</div>
              <button
                onClick={() => nav("/notifications")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--g700)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                  fontWeight: 600,
                }}
              >
                View all →
              </button>
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              {notifications.slice(0, 3).map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: i < 2 ? "1px solid var(--n100)" : "none",
                    background: !n.read ? "rgba(10,92,71,0.02)" : "#fff",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background:
                        n.type === "alert"
                          ? "#fef2f2"
                          : n.type === "warning"
                            ? "#fffbeb"
                            : "var(--g50)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle
                      size={14}
                      color={
                        n.type === "alert"
                          ? "var(--red)"
                          : n.type === "warning"
                            ? "var(--amber)"
                            : "var(--g600)"
                      }
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--n700)",
                        fontWeight: n.read ? 400 : 600,
                        lineHeight: 1.4,
                      }}
                    >
                      {n.message}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--n400)",
                        marginTop: 3,
                      }}
                    >
                      <Clock
                        size={10}
                        style={{ verticalAlign: "middle", marginRight: 3 }}
                      />
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                  {!n.read && (
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "var(--g600)",
                        flexShrink: 0,
                        marginTop: 6,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
