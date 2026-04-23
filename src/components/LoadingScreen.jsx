import React, { useState } from 'react'

export default function LoadingScreen() {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div className="loading-screen">
      {/* Logo */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Ripple */}
        <span style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', animation: 'ripple-out 1.6s ease-out infinite', opacity: 0 }} />
        <span style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', animation: 'ripple-out 1.6s ease-out infinite 0.55s', opacity: 0 }} />

        {!imgFailed ? (
          <img
            src="/images/logo.png"
            alt="GT Mapper"
            onError={() => setImgFailed(true)}
            style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)', animation: 'logo-pulse 1.6s ease-in-out infinite' }}
          />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'logo-pulse 1.6s ease-in-out infinite' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>GT Mapper</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>GeoTreks Kenya</div>
      </div>

      <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginTop: 4 }} />
    </div>
  )
}
