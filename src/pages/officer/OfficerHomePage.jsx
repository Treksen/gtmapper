import React, { useState, useEffect, useRef, useCallback } from "react";
import { Wifi, WifiOff, Send, Trash2, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAnnouncements, useMySubmissions } from "../../hooks/useData";
import { supabase } from "../../lib/supabase";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { openDB } from "idb";

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
const DB_NAME = "form-collect-db";

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("drafts"))
        db.createObjectStore("drafts", { keyPath: "id" });
      if (!db.objectStoreNames.contains("finalized"))
        db.createObjectStore("finalized", { keyPath: "id" });
      if (!db.objectStoreNames.contains("sent"))
        db.createObjectStore("sent", { keyPath: "id" });
    },
  });
}

async function getLocalForms() {
  const db = await getDB();
  return {
    drafts:    await db.getAll("drafts"),
    finalized: await db.getAll("finalized"),
  };
}

async function deleteDraftFromDB(id, type = "drafts") {
  const db = await getDB();
  await db.delete(type, id);
}

async function markDraftSynced(draft) {
  const db = await getDB();
  await db.put("sent", { ...draft, status: "sent" });
  await db.delete("drafts", draft.id);
}

// ── BroadcastChannel key for cross-tab sync ───────────────────────────────────
const BC_CHANNEL = "gtmapper-idb-sync";

