import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users, ClipboardCheck, TrendingUp, ChevronRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePlatformStats, usePendingActions, useOrganisations, usePresence } from '../../hooks/useData'
import { format, formatDistanceToNow } from 'date-fns'

export default function AdminDashboard() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const { stats }   = usePlatformStats()
  const { actions } = usePendingActions()
  const { orgs }    = useOrganisations()
  const { users }   = usePresence()
  const onlineCount = users.filter(u => u.is_online).length

  const firstName = profile?.full_name?.split(' ')[1] || 'Admin'
  const greeting  = (() => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening' })()

  return (
    <div className="page fade-in">
      <div style={{ padding: "24px 24px 0" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--n900)",
              letterSpacing: "-0.3px",
            }}
          >
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ fontSize: 13, color: "var(--n500)", marginTop: 3 }}>
            {format(new Date(), "EEEE, d MMMM yyyy")} · Super Administrator
          </p>
        </div>

        {/* Metric cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "ORGANISATIONS",
              value: stats?.totalOrgs ?? "—",
              sub: "Active",
              color: "var(--g600)",
              icon: Building2,
            },
            {
              label: "TOTAL USERS",
              value: stats?.totalUsers ?? "—",
              sub: `${onlineCount} online`,
              color: "#3b82f6",
              icon: Users,
            },
            {
              label: "SUBMISSIONS TODAY",
              value: stats?.submissionsToday ?? "—",
              sub: "All orgs",
              color: "var(--info)",
              icon: TrendingUp,
            },
            {
              label: "PENDING",
              value: stats?.pendingCount ?? "—",
              sub: "Awaiting approval",
              color: stats?.pendingCount > 0 ? "var(--amber)" : "var(--g600)",
              icon: ClipboardCheck,
            },
          ].map(({ label, value, sub, color, icon: Icon }) => (
            <div
              key={label}
              className="metric"
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="metric-label">{label}</div>
                <Icon size={16} color={color} />
              </div>
              <div className="metric-value" style={{ color }}>
                {value}
              </div>
              <div className="metric-sub">{sub}</div>
            </div>
          ))}
        </div>

        {/* Pending approvals */}
        {actions.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div className="section-label">Pending approvals</div>
              <button
                onClick={() => nav("/approvals")}
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
                Review all →
              </button>
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              {actions.slice(0, 5).map((a, i) => (
                <div
                  key={a.id}
                  onClick={() => nav("/approvals")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    borderBottom:
                      i < Math.min(4, actions.length - 1)
                        ? "1px solid var(--n100)"
                        : "none",
                    cursor: "pointer",
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
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: "#fffbeb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AlertCircle size={16} color="var(--amber)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--n900)",
                        textTransform: "capitalize",
                      }}
                    >
                      {a.action_type?.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--n500)" }}>
                      by {a.profiles?.full_name} · {a.organisations?.name}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--n400)" }}>
                    {formatDistanceToNow(new Date(a.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                  <ChevronRight size={14} color="var(--n300)" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organisations */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div className="section-label">Organisations</div>
            <button
              onClick={() => nav("/organisations")}
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
          <div className="card" style={{ overflow: "hidden" }}>
            {orgs.length === 0 ? (
              <div className="empty-state">
                <Building2 size={36} className="empty-icon" />
                <div className="empty-title">No organisations</div>
              </div>
            ) : (
              orgs.slice(0, 6).map((o, i) => (
                <div
                  key={o.id}
                  onClick={() => nav(`/organisations/${o.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    borderBottom:
                      i < Math.min(5, orgs.length - 1)
                        ? "1px solid var(--n100)"
                        : "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--n50)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#fff")
                  }
                >
                  <div
                    className="avatar"
                    style={{
                      width: 38,
                      height: 38,
                      fontSize: 13,
                      background: "var(--g50)",
                      color: "var(--g800)",
                    }}
                  >
                    {o.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--n900)",
                      }}
                    >
                      {o.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--n500)" }}>
                      {o.country}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 99,
                      background:
                        o.status === "active" ? "var(--g50)" : "#fef2f2",
                      color:
                        o.status === "active" ? "var(--g800)" : "var(--red)",
                      fontWeight: 600,
                    }}
                  >
                    {o.status || "active"}
                  </span>
                  <ChevronRight size={14} color="var(--n300)" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Online users */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div className="section-label">Online now ({onlineCount})</div>
            <button
              onClick={() => nav("/presence")}
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
              View all →
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {users
              .filter((u) => u.is_online)
              .slice(0, 12)
              .map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    background: "#fff",
                    border: "1px solid var(--n200)",
                    borderRadius: 99,
                    padding: "5px 12px 5px 7px",
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#4ade80",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--n800)",
                    }}
                  >
                    {u.full_name}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--n400)" }}>
                    · {u.role?.replace("_", " ")}
                  </span>
                </div>
              ))}

            {onlineCount === 0 && (
              <div style={{ fontSize: 13, color: "var(--n400)" }}>
                No users online
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
