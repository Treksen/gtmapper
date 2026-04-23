import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FileText,
  MapPin,
  Camera,
  CheckCircle,
  ChevronRight,
  Loader,
  ArrowLeft,
  ArrowRight,
  Send,
  Save,
  WifiOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useActiveForms, useToast } from "../../hooks/useData";
import { supabase } from "../../lib/supabase";
import { ToastContainer } from "../../components/Toast";
import { openDB } from "idb";

// ── IndexedDB Setup ───────────────────────────────────────────────
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

const saveDraftIndexed = async (draft) => {
  const db = await getDB();
  await db.put("drafts", draft);
};

const saveFinalizedIndexed = async (final) => {
  const db = await getDB();
  await db.put("finalized", final);
};

const markSentIndexed = async (item) => {
  const db = await getDB();
  await db.put("sent", item);
  await db.delete("finalized", item.id);
};

// ── Field Renderer ───────────────────────────────────────────────
function FieldRenderer({ field, value, onChange }) {
  useEffect(() => {
    return () => {
      if (value?.url) URL.revokeObjectURL(value.url);
    };
  }, [value]);

  if (field.type === "text")
    return (
      <input
        className="form-input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${field.label.toLowerCase()}`}
      />
    );

  if (field.type === "textarea")
    return (
      <textarea
        className="form-textarea"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${field.label.toLowerCase()}`}
      />
    );

  if (field.type === "number")
    return (
      <input
        className="form-input"
        type="number"
        min={field.validation?.min}
        max={field.validation?.max}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        placeholder="Enter number"
      />
    );

  if (field.type === "select")
    return (
      <select
        className="form-select"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {(field.options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(field.options || []).map((o) => (
          <label
            key={o}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: "var(--r-md)",
              border: `1.5px solid ${
                selected.includes(o) ? "var(--g600)" : "var(--n200)"
              }`,
              background: selected.includes(o) ? "var(--g50)" : "#fff",
              transition: "all 0.13s",
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(o)}
              style={{ width: 16, height: 16, accentColor: "var(--g700)" }}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, o]
                    : selected.filter((x) => x !== o),
                )
              }
            />
            <span style={{ fontSize: 14, color: "var(--n800)" }}>{o}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "date")
    return (
      <input
        className="form-input"
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );

  if (field.type === "gps")
    return (
      <div>
        {value ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "var(--g50)",
              border: "1.5px solid var(--g200)",
              borderRadius: "var(--r-md)",
            }}
          >
            <MapPin size={16} color="var(--g700)" />
            <span
              style={{
                fontSize: 13,
                fontFamily: "var(--mono)",
                color: "var(--g800)",
              }}
            >
              {value.lat?.toFixed(5)}, {value.lng?.toFixed(5)}
            </span>
            <span style={{ fontSize: 11, color: "var(--g600)", marginLeft: 4 }}>
              ±{value.accuracy?.toFixed(0)}m
            </span>
          </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: "var(--n400)",
              padding: "10px 14px",
              border: "1.5px dashed var(--n300)",
              borderRadius: "var(--r-md)",
            }}
          >
            Location will be captured automatically
          </div>
        )}
      </div>
    );

  if (field.type === "photo")
    return (
      <div>
        {value ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "var(--g50)",
              border: "1.5px solid var(--g200)",
              borderRadius: "var(--r-md)",
            }}
          >
            <Camera size={16} color="var(--g700)" />
            <span style={{ fontSize: 13, color: "var(--g800)" }}>
              Photo captured
            </span>
          </div>
        ) : (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              border: "1.5px dashed var(--n300)",
              borderRadius: "var(--r-md)",
              cursor: "pointer",
              color: "var(--n600)",
            }}
          >
            <Camera size={18} />
            <span style={{ fontSize: 14 }}>Tap to take photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                onChange({ file, url });
              }}
            />
          </label>
        )}
      </div>
    );

  return (
    <input
      className="form-input"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function CollectPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { forms, loading } = useActiveForms();
  const { toasts, toast } = useToast();
  const isOnline = navigator.onLine;

  const [selectedForm, setSelectedForm] = useState(null);
  const [data, setData] = useState({});
  const [step, setStep] = useState(0);
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsL] = useState(false);
  const [submitting, setSub] = useState(false);
  const [finalized, setFinalized] = useState(false);
  // Track the draft ID being edited so we can replace it on save/submit
  const [resumedDraftId, setResumedDraftId] = useState(null);

  const unloadRef = useRef(false);

  // ── Resume draft from OfficerHomePage ──
  useEffect(() => {
    const incoming = location.state?.resumeDraft;
    if (!incoming || forms.length === 0) return;
    // Find the matching form definition by form_id
    const matchedForm = forms.find((f) => f.id === incoming.form_id);
    if (matchedForm) {
      setSelectedForm(matchedForm);
      setData(incoming.data || {});
      setStep(incoming.step || 0);
      setGps(incoming.gps || null);
      setResumedDraftId(incoming.id);
    }
  }, [location.state, forms]);

  // ── Auto GPS capture ──
  useEffect(() => {
    if (!selectedForm) return;
    setGpsL(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setGpsL(false);
        },
        () => {
          setGps(null);
          setGpsL(false);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      setGps(null);
      setGpsL(false);
    }
  }, [selectedForm]);

  // ── Exit Prompt ──
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!unloadRef.current && selectedForm && !finalized) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [selectedForm, finalized]);

  // ── Field handlers ──
  const setField = (fieldId, value) =>
    setData((d) => ({ ...d, [fieldId]: value }));

  const canAdvance = () => {
    if (!selectedForm) return false;
    const field = selectedForm.schema[step];
    if (!field?.required) return true;
    const v = data[field.id];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== "" && v !== null;
  };

  const buildFinalData = () => {
    const finalData = { ...data };
    selectedForm.schema.forEach((f) => {
      if (f.type === "gps") finalData[f.id] = gps;
    });
    return finalData;
  };

 const saveDraft = async () => {
   if (!selectedForm) return;

   const draft = {
     id: resumedDraftId || `draft_${Date.now()}`,
     form_id: selectedForm.id,
     form_title: selectedForm.title,
     data,
     step,
     gps,
     photos: Object.values(data)
       .filter((v) => v?.file)
       .map((v) => v.file),
     status: "draft",
     created_at: new Date().toISOString(),
   };

   if (resumedDraftId && resumedDraftId !== draft.id) {
     const db = await getDB();
     await db.delete("drafts", resumedDraftId);
   }

   await saveDraftIndexed(draft);

   // Notify other tabs (same browser) that IndexedDB changed
   try {
     if (typeof BroadcastChannel !== "undefined") {
       const bc = new BroadcastChannel("gtmapper-idb-sync");
       bc.postMessage("idb-updated");
       bc.close();
     }
   } catch (_) {}

   toast("Draft saved", "success");
   setFinalized(true);
   resetForm();
   nav("/dashboard");
 };

  const resetForm = () => {
    setFinalized(false);
    setSelectedForm(null);
    setData({});
    setStep(0);
    setGps(null);
    setResumedDraftId(null);
  };

  // ── Form Selector ──
  if (!selectedForm) {
    return (
      <div className="fade-in">
        <ToastContainer toasts={toasts} />
        <div
          style={{
            background: "linear-gradient(135deg,var(--g900),var(--g800))",
            padding: "20px",
            color: "#fff",
          }}
        >
          <h2
            style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px" }}
          >
            Collect Data
          </h2>
          <p style={{ fontSize: 13, opacity: 0.65, marginTop: 3 }}>
            Select a form to start collecting
          </p>
          {!isOnline && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 10,
                background: "rgba(245,158,11,0.2)",
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              <WifiOff size={13} color="#fbbf24" />
              <span style={{ fontSize: 12, color: "#fbbf24" }}>
                Offline — drafts will be saved
              </span>
            </div>
          )}
        </div>
        <div style={{ padding: "16px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div
                className="spinner spinner-dark"
                style={{ width: 28, height: 28, margin: "0 auto" }}
              />
            </div>
          ) : forms.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <FileText size={40} className="empty-icon" />
                <div className="empty-title">No active forms</div>
                <div className="empty-body">
                  Your supervisor hasn't published any forms yet
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="card"
                  style={{
                    padding: "16px 18px",
                    cursor: "pointer",
                    borderLeft: "4px solid var(--g600)",
                  }}
                  onClick={() => {
                    setSelectedForm(form);
                    setData({});
                    setStep(0);
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--g50)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#fff")
                  }
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: "var(--g50)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={20} color="var(--g700)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: "var(--n900)",
                        }}
                      >
                        {form.title}
                      </div>
                      {form.description && (
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--n500)",
                            marginTop: 2,
                          }}
                        >
                          {form.description}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--n400)",
                          marginTop: 4,
                        }}
                      >
                        {Array.isArray(form.schema) ? form.schema.length : 0}{" "}
                        fields
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--n300)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step View ──
  const schema = selectedForm?.schema || [];
  const field = schema[step];
  const isLast = step === schema.length - 1;
  const progress = ((step + 1) / schema.length) * 100;

  return (
    <div
      className="fade-in"
      style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}
    >
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg,var(--g900),var(--g800))",
          padding: "16px 20px",
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <button
            onClick={async () => {
              if (Object.keys(data).length > 0) {
                const res = window.confirm("Save as draft before exiting?");
                if (res) await saveDraft();
              }
              resetForm();
            }}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              color: "#fff",
              display: "flex",
              padding: "6px",
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, opacity: 0.8 }}>
              {selectedForm.title}
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, opacity: 0.55 }}>
              Field {step + 1} of {schema.length}
            </div>
          </div>
          {gpsLoading && (
            <Loader
              size={14}
              color="rgba(255,255,255,0.6)"
              style={{ animation: "spin 1s linear infinite" }}
            />
          )}
          {gps && !gpsLoading && (
            <MapPin size={14} color="rgba(255,255,255,0.7)" />
          )}
          {!isOnline && <WifiOff size={14} color="#fbbf24" />}
        </div>
        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "#fff",
              transition: "width 0.2s",
            }}
          />
        </div>
      </div>

      {/* Field */}
      <div
        style={{
          flex: 1,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>{field.label}</div>
        {field.description && (
          <div style={{ fontSize: 12, color: "var(--n500)" }}>
            {field.description}
          </div>
        )}
        <FieldRenderer
          field={field}
          value={data[field.id]}
          onChange={(v) => setField(field.id, v)}
        />
      </div>

      {/* Actions */}
      <div
        style={{
          padding: "12px 16px",
          background: "#fff",
          borderTop: "1px solid var(--n200)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Save Draft */}
        <button className="btn btn-ghost" onClick={saveDraft}>
          <Save size={16} /> Save as Draft
        </button>

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={16} /> Previous
            </button>
          )}

          {isLast ? (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!canAdvance() || submitting}
              onClick={async () => {
                setSub(true);
                const final = {
                  id: `final_${Date.now()}`,
                  form_id: selectedForm.id,
                  form_title: selectedForm.title,
                  data: buildFinalData(),
                  gps,
                  status: "finalized",
                  created_at: new Date().toISOString(),
                };
                await saveFinalizedIndexed(final);

                // If this was a resumed draft, remove the original draft entry
                if (resumedDraftId) {
                  const db = await getDB();
                  await db.delete("drafts", resumedDraftId);
                }

                if (navigator.onLine) {
                  try {
                    await supabase.from("form_submissions").insert({
                      form_id: final.form_id,
                      org_id: profile.org_id,
                      officer_id: profile.id,
                      data: final.data,
                      lat: gps?.lat,
                      lng: gps?.lng,
                      status: "submitted",
                      submitted_at: new Date().toISOString(),
                    });

                    await markSentIndexed({ ...final, status: "sent" });
                    toast("Form sent", "success");
                  } catch {
                    toast("Saved offline (sync later)", "warning");
                  }
                } else {
                  toast("Finalized (will send when online)", "info");
                }

                setSub(false);
                resetForm();
                nav("/dashboard");
              }}
            >
              {submitting ? (
                <span className="spinner" />
              ) : (
                <>
                  <Send size={16} />{" "}
                  {navigator.onLine ? "Finalize & Send" : "Finalize"}
                </>
              )}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
            >
              Next <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