// ── Officer Home Page ─────────────────────────────────────────────────────────
export default function OfficerHomePage() {
  const { profile, user } = useAuth();
  const { announcements } = useAnnouncements();
  // Supabase is the source of truth for "Sent" forms — works across ALL sessions/devices
  const { submissions: supabaseSubmissions, refetch: refetchSubmissions } = useMySubmissions();
  const navigate = useNavigate();

  const [drafts,       setDrafts]       = useState([]);
  const [finalized,    setFinalized]    = useState([]);
  const [isOnline,     setIsOnline]     = useState(navigator.onLine);
  const [syncing,      setSyncing]      = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  const bcRef = useRef(null);

  // ── Load local IndexedDB (drafts + finalized only) ────────────────────────
  const loadLocalForms = useCallback(async () => {
    const { drafts, finalized } = await getLocalForms();
    setDrafts(drafts);
    setFinalized(finalized);
  }, []);

  useEffect(() => { loadLocalForms(); }, [loadLocalForms]);

  // ── BroadcastChannel: sync IndexedDB counts across same-browser tabs ──────
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    bcRef.current = new BroadcastChannel(BC_CHANNEL);
    bcRef.current.onmessage = (e) => {
      if (e.data === "idb-updated") {
        loadLocalForms(); // another tab changed IndexedDB — reload our counts
      }
    };
    return () => {
      bcRef.current?.close();
      bcRef.current = null;
    };
  }, [loadLocalForms]);

  // ── Online/offline detection + auto-refresh ───────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refetchSubmissions();
      loadLocalForms();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadLocalForms, refetchSubmissions]);

  // ── Greeting ──────────────────────────────────────────────────────────────
  const firstName = profile?.full_name?.split(" ")[1] || "there";
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  })();

  // ── Sync pending local forms to Supabase ─────────────────────────────────
  const syncAll = async () => {
    if (!isOnline) return;
    setSyncing(true);

    const allToSync = [...drafts, ...finalized];
    let anySuccess = false;
    for (const form of allToSync) {
      try {
        const { error } = await supabase.from("form_submissions").insert({
          form_id:      form.form_id,
          org_id:       profile.org_id,
          officer_id:   profile.id,
          data:         form.data,
          lat:          form.gps?.lat,
          lng:          form.gps?.lng,
          status:       "submitted",
          submitted_at: form.created_at || new Date().toISOString(),
        });
        if (error) throw error;
        await markDraftSynced(form);
        anySuccess = true;
      } catch (err) {
        console.error("Sync error:", err);
      }
    }

    await loadLocalForms();
    await refetchSubmissions();
    // Notify other tabs that IndexedDB changed
    if (anySuccess) bcRef.current?.postMessage("idb-updated");
    setSyncing(false);
  };

  // ── Delete a local draft/finalized ───────────────────────────────────────
  const handleDelete = async (e, id, type) => {
    e.stopPropagation();
    await deleteDraftFromDB(id, type);
    await loadLocalForms();
    bcRef.current?.postMessage("idb-updated");
  };

  // ── Render a single form row ──────────────────────────────────────────────
  const renderItem = (f, type) => {
    const isDraft = type === "drafts";
    const title   = f.form_title || f.forms?.title || "Untitled Form";
    const ts      = f.created_at || f.submitted_at;

    return (
      <div
        key={f.id}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 12px", marginBottom: 8,
          background: "#f9f9f9", borderRadius: 6,
          cursor: isDraft ? "pointer" : "default",
          borderLeft: isDraft ? "3px solid #3b82f6" : type === "finalized" ? "3px solid #f59e0b" : "3px solid #4ade80",
        }}
        onClick={() => {
          if (isDraft) navigate("/collect", { state: { resumeDraft: f } });
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
            {ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : "Just now"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: isDraft ? "#f59e0b" : type === "finalized" ? "#f97316" : "#4ade80"
            }}>
              {(f.status || type).toUpperCase()}
            </span>
            {isDraft && (
              <span style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600, background: "#eff6ff", borderRadius: 4, padding: "1px 5px" }}>
                Tap to edit
              </span>
            )}
          </div>
        </div>
        {/* Delete only for local items */}
        {(isDraft || type === "finalized") && (
          <button
            onClick={(e) => handleDelete(e, f.id, type)}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#f43f5e", padding: "4px", marginLeft: 6, flexShrink: 0 }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  };

  const renderList = (list, type) => {
    if (list.length === 0)
      return <div style={{ padding: 12, textAlign: "center", color: "#888", fontSize: 13 }}>No forms</div>;
    return list.map(f => renderItem(f, type));
  };

  // "Sent" uses Supabase data — consistent across ALL sessions and devices
  const sentForms = supabaseSubmissions;

  const cards = [
    { label: "Drafts",    count: drafts.length,     forms: drafts,     type: "drafts",    showSync: true  },
    { label: "Finalized", count: finalized.length,  forms: finalized,  type: "finalized", showSync: true  },
    { label: "Sent",      count: sentForms.length,  forms: sentForms,  type: "sent",      showSync: false },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Date & Greeting */}
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>
        {format(new Date(), "EEEE, d MMMM yyyy")}
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
        {greeting}, {firstName} 👋
      </h2>

      {/* Online/Offline + refresh */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(255,255,255,0.12)", borderRadius: 10,
        padding: "10px 14px", border: "1px solid rgba(255,255,255,0.15)",
        marginBottom: 16, justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isOnline ? (
            <>
              <Wifi size={15} color="#4ade80" />
              <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 600 }}>Online</span>
            </>
          ) : (
            <>
              <WifiOff size={15} color="#f59e0b" />
              <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>Offline</span>
              <span style={{ fontSize: 12, opacity: 0.65 }}>— forms saved as drafts</span>
            </>
          )}
        </div>
        <button
          onClick={() => { refetchSubmissions(); loadLocalForms(); }}
          title="Refresh"
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "flex", padding: 4 }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Form cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(1,1fr)", gap: 16 }}>
        {cards.map((card) => (
          <div
            key={card.label}
            style={{ background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}
          >
            {/* Card header — always clickable to expand */}
            <div
              onClick={() => setExpandedCard(expandedCard === card.label ? null : card.label)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{card.label}</div>
                {card.label === "Sent" && (
                  <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>Submitted forms</div>
                )}
              </div>
              <div style={{ fontWeight: 800, fontSize: 22, color: card.count > 0 ? "#4ade80" : "#ccc" }}>
                {card.count}
              </div>
            </div>

            {expandedCard === card.label && (
              <div style={{ marginTop: 12 }}>
                {renderList(card.forms, card.type)}
                {isOnline && card.showSync && card.forms.length > 0 && (
                  <button
                    onClick={syncAll}
                    disabled={syncing}
                    style={{
                      padding: "10px 14px",
                      background: syncing ? "#e5e7eb" : "#fcd34d",
                      border: "none", color: "#000", fontWeight: 700,
                      borderRadius: 8, marginTop: 8,
                      display: "flex", alignItems: "center", gap: 6,
                      cursor: syncing ? "not-allowed" : "pointer",
                    }}
                  >
                    {syncing ? "Syncing..." : <><Send size={14} /> Sync All</>}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Announcements</h3>
          {announcements.slice(0, 3).map((a) => (
            <div key={a.id} style={{ padding: 10, marginBottom: 8, background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontWeight: 700 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{a.body}</div>
              <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
