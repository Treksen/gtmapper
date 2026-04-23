import React, { useState, useEffect } from "react";

/**
 * Slim top-bar + mini logo overlay shown during in-app navigation transitions.
 * Props:
 *   loading  {boolean}  — controls visibility
 */
export default function NavLoader({ loading = false }) {
  const [visible, setVisible] = useState(false);
  const [fading,  setFading]  = useState(false);

  useEffect(() => {
    if (loading) {
      setFading(false);
      setVisible(true);
    } else if (visible) {
      setFading(true);
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (!visible) return null;

  return (
    <>
      {/* Slim progress bar at very top */}
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: 3,
        zIndex: 10000,
        background: "var(--n200)",
        overflow: "hidden",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.3s ease",
      }}>
        <div style={{
          height: "100%",
          background: "linear-gradient(90deg, var(--green-800), var(--green-600))",
          animation: "nav-progress 0.9s ease-in-out infinite",
        }} />
      </div>

      {/* Semi-transparent overlay with mini logo */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9998,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.3s ease",
        pointerEvents: fading ? "none" : "auto",
      }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Ripple ring */}
          <span style={{
            position: "absolute",
            width: 68, height: 68,
            borderRadius: "50%",
            border: "2px solid var(--green-600)",
            animation: "ripple-out 1.2s ease-out infinite",
            opacity: 0,
          }} />
          <span style={{
            position: "absolute",
            width: 68, height: 68,
            borderRadius: "50%",
            border: "2px solid var(--green-600)",
            animation: "ripple-out 1.2s ease-out infinite 0.4s",
            opacity: 0,
          }} />
          {/* Logo */}
          <img
            src="/images/logo.png"
            alt="Loading"
            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
            style={{
              width: 52, height: 52,
              borderRadius: 12,
              objectFit: "cover",
              boxShadow: "0 4px 16px rgba(10,92,71,0.2)",
              animation: "logo-pulse 1.2s ease-in-out infinite",
            }}
          />
          {/* Fallback */}
          <div style={{
            display: "none",
            width: 52, height: 52,
            borderRadius: 12,
            background: "var(--green-800)",
            alignItems: "center",
            justifyContent: "center",
            animation: "logo-pulse 1.2s ease-in-out infinite",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes nav-progress {
          0%   { width: 0%;   margin-left: 0%;   }
          50%  { width: 55%;  margin-left: 25%;  }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </>
  );
}
