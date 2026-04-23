import React, { useState, useMemo } from "react";
import { Radio, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { usePresence } from "../../hooks/useData";

const ROLE_STYLE = {
  super_admin: { bg: "#fef2f2", color: "#f06f0c", label: "Super Admin" },
  supervisor: { bg: "#eff6ff", color: "#1e40af", label: "Supervisor" },
  officer: { bg: "var(--g50)", color: "var(--g800)", label: "Officer" },
};

export default function PresencePage() {
  const { user } = useAuth();
  const { users, loading } = usePresence();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ===== Calculate counts =====
  const { totalUsers, onlineNow, offlineNow, roleCounts } = useMemo(() => {
    const counts = {
      super_admin: { total: 0, online: 0 },
      supervisor: { total: 0, online: 0 },
      officer: { total: 0, online: 0 },
    };

    let online = 0;
    users.forEach((u) => {
      const roleKey = u.role;
      counts[roleKey].total += 1;
      if (u.is_online) {
        counts[roleKey].online += 1;
        online += 1;
      }
    });

    return {
      totalUsers: users.length,
      onlineNow: online,
      offlineNow: users.length - online,
      roleCounts: counts,
    };
  }, [users]);

  // ===== Filter users =====
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.organisationName || "").toLowerCase().includes(search.toLowerCase());

      const matchRole = roleFilter === "all" || u.role === roleFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "online" ? u.is_online : !u.is_online);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div className="page-title">Presence</div>
        <div className="page-subtitle">
          Real-time online/offline status · All users
        </div>
      </div>

      <div className="page-body">
        {/* Summary metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {[
            { label: "Total Users", value: totalUsers, color: "var(--n700)" },
            { label: "Online Now", value: onlineNow, color: "var(--g600)" },
            { label: "Offline", value: offlineNow, color: "var(--n400)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="metric" style={{ padding: 14 }}>
              <div className="metric-label">{label}</div>
              <div className="metric-value" style={{ color, fontSize: 22 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Role breakdown */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginTop: 12,
          }}
        >
          {["super_admin", "supervisor", "officer"].map((roleKey) => {
            const roleMeta = ROLE_STYLE[roleKey];
            const roleData = roleCounts[roleKey];
            return (
              <div
                key={roleKey}
                style={{
                  background: roleMeta.bg,
                  borderRadius: 12,
                  padding: "10px 14px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: roleMeta.color,
                  }}
                >
                  {roleData.total} ({roleData.online} online)
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: roleMeta.color,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {roleMeta.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div
          style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 13,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--n400)",
              }}
            />
            <input
              className="form-input"
              placeholder="Search name or organisation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>

          <select
            className="form-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: 160 }}
          >
            <option value="all">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="supervisor">Supervisor</option>
            <option value="officer">Officer</option>
          </select>

          <div style={{ display: "flex", gap: 6 }}>
            {["all", "online", "offline"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-ghost"}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* User list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div
              className="spinner spinner-dark"
              style={{ width: 28, height: 28, margin: "0 auto" }}
            />
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden", marginTop: 16 }}>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <Radio size={36} className="empty-icon" />
                <div className="empty-title">No users match</div>
              </div>
            ) : (
              filtered.map((u, i) => {
                const roleMeta = ROLE_STYLE[u.role];
                return (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom:
                        i < filtered.length - 1
                          ? "1px solid var(--n100)"
                          : "none",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <div
                        className="avatar"
                        style={{ width: 40, height: 40, fontSize: 13 }}
                      >
                        {u.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          width: 11,
                          height: 11,
                          borderRadius: "50%",
                          background: u.is_online ? "#4ade80" : "var(--n300)",
                          border: "2px solid #fff",
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "var(--n900)",
                        }}
                      >
                        {u.full_name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--n500)" }}>
                        {u.role === "super_admin"
                          ? "Platform Admin"
                          : u.organisationName}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 99,
                          fontWeight: 600,
                          background: roleMeta.bg,
                          color: roleMeta.color,
                        }}
                      >
                        {roleMeta.label}
                      </span>
                      <div
                        style={{
                          fontSize: 11,
                          color: u.is_online ? "var(--g600)" : "var(--n400)",
                          marginTop: 4,
                        }}
                      >
                        {u.is_online
                          ? "● Online now"
                          : u.last_seen_at
                            ? `Last seen ${formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true })}`
                            : "Never logged in"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
