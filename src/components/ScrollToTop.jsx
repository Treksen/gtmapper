import React, { useState, useEffect } from "react";

/**
 * Floating "back to top" button — appears after scrolling 300px.
 * Also auto-scrolls to top on mount (used by layouts on route change).
 */
export default function ScrollToTop({ autoScroll = false }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Auto-scroll on route change when used with key={location.pathname}
    if (autoScroll) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [autoScroll]);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollUp = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      onClick={scrollUp}
      title="Back to top"
      aria-label="Scroll to top"
      style={{
        position: "fixed",
        bottom: 88,   // above mobile bottom nav
        right: 20,
        width: 42,
        height: 42,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        background: "var(--green-800)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 16px rgba(10,92,71,0.35)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.85)",
        transition: "opacity 0.25s, transform 0.25s",
        pointerEvents: visible ? "auto" : "none",
        zIndex: 900,
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
