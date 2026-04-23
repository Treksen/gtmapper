import React, { useState, useEffect } from "react";

/**
 * Full-screen splash loader shown on initial app load and route transitions.
 * Props:
 *   loading  {boolean}  — when true shows the overlay; when false fades it out
 *   initial  {boolean}  — when true uses a longer delay (first-load experience)
 */
export default function PageLoader({ loading = false, initial = false }) {
  const [visible, setVisible] = useState(loading);
  const [fading,  setFading]  = useState(false);

  useEffect(() => {
    if (loading) {
      setFading(false);
      setVisible(true);
    } else if (visible) {
      // Fade out then unmount
      setFading(true);
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.35s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* Pulsing logo with ripple rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Ripple ring 1 */}
        <span style={{
          position: "absolute",
          width: 90, height: 90,
          borderRadius: "50%",
          border: "3px solid var(--green-600)",
          animation: "ripple-out 1.6s ease-out infinite",
          opacity: 0,
        }} />
        {/* Ripple ring 2 */}
        <span style={{
          position: "absolute",
          width: 90, height: 90,
          borderRadius: "50%",
          border: "3px solid var(--green-600)",
          animation: "ripple-out 1.6s ease-out infinite 0.55s",
          opacity: 0,
        }} />
        {/* Logo image */}
        <img
          src="/images/logo.png"
          alt="GeoTreks Kenya"
          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
          style={{
            width: 70, height: 70,
            borderRadius: 16,
            objectFit: "cover",
            boxShadow: "0 4px 20px rgba(10,92,71,0.25)",
            animation: "logo-pulse 1.6s ease-in-out infinite",
          }}
        />
        {/* Fallback icon if logo.png missing */}
        <div style={{
          display: "none",
          width: 70, height: 70,
          borderRadius: 16,
          background: "var(--green-800)",
          alignItems: "center",
          justifyContent: "center",
          animation: "logo-pulse 1.6s ease-in-out infinite",
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>

      {/* Brand text */}
      <div style={{
        marginTop: 24,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 22,
        color: "var(--green-800)",
        letterSpacing: "0.01em",
      }}>
        GeoTreks
      </div>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.15em",
        color: "var(--green-600)",
        textTransform: "uppercase",
        opacity: 0.75,
        marginTop: 3,
      }}>
        Kenya
      </div>

      {/* Progress bar at bottom */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: 3,
        background: "var(--n200)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          background: "var(--green-600)",
          animation: "progress-bar 1.4s ease-in-out infinite",
        }} />
      </div>

      <style>{`
        @keyframes progress-bar {
          0%   { width: 0%;   margin-left: 0%;   }
          50%  { width: 60%;  margin-left: 20%;  }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
