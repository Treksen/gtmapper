import React, { useState, useEffect, useRef } from 'react'

/* ── Fonts ─────────────────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.querySelector('link[href*="Plus+Jakarta"]')) {
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;600&display=swap'
  document.head.appendChild(l)
}

/* ── CSS ───────────────────────────────────────────────────── */
const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --g900:#0a2318; --g800:#0f3d28; --g700:#134e2f; --g600:#166534;
    --g500:#15803d; --g400:#16a34a; --g300:#22c55e; --g200:#86efac; --g100:#dcfce7;
    --ink:#0a0f0d; --paper:#f8faf9; --white:#ffffff;
    --font:'Plus Jakarta Sans',system-ui,sans-serif;
    --mono:'JetBrains Mono',monospace;
    --rule:rgba(10,35,24,0.08);
  }
  html{scroll-behavior:smooth}
  body.gtm-lp{font-family:var(--font);background:var(--paper);color:var(--ink);overflow-x:hidden}

  /* NAV */
  .n{
    background:rgba(248,250,249,0.97);
    backdrop-filter:blur(20px);
    box-shadow:0 1px 0 var(--rule),0 4px 24px rgba(10,35,24,.06);
    border-bottom-color:var(--rule);
    position:fixed;top:0;left:0;right:0;z-index:900;
    display:flex;align-items:center;justify-content:space-between;
    padding:20px 56px;
    transition:padding .3s,background .3s,box-shadow .3s,border-color .3s;
    border-bottom:1px solid transparent;
  }
  .n.stuck{
    padding:11px 56px;
    background:rgba(248,250,249,0.97);
    backdrop-filter:blur(20px);
    box-shadow:0 1px 0 var(--rule),0 4px 24px rgba(10,35,24,.06);
    border-bottom-color:var(--rule);
  }
  .n-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
  .n-mark{
    width:42px;height:42px;border-radius:10px;
    background:#f5f0e8;display:flex;align-items:center;
    justify-content:center;overflow:hidden;flex-shrink:0;
    transition:transform .2s;
    border:1px solid rgba(0,0,0,0.06);
  }
  .n-logo:hover .n-mark{transform:rotate(-4deg) scale(1.06)}
  .n-mark img{width:26px;height:26px;object-fit:contain;filter:brightness(10)}
  .n-mark-fb{font-size:18px;color:#fff;font-family:var(--font);font-weight:800}
  .n-name{font-weight:800;font-size:16px;color:var(--ink);line-height:1.1}
  .n-sub{font-size:10px;font-weight:700;letter-spacing:.13em;color:var(--g400);text-transform:uppercase}
  .n-links{display:flex;align-items:center;gap:34px}
  .n-links a{
    font-size:13px;font-weight:600;color:var(--ink);text-decoration:none;
    opacity:.55;transition:opacity .2s;position:relative;padding-bottom:2px;
  }
  .n-links a::after{content:'';position:absolute;bottom:-2px;left:0;width:0;height:1.5px;background:var(--g400);transition:width .22s}
  .n-links a:hover,.n-links a.on{opacity:1}
  .n-links a:hover::after,.n-links a.on::after{width:100%}
  .n-cta{
    display:inline-flex;align-items:center;gap:6px;
    background:var(--g700);color:#fff;font-family:var(--font);
    font-weight:700;font-size:13px;padding:10px 22px;
    border-radius:99px;text-decoration:none;
    transition:background .2s,transform .15s;white-space:nowrap;
  }
  .n-cta:hover{background:var(--g500);transform:translateY(-1px)}
  .ham{display:none;flex-direction:column;gap:5px;cursor:pointer;background:none;border:none;padding:4px}
  .ham span{display:block;width:22px;height:2px;background:var(--ink);border-radius:2px;transition:all .3s}
  .ham.x span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .ham.x span:nth-child(2){opacity:0;transform:scaleX(0)}
  .ham.x span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
  /* MOBILE SIDEBAR */
  .drawer-overlay{
    position:fixed;inset:0;z-index:898;
    background:rgba(10,35,24,0);
    pointer-events:none;
    transition:background .35s ease;
  }
  .drawer-overlay.open{background:rgba(10,35,24,.55);pointer-events:all}
  .drawer{
    position:fixed;top:0;right:0;bottom:0;z-index:899;
    width:min(320px,88vw);
    background:#fff;
    display:flex;flex-direction:column;
    transform:translateX(100%);
    transition:transform .38s cubic-bezier(.4,0,.2,1);
    pointer-events:none;
    box-shadow:-8px 0 48px rgba(10,35,24,.18);
  }
  .drawer.open{transform:translateX(0);pointer-events:all}
  .drawer-header{
    display:flex;align-items:center;justify-content:space-between;
    padding:18px 24px;
    border-bottom:1px solid var(--rule);
    flex-shrink:0;
  }
  .drawer-logo{display:flex;align-items:center;gap:9px;text-decoration:none}
  .drawer-logo-mark{
    width:40px;height:40px;border-radius:10px;
    background:#f5f0e8;display:flex;align-items:center;
    justify-content:center;overflow:hidden;
    border:1px solid rgba(0,0,0,0.06);
  }
  .drawer-logo-mark img{width:22px;height:22px;object-fit:contain;filter:brightness(10)}
  .drawer-logo-name{font-size:15px;font-weight:800;color:var(--ink);line-height:1.1}
  .drawer-logo-sub{font-size:10px;font-weight:700;letter-spacing:.12em;color:var(--g400);text-transform:uppercase}
  .drawer-close{
    width:34px;height:34px;border-radius:8px;border:none;
    background:rgba(10,35,24,.06);cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    font-size:16px;color:var(--ink);transition:background .15s;
  }
  .drawer-close:hover{background:rgba(10,35,24,.11)}
  .drawer-nav{
    flex:1;overflow-y:auto;
    padding:12px 0;
  }
  .drawer-nav a{
    display:flex;align-items:center;justify-content:space-between;
    padding:14px 24px;
    font-size:15px;font-weight:600;color:var(--ink);
    text-decoration:none;opacity:.72;
    transition:background .15s,opacity .15s,color .15s;
    border-left:3px solid transparent;
  }
  .drawer-nav a:hover,.drawer-nav a.on{
    background:var(--g100);opacity:1;
    color:var(--g600);border-left-color:var(--g400);
  }
  .drawer-nav a .arrow{font-size:12px;opacity:.4;transition:transform .2s,opacity .2s}
  .drawer-nav a:hover .arrow,.drawer-nav a.on .arrow{transform:translateX(3px);opacity:.8}
  .drawer-divider{height:1px;background:var(--rule);margin:8px 24px}
  .drawer-footer{
    padding:20px 24px;
    border-top:1px solid var(--rule);
    flex-shrink:0;
  }
  .drawer-cta{
    display:flex;align-items:center;justify-content:center;gap:7px;
    width:100%;padding:13px 20px;border-radius:12px;
    background:var(--g800);color:#fff;font-family:var(--font);
    font-weight:700;font-size:14px;text-decoration:none;
    transition:background .2s;
  }
  .drawer-cta:hover{background:var(--g600)}
  .drawer-contact{
    display:flex;align-items:center;gap:6px;margin-top:14px;
    font-size:12px;font-weight:500;color:rgba(10,15,13,.42);
    justify-content:center;
  }

  /* HERO */
  .hero{
    min-height:100vh;display:flex;flex-direction:column;
    justify-content:flex-end;padding:0 56px 72px;
    position:relative;overflow:hidden;background:var(--g900);
  }
  .hero-bg{
    position:absolute;inset:0;
    background:
      radial-gradient(ellipse 65% 55% at 78% 28%,rgba(21,128,61,.28) 0%,transparent 65%),
      radial-gradient(ellipse 45% 65% at 8% 82%,rgba(34,197,94,.06) 0%,transparent 60%);
  }
  .hero-grid{
    position:absolute;inset:0;opacity:.055;
    background-image:linear-gradient(rgba(134,239,172,.7) 1px,transparent 1px),
                     linear-gradient(90deg,rgba(134,239,172,.7) 1px,transparent 1px);
    background-size:52px 52px;
  }
  .eyebrow{
    display:inline-flex;align-items:center;gap:8px;
    font-size:11px;font-weight:700;letter-spacing:.17em;
    color:var(--g200);text-transform:uppercase;margin-bottom:26px;
  }
  .eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--g300);animation:blink 2.4s ease-in-out infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
  .h1{
    font-family:var(--font);font-weight:800;
    font-size:clamp(46px,8vw,102px);
    color:#fff;line-height:.9;letter-spacing:-.03em;max-width:820px;
  }
  .h1 em{color:var(--g300);font-style:normal}
  .hero-body{
    margin-top:26px;font-size:16px;font-weight:400;line-height:1.7;
    color:rgba(255,255,255,.48);max-width:480px;
  }
  .hero-actions{display:flex;align-items:center;gap:12px;margin-top:38px;flex-wrap:wrap}
  .btn-lime{
    display:inline-flex;align-items:center;gap:7px;
    background:var(--g300);color:var(--g900);font-family:var(--font);
    font-weight:700;font-size:14px;padding:13px 26px;
    border-radius:99px;text-decoration:none;
    transition:transform .15s,box-shadow .15s;
  }
  .btn-lime:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(34,197,94,.32)}
  .btn-ghost{
    display:inline-flex;align-items:center;gap:7px;
    border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.68);
    font-family:var(--font);font-weight:500;font-size:14px;
    padding:13px 26px;border-radius:99px;text-decoration:none;
    transition:border-color .2s,color .2s;
  }
  .btn-ghost:hover{border-color:rgba(255,255,255,.48);color:#fff}
  .stats{
    display:flex;gap:0;border-top:1px solid rgba(255,255,255,.07);
    margin-top:60px;padding-top:26px;
  }
  .stat{flex:1;padding-right:28px}
  .stat+.stat{border-left:1px solid rgba(255,255,255,.07);padding-left:28px}
  .stat-n{font-family:var(--font);font-size:34px;font-weight:800;color:#fff;line-height:1}
  .stat-l{font-size:12px;font-weight:500;color:rgba(255,255,255,.38);margin-top:4px;letter-spacing:.03em}
  .scroll-hint{
    position:absolute;bottom:26px;right:56px;
    display:flex;flex-direction:column;align-items:center;gap:5px;
    font-size:10px;font-weight:600;letter-spacing:.14em;
    color:rgba(255,255,255,.22);text-transform:uppercase;
  }
  .scroll-line{width:1px;height:42px;background:linear-gradient(to bottom,rgba(255,255,255,.28),transparent);animation:sa 2s ease-in-out infinite}
  @keyframes sa{0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}51%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}

  /* MARQUEE */
  .mq-wrap{background:var(--g300);padding:13px 0;overflow:hidden}
  .mq{display:flex;gap:0;animation:mq 24s linear infinite;width:max-content}
  .mq-item{
    display:flex;align-items:center;gap:14px;
    font-family:var(--font);font-size:12px;font-weight:700;
    letter-spacing:.05em;color:var(--g900);padding:0 26px;
    white-space:nowrap;text-transform:uppercase;
  }
  .mq-sep{width:4px;height:4px;border-radius:50%;background:rgba(10,35,24,.3)}
  @keyframes mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}

  /* SECTIONS */
  .sec{padding:120px 56px;max-width:1240px;margin:0 auto}
  .tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--g500);margin-bottom:13px}
  .h2{font-family:var(--font);font-size:clamp(32px,5vw,56px);font-weight:800;line-height:.94;letter-spacing:-.028em;color:var(--ink)}
  .h2 em{color:var(--g500);font-style:normal}
  .body-text{font-size:16px;font-weight:400;line-height:1.72;color:rgba(10,15,13,.55);max-width:520px;margin-top:15px}

  /* DATA STRIP (animated numbers) */
  .data-strip{
    background:var(--g900);padding:60px 56px;
  }
  .data-strip-inner{max-width:1240px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:0}
  .ds-card{padding:28px 32px;border-right:1px solid rgba(255,255,255,.07)}
  .ds-card:last-child{border-right:none}
  .ds-num{font-family:var(--font);font-size:42px;font-weight:800;color:var(--g300);line-height:1}
  .ds-label{font-size:12px;font-weight:600;color:rgba(255,255,255,.38);margin-top:6px;letter-spacing:.04em;text-transform:uppercase}

  /* MAP VISUAL */
  .map-section{background:var(--g900);padding:80px 56px}
  .map-inner{max-width:1240px;margin:0 auto;display:grid;grid-template-columns:1fr 1.4fr;gap:64px;align-items:center}
  .map-canvas{
    border-radius:20px;overflow:hidden;
    background:#0a1f12;border:1px solid rgba(134,239,172,.12);
    position:relative;height:420px;
  }
  .map-grid{
    position:absolute;inset:0;
    background-image:linear-gradient(rgba(134,239,172,.06) 1px,transparent 1px),
                     linear-gradient(90deg,rgba(134,239,172,.06) 1px,transparent 1px);
    background-size:32px 32px;
  }
  .map-pulse{
    position:absolute;border-radius:50%;
    animation:pulse 2.8s ease-in-out infinite;
  }
  @keyframes pulse{
    0%{transform:scale(1);opacity:.8}
    50%{transform:scale(1.6);opacity:.3}
    100%{transform:scale(1);opacity:.8}
  }
  .map-trail-svg{position:absolute;inset:0;width:100%;height:100%}
  .map-badge{
    position:absolute;bottom:16px;left:16px;
    background:rgba(10,35,24,.9);border:1px solid rgba(134,239,172,.2);
    border-radius:12px;padding:12px 16px;backdrop-filter:blur(10px);
  }
  .map-badge-label{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:4px}
  .map-badge-val{font-family:var(--mono);font-size:18px;font-weight:600;color:var(--g300)}
  .live-dot{width:7px;height:7px;border-radius:50%;background:var(--g300);animation:blink 1.5s ease-in-out infinite;display:inline-block;margin-right:6px}
  .map-stat-list{display:flex;flex-direction:column;gap:14px;margin-top:28px}
  .map-stat-row{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px}
  .map-stat-row-label{font-size:13px;font-weight:500;color:rgba(255,255,255,.6)}
  .map-stat-row-val{font-family:var(--mono);font-size:14px;font-weight:600;color:var(--g300)}

  /* CHARTS SECTION */
  .charts-wrap{background:var(--paper);padding:120px 56px}
  .charts-inner{max-width:1240px;margin:0 auto}
  .charts-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:20px;margin-top:56px}
  .chart-card{
    background:#fff;border:1px solid var(--rule);border-radius:20px;
    padding:28px;overflow:hidden;position:relative;
  }
  .chart-card-title{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:4px}
  .chart-card-sub{font-size:12px;font-weight:500;color:rgba(10,15,13,.45);margin-bottom:20px}
  .chart-card.full{grid-column:span 2}
  .chart-card.dark{background:var(--g900);border-color:rgba(255,255,255,.07)}
  .chart-card.dark .chart-card-title{color:#fff}
  .chart-card.dark .chart-card-sub{color:rgba(255,255,255,.4)}

  /* Bar chart */
  .bar-chart{display:flex;align-items:flex-end;gap:8px;height:140px;padding-bottom:24px;position:relative}
  .bar-chart::after{
    content:'';position:absolute;bottom:24px;left:0;right:0;
    height:1px;background:var(--rule);
  }
  .bar-wrap{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1}
  .bar{
    width:100%;border-radius:6px 6px 0 0;
    background:linear-gradient(to top,var(--g500),var(--g300));
    transition:height .8s cubic-bezier(.4,0,.2,1);
    cursor:pointer;position:relative;
  }
  .bar:hover::after{
    content:attr(data-val);position:absolute;
    top:-24px;left:50%;transform:translateX(-50%);
    font-family:var(--mono);font-size:10px;font-weight:600;
    color:var(--g900);background:var(--g300);padding:2px 6px;border-radius:4px;
    white-space:nowrap;
  }
  .bar-label{font-size:10px;font-weight:600;color:rgba(10,15,13,.4);letter-spacing:.03em}

  /* Donut chart */
  .donut-wrap{display:flex;align-items:center;gap:24px}
  .donut-legend{display:flex;flex-direction:column;gap:10px;flex:1}
  .donut-legend-item{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500}
  .donut-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}

  /* Heatmap */
  .heatmap{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;margin-top:8px}
  .hm-cell{
    aspect-ratio:1;border-radius:3px;
    transition:transform .15s;cursor:pointer;
  }
  .hm-cell:hover{transform:scale(1.3)}
  .hm-months{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;margin-bottom:4px}
  .hm-month{font-size:9px;font-weight:600;color:rgba(10,15,13,.35);letter-spacing:.04em;text-align:center}

  /* Line chart SVG */
  .line-chart-wrap{position:relative;height:140px}
  .line-chart-y{
    position:absolute;left:0;top:0;bottom:20px;
    display:flex;flex-direction:column;justify-content:space-between;
  }
  .line-chart-y span{font-size:9px;font-weight:600;color:rgba(255,255,255,.3);font-family:var(--mono)}

  /* FEATURES BENTO */
  .bento{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:56px}
  .bcard{background:#fff;border:1px solid var(--rule);border-radius:20px;padding:26px;transition:transform .2s,box-shadow .2s;position:relative;overflow:hidden}
  .bcard:hover{transform:translateY(-3px);box-shadow:0 14px 42px rgba(10,35,24,.08)}
  .bcard.feat{background:var(--g800);border-color:var(--g700);grid-column:span 2}
  .bcard-icon{width:42px;height:42px;border-radius:11px;background:var(--g100);display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:14px}
  .bcard.feat .bcard-icon{background:rgba(255,255,255,.1)}
  .bcard-title{font-size:17px;font-weight:700;color:var(--ink);margin-bottom:7px}
  .bcard.feat .bcard-title{color:#fff}
  .bcard-body{font-size:13px;font-weight:400;line-height:1.65;color:rgba(10,15,13,.52)}
  .bcard.feat .bcard-body{color:rgba(255,255,255,.55)}
  .bcard-tag{display:inline-block;margin-top:14px;background:var(--g300);color:var(--g900);font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 11px;border-radius:99px}

  /* HOW IT WORKS */
  .how{background:var(--g900);padding:120px 56px}
  .how-inner{max-width:1240px;margin:0 auto}
  .how .tag{color:var(--g300)}
  .how .h2{color:#fff}
  .how .h2 em{color:var(--g300)}
  .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:60px;position:relative}
  .steps::before{content:'';position:absolute;top:21px;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,rgba(134,239,172,.3),rgba(134,239,172,.3),transparent)}
  .step{text-align:center;padding:0 18px}
  .step-n{width:44px;height:44px;border-radius:50%;background:var(--g900);border:1.5px solid rgba(134,239,172,.35);display:flex;align-items:center;justify-content:center;font-family:var(--font);font-size:15px;font-weight:800;color:var(--g300);margin:0 auto 18px;position:relative;z-index:1}
  .step-title{font-size:15px;font-weight:700;color:#fff;margin-bottom:9px}
  .step-body{font-size:13px;font-weight:400;line-height:1.65;color:rgba(255,255,255,.38)}

  /* ROLES */
  .roles-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:52px}
  .role{border-radius:20px;padding:30px 26px;border:1px solid var(--rule);transition:transform .2s}
  .role:hover{transform:translateY(-3px)}
  .role.admin{background:var(--g800)}
  .role.sup{background:var(--g100)}
  .role.off{background:#fff}
  .role-emoji{font-size:30px;margin-bottom:13px}
  .role-title{font-family:var(--font);font-size:21px;font-weight:800;margin-bottom:9px}
  .role.admin .role-title{color:#fff}
  .role-body{font-size:13px;font-weight:400;line-height:1.7;color:rgba(10,15,13,.52)}
  .role.admin .role-body{color:rgba(255,255,255,.55)}
  .role-list{list-style:none;margin-top:16px;display:flex;flex-direction:column;gap:6px}
  .role-list li{font-size:12px;font-weight:500;display:flex;align-items:center;gap:7px;color:rgba(10,15,13,.6)}
  .role.admin .role-list li{color:rgba(255,255,255,.65)}
  .role-list li::before{content:'→';font-size:10px;opacity:.42}

  /* CTA */
  .cta{background:var(--g300);padding:96px 56px;text-align:center;position:relative;overflow:hidden}
  .cta::before{content:'GT';position:absolute;font-family:var(--font);font-weight:800;font-size:380px;color:rgba(10,35,24,.06);line-height:1;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;letter-spacing:-.06em}
  .cta-h2{font-family:var(--font);font-size:clamp(40px,7vw,88px);font-weight:800;color:var(--g900);line-height:.93;letter-spacing:-.03em;position:relative}
  .cta-body{font-size:16px;font-weight:400;color:rgba(10,35,24,.58);margin-top:13px;position:relative}
  .btn-dark{display:inline-flex;align-items:center;gap:7px;background:var(--g900);color:#fff;font-family:var(--font);font-weight:700;font-size:14px;padding:14px 30px;border-radius:99px;text-decoration:none;margin-top:32px;transition:transform .15s,background .2s;position:relative}
  .btn-dark:hover{background:var(--g700);transform:translateY(-2px)}

  /* FOOTER */
  .footer{background:var(--g900);padding:72px 56px 36px}
  .footer-inner{max-width:1240px;margin:0 auto}
  .footer-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:56px;padding-bottom:52px;border-bottom:1px solid rgba(255,255,255,.07)}
  .footer-mark{width:40px;height:40px;border-radius:10px;background:#f5f0e8;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(0,0,0,0.06)}
  .footer-mark img{width:22px;height:22px;object-fit:contain;filter:brightness(10)}
  .footer-mark-fb{font-size:15px;color:#fff;font-family:var(--font);font-weight:800}
  .footer-brand{font-size:16px;font-weight:800;color:#fff}
  .footer-tagline{font-size:13px;font-weight:400;color:rgba(255,255,255,.35);line-height:1.65;max-width:240px;margin-top:12px}
  .footer-col-title{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.26);margin-bottom:16px}
  .footer-links{display:flex;flex-direction:column;gap:9px}
  .footer-links a{font-size:13px;font-weight:500;color:rgba(255,255,255,.48);text-decoration:none;transition:color .2s}
  .footer-links a:hover{color:var(--g300)}
  .footer-bottom{display:flex;justify-content:space-between;align-items:center;padding-top:26px;flex-wrap:wrap;gap:6px}
  .footer-copy{font-size:12px;font-weight:400;color:rgba(255,255,255,.2)}
  .footer-ver{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(134,239,172,.38)}

  /* REVEAL */
  .rv{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease}
  .rv.on{opacity:1;transform:translateY(0)}

  /* RESPONSIVE */
  @media(max-width:1000px){
    .n,.n.stuck{padding:16px 24px}
    .n-links{display:none}
    .ham{display:flex}
    .hero{padding:0 24px 56px}
    .sec,.charts-wrap,.how,.footer{padding-left:24px;padding-right:24px}
    .data-strip{padding:40px 24px}
    .data-strip-inner{grid-template-columns:repeat(2,1fr)}
    .ds-card{border-right:none;border-bottom:1px solid rgba(255,255,255,.07)}
    .map-section{padding:60px 24px}
    .map-inner{grid-template-columns:1fr;gap:32px}
    .map-canvas{height:280px}
    .charts-grid{grid-template-columns:1fr}
    .chart-card.full{grid-column:span 1}
    .bento{grid-template-columns:1fr}
    .bcard.feat{grid-column:span 1}
    .steps{grid-template-columns:repeat(2,1fr);gap:32px}
    .steps::before{display:none}
    .roles-grid{grid-template-columns:1fr}
    .footer-grid{grid-template-columns:1fr;gap:32px}
    .stats{flex-direction:column;gap:16px}
    .stat+.stat{border-left:none;border-top:1px solid rgba(255,255,255,.07);padding-left:0;padding-top:16px}
    .scroll-hint{display:none}
  }
`

/* ── Inject CSS once ────────────────────────────────────────── */
if (typeof document !== 'undefined') {
  if (!document.getElementById('gtm-lp')) {
    const s = document.createElement('style')
    s.id = 'gtm-lp'
    s.textContent = CSS
    document.head.appendChild(s)
  }
  document.body.classList.add('gtm-lp')
}

/* ── Helpers ────────────────────────────────────────────────── */
function useStuck() {
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const fn = () => setStuck(window.scrollY > 50)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return stuck
}

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const obs = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: '-38% 0px -56% 0px' }
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])
  return active
}

function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target) } }),
      { threshold: 0.08 }
    )
    document.querySelectorAll('.rv').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  })
}

function LogoMark({ size = 40, r = 11 }) {
  const [err, setErr] = useState(false)
  return (
    <div className="n-mark" style={{ width: size, height: size, borderRadius: r }}>
      {err
        ? <span className="n-mark-fb">G</span>
        : <img src="/images/logo.jpeg" alt="" onError={() => setErr(true)} style={{ width: size * 0.88, height: size * 0.88, objectFit: 'contain' }} />}
    </div>
  )
}

/* ── Animated counter ───────────────────────────────────────── */
function Counter({ target, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      let start = 0
      const end = parseInt(target)
      const dur = 1600
      const step = Math.ceil(end / (dur / 16))
      const timer = setInterval(() => {
        start = Math.min(start + step, end)
        setVal(start)
        if (start >= end) clearInterval(timer)
      }, 16)
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

/* ── Bar chart ──────────────────────────────────────────────── */
function BarChart({ data, color = 'default' }) {
  const [anim, setAnim] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setAnim(true); obs.disconnect() } }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  const max = Math.max(...data.map(d => d.v))
  return (
    <div ref={ref} className="bar-chart">
      {data.map((d, i) => (
        <div key={d.l} className="bar-wrap">
          <div className="bar"
            data-val={d.v}
            style={{
              height: anim ? `${(d.v / max) * 110}px` : '4px',
              transitionDelay: `${i * 0.06}s`,
              background: d.highlight
                ? 'linear-gradient(to top,#15803d,#22c55e)'
                : 'linear-gradient(to top,rgba(21,128,61,.4),rgba(34,197,94,.6))',
            }} />
          <span className="bar-label">{d.l}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Donut chart (SVG) ──────────────────────────────────────── */
function DonutChart({ slices }) {
  const [anim, setAnim] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setAnim(true); obs.disconnect() } }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const R = 52, cx = 64, cy = 64, stroke = 22
  const circ = 2 * Math.PI * R
  let cumPct = 0
  const total = slices.reduce((s, sl) => s + sl.v, 0)

  return (
    <div ref={ref} className="donut-wrap">
      <svg width={128} height={128} viewBox="0 0 128 128" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(10,15,13,.06)" strokeWidth={stroke} />
        {slices.map((sl, i) => {
          const pct = sl.v / total
          const offset = circ * (1 - pct)
          const rotation = cumPct * 360 - 90
          cumPct += pct
          return (
            <circle key={i} cx={cx} cy={cy} r={R} fill="none"
              stroke={sl.color} strokeWidth={stroke}
              strokeDasharray={`${circ} ${circ}`}
              strokeDashoffset={anim ? offset : circ}
              strokeLinecap="butt"
              style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${rotation}deg)`, transition: `stroke-dashoffset .9s ease ${i * 0.15}s` }}
            />
          )
        })}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--ink)" fontSize="14" fontWeight="700" fontFamily="var(--font)">{total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="rgba(10,15,13,.4)" fontSize="9" fontFamily="var(--font)">TOTAL</text>
      </svg>
      <div className="donut-legend">
        {slices.map((sl, i) => (
          <div key={i} className="donut-legend-item">
            <div className="donut-legend-dot" style={{ background: sl.color }} />
            <span style={{ color: 'rgba(10,15,13,.65)' }}>{sl.label}</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 12 }}>{sl.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Activity heatmap ───────────────────────────────────────── */
function Heatmap() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const vals = Array.from({ length: 12 }, (_, m) =>
    Array.from({ length: 28 }, (_, d) => {
      const base = Math.sin((m + d) * 0.4) * 0.5 + 0.5
      return Math.round(base * 18 + Math.random() * 6)
    })
  )
  const allVals = vals.flat()
  const max = Math.max(...allVals)

  function color(v) {
    const t = v / max
    if (t < 0.15) return 'rgba(10,35,24,.12)'
    if (t < 0.35) return '#166534'
    if (t < 0.6)  return '#16a34a'
    if (t < 0.8)  return '#22c55e'
    return '#86efac'
  }

  return (
    <div>
      <div className="hm-months">
        {months.map(m => <div key={m} className="hm-month">{m}</div>)}
      </div>
      <div className="heatmap">
        {vals.map((month, mi) =>
          month.slice(0, 7).map((v, di) => (
            <div key={`${mi}-${di}`} className="hm-cell"
              style={{ background: color(v) }}
              title={`${months[mi]} day ${di + 1}: ${v} submissions`}
            />
          ))
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(10,15,13,.35)' }}>Less</span>
        {['rgba(10,35,24,.12)', '#166534', '#16a34a', '#22c55e', '#86efac'].map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
        ))}
        <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(10,15,13,.35)' }}>More</span>
      </div>
    </div>
  )
}

/* ── Line chart SVG ─────────────────────────────────────────── */
function LineChart({ data, label, color = '#22c55e' }) {
  const [anim, setAnim] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setAnim(true); obs.disconnect() } }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const W = 320, H = 110
  const max = Math.max(...data) * 1.12
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`)
  const d = `M${pts.join(' L')}`
  const fill = `${d} L${W},${H} L0,${H} Z`
  const pathLen = 900

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`lg-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill={`url(#lg-${label})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={pathLen}
          strokeDashoffset={anim ? 0 : pathLen}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)' }} />
        {data.map((v, i) => (
          <circle key={i} cx={(i / (data.length - 1)) * W} cy={H - (v / max) * H}
            r="3.5" fill={color} stroke="#0a1f12" strokeWidth="1.5"
            opacity={anim ? 1 : 0}
            style={{ transition: `opacity .3s ease ${0.8 + i * 0.08}s` }} />
        ))}
        {data.map((v, i) => (
          <text key={`t${i}`}
            x={(i / (data.length - 1)) * W}
            y={H + 17}
            textAnchor="middle"
            fontSize="9" fontWeight="600" fontFamily="var(--font)"
            fill="rgba(255,255,255,.3)">
            {label[i]}
          </text>
        ))}
      </svg>
    </div>
  )
}

/* ── Live map SVG ───────────────────────────────────────────── */
function LiveMap() {
  const dots = [
    { cx: '32%', cy: '38%', r: 5, delay: '0s' },
    { cx: '54%', cy: '52%', r: 7, delay: '.4s' },
    { cx: '71%', cy: '30%', r: 5, delay: '.8s' },
    { cx: '22%', cy: '65%', r: 4, delay: '1.1s' },
    { cx: '64%', cy: '70%', r: 5, delay: '.6s' },
    { cx: '45%', cy: '24%', r: 6, delay: '1.4s' },
    { cx: '80%', cy: '58%', r: 4, delay: '1.8s' },
  ]
  const trails = [
    { x1: '32%', y1: '38%', x2: '54%', y2: '52%' },
    { x1: '54%', y1: '52%', x2: '71%', y2: '30%' },
    { x1: '54%', y1: '52%', x2: '64%', y2: '70%' },
    { x1: '22%', y1: '65%', x2: '32%', y2: '38%' },
    { x1: '71%', y1: '30%', x2: '80%', y2: '58%' },
    { x1: '45%', y1: '24%', x2: '32%', y2: '38%' },
  ]
  return (
    <div className="map-canvas">
      <div className="map-grid" />
      <svg className="map-trail-svg" aria-hidden>
        {trails.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="rgba(134,239,172,.22)" strokeWidth="1.2" strokeDasharray="5 5" />
        ))}
        {/* Active path highlight */}
        <polyline
          points="32%,38% 54%,52% 64%,70%"
          fill="none" stroke="rgba(134,239,172,.55)" strokeWidth="1.8"
          style={{ animation: 'blink 2s ease-in-out infinite' }} />
      </svg>
      {dots.map((d, i) => (
        <div key={i} className="map-pulse"
          style={{ left: d.cx, top: d.cy, width: d.r * 2, height: d.r * 2, marginLeft: -d.r, marginTop: -d.r, background: 'rgba(134,239,172,.9)', animationDelay: d.delay }} />
      ))}
      {/* GPS trail line */}
      <div className="map-badge">
        <div className="map-badge-label"><span className="live-dot" />Live tracking</div>
        <div className="map-badge-val">24 officers</div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const stuck  = useStuck()
  const [menu, setMenu] = useState(false)
  const navIds = ['home','about','services','process','contact']
  const active = useActiveSection(navIds)
  useReveal()

  useEffect(() => {
    const fn = () => { if (window.innerWidth > 1000) setMenu(false) }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const navLinks = [
    { l: 'Home',     h: '#home' },
    { l: 'About',    h: '#about' },
    { l: 'Services', h: '#services' },
    { l: 'Process',  h: '#process' },
    { l: 'Contact',  h: '#contact' },
  ]

  const services = [
    { icon:'🗺️', title:'Real-time GPS Tracking', body:'Monitor every field officer on a live map with precise GPS pings, trail history, and zone alerts.', feat:true },
    { icon:'📴', title:'Offline-First',           body:'Collect data anywhere — even with zero signal. Auto-syncs when connectivity is restored.' },
    { icon:'📋', title:'Smart Form Builder',      body:'Drag-and-drop custom data forms with GPS, photos, and conditional logic — no code required.', tall:true },
    { icon:'🌍', title:'GIS Dashboards',          body:'Interactive spatial visualizations, heatmaps, and cluster maps built for field intelligence.' },
    { icon:'🔐', title:'Role Management',         body:'Granular permissions across Admin, Supervisor, and Officer tiers.' },
    { icon:'📊', title:'Analytics & Reports',     body:'Export-ready reports, audit logs, and KPI dashboards out of the box.' },
  ]

  const steps = [
    { n:'01', title:'Register & Configure', body:'Admin sets up the org, defines zones, and invites the team via secure 6-digit invite codes.' },
    { n:'02', title:'Deploy Officers',      body:'Supervisors assign forms, routes, and tasks to field officers in their area.' },
    { n:'03', title:'Collect in the Field', body:'Officers check in, fill smart forms, and submit data with automatic GPS stamps.' },
    { n:'04', title:'Analyse & Act',        body:'Supervisors review live maps, dashboards, and audit trails to make decisions.' },
  ]

  // const roles = [
  //   { cls:'admin', emoji:'⚙️', title:'Admin', body:'Full system oversight — manage organizations, approve users, and monitor everything from one panel.', features:['Global map view','Organization management','User approvals','Audit logs','Presence monitoring'] },
  //   { cls:'sup',   emoji:'👁️', title:'Supervisor', body:'Team lead tools — build forms, track officers live, review submissions, and generate reports.', features:['Live team map','Form builder','Officer management','Reports & analytics','Notifications'] },
  //   { cls:'off',   emoji:'📍', title:'Field Officer', body:'Mobile-optimized collection — check in, submit forms, and track your own visits and history.', features:['GPS check-in','Offline forms','My submissions','Visit history','Announcements'] },
  // ]

  const barData = [
    { l:'Jan', v:42 }, { l:'Feb', v:61 }, { l:'Mar', v:38 }, { l:'Apr', v:74 },
    { l:'May', v:89, highlight:true }, { l:'Jun', v:65 }, { l:'Jul', v:91, highlight:true },
    { l:'Aug', v:57 }, { l:'Sep', v:82, highlight:true }, { l:'Oct', v:49 },
    { l:'Nov', v:76 }, { l:'Dec', v:95, highlight:true },
  ]

  const donutSlices = [
    { label: 'Survey',     v: 42, color: '#22c55e' },
    { label: 'Inspection', v: 28, color: '#16a34a' },
    { label: 'Monitoring', v: 19, color: '#166534' },
    { label: 'Audit',      v: 11, color: '#86efac' },
  ]

  const lineVals   = [28, 41, 35, 56, 49, 72, 68, 84, 77, 93, 89, 105]
  const lineMonths = ['J','F','M','A','M','J','J','A','S','O','N','D']

  const mq = ['Real-time Tracking','Offline Collection','Smart Forms','GIS Visualization','Team Management','Analytics','GPS Check-in','Audit Logs','Field Intelligence','Spatial Data']

  return (
    <>
      {/* MOBILE SIDEBAR OVERLAY */}
      <div
        className={`drawer-overlay ${menu ? "open" : ""}`}
        onClick={() => setMenu(false)}
      />

      {/* MOBILE SIDEBAR */}
      <div
        className={`drawer ${menu ? "open" : ""}`}
        role="dialog"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="drawer-header">
          <a
            href="#home"
            className="drawer-logo"
            onClick={() => setMenu(false)}
          >
            {/* <div className="drawer-logo-mark">
              <img src="/images/logo.jpeg" alt="GT Mapper" onError={e => e.target.style.display='none'} style={{ width: 34, height: 34, objectFit: 'contain' }} />
            </div> */}
            <div>
              <div className="drawer-logo-name">GT Mapper</div>
              <div className="drawer-logo-sub">GeoTreks Kenya</div>
            </div>
          </a>
          <button
            className="drawer-close"
            onClick={() => setMenu(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav className="drawer-nav">
          {navLinks.map((nl) => (
            <a
              key={nl.l}
              href={nl.h}
              className={active === nl.h.slice(1) ? "on" : ""}
              onClick={() => setMenu(false)}
            >
              {nl.l}
              <span className="arrow">→</span>
            </a>
          ))}
          <div className="drawer-divider" />
          <a href="#contact" onClick={() => setMenu(false)}>
            Contact
            <span className="arrow">→</span>
          </a>
        </nav>

        {/* Footer CTA */}
        <div className="drawer-footer">
          <a
            href="/login"
            className="drawer-cta"
            onClick={() => setMenu(false)}
          >
            Sign In <span style={{ fontSize: 15 }}>→</span>
          </a>
          <div className="drawer-contact">📍 GeoTreks Kenya · Nairobi</div>
        </div>
      </div>

      {/* NAV */}
      <header className={`n ${stuck ? "stuck" : ""}`}>
        <a href="#home" className="n-logo" aria-label="GT Mapper">
          {/* <LogoMark /> */}
          <div>
            <div className="n-name">GT Mapper</div>
            <div className="n-sub">GeoTreks Kenya</div>
          </div>
        </a>
        <nav className="n-links">
          {navLinks.map((nl) => (
            <a
              key={nl.l}
              href={nl.h}
              className={active === nl.h.slice(1) ? "on" : ""}
            >
              {nl.l}
            </a>
          ))}
        </nav>
        <a href="/login" className="n-cta">
          Sign In <span style={{ fontSize: 15 }}>→</span>
        </a>
        <button
          className={`ham ${menu ? "x" : ""}`}
          onClick={() => setMenu((v) => !v)}
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* HERO */}
      <section id="home" className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> GIS · Field Operations · Africa
          </div>
          <h1 className="h1">
            Map. Collect.
            <br />
            <em>Decide.</em>
          </h1>
          <p className="hero-body">
            GT Mapper replaces paper and guesswork with real-time GPS tracking,
            offline-capable smart forms, and spatial dashboards — built for
            teams working across Africa's toughest terrain.
          </p>
          <div className="hero-actions">
            <a href="/login" className="btn-lime">
              Get Started <span style={{ fontSize: 16 }}>→</span>
            </a>
            <a href="#services" className="btn-ghost">
              Explore platform
            </a>
          </div>
          <div className="stats">
            {[
              { n: "3", l: "User roles" },
              { n: "100%", l: "Offline capable" },
              { n: "Live", l: "GPS tracking" },
            ].map((s) => (
              <div key={s.l} className="stat">
                <div className="stat-n">{s.n}</div>
                <div className="stat-l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="scroll-hint" aria-hidden>
          Scroll <div className="scroll-line" />
        </div>
      </section>

      {/* MARQUEE */}
      <div className="mq-wrap" aria-hidden>
        <div className="mq">
          {[...mq, ...mq].map((t, i) => (
            <span key={i} className="mq-item">
              {t}
              <span className="mq-sep" />
            </span>
          ))}
        </div>
      </div>

      {/* DATA STRIP */}
      <div className="data-strip">
        <div className="data-strip-inner">
          {[
            { target: "2400", suffix: "+", label: "Data submissions today" },
            { target: "147", suffix: "", label: "Active field officers" },
            { target: "38", suffix: "", label: "Organizations on platform" },
            { target: "99", suffix: "%", label: "Uptime this month" },
          ].map((d) => (
            <div key={d.label} className="ds-card rv">
              <div className="ds-num">
                <Counter target={d.target} suffix={d.suffix} />
              </div>
              <div className="ds-label">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LIVE MAP + STATS */}
      <div className="map-section">
        <div className="map-inner">
          <div className="rv">
            <div className="tag" style={{ color: "var(--g300)" }}>
              Live View
            </div>
            <h2 className="h2" style={{ color: "#fff" }}>
              Your whole team
              <br />
              <em>on one map.</em>
            </h2>
            <p className="body-text" style={{ color: "rgba(255,255,255,.46)" }}>
              Every GPS ping, every check-in, every route — visible in real
              time. Watch officers move across zones, get alerts on deviations,
              and review full trail history for any assignment.
            </p>
            <div className="map-stat-list">
              {[
                { l: "Officers online now", v: "24 / 31" },
                { l: "Avg GPS accuracy", v: "±3.2 m" },
                { l: "Submissions in 1h", v: "187" },
                { l: "Active zones", v: "12" },
              ].map((r) => (
                <div key={r.l} className="map-stat-row">
                  <span className="map-stat-row-label">{r.l}</span>
                  <span className="map-stat-row-val">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rv" style={{ transitionDelay: ".15s" }}>
            <LiveMap />
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="charts-wrap" id="about">
        <div className="charts-inner">
          <div className="rv">
            <div className="tag">Analytics</div>
            <h2 className="h2">
              Data that speaks
              <br />
              <em>for itself.</em>
            </h2>
            <p className="body-text">
              Built-in dashboards turn raw field submissions into actionable
              spatial intelligence — no separate BI tool required.
            </p>
          </div>

          <div className="charts-grid">
            {/* Monthly submissions bar chart */}
            <div className="chart-card rv" style={{ transitionDelay: ".05s" }}>
              <div className="chart-card-title">Monthly Submissions</div>
              <div className="chart-card-sub">
                Field data collected per month · 2024
              </div>
              <BarChart data={barData} />
            </div>

            {/* Form type donut */}
            <div className="chart-card rv" style={{ transitionDelay: ".1s" }}>
              <div className="chart-card-title">Submissions by Type</div>
              <div className="chart-card-sub">
                Distribution across form categories
              </div>
              <DonutChart slices={donutSlices} />
            </div>

            {/* Activity heatmap — full width */}
            <div
              className="chart-card full rv"
              style={{ transitionDelay: ".15s" }}
            >
              <div className="chart-card-title">
                Submission Activity Heatmap
              </div>
              <div className="chart-card-sub">
                Daily field activity intensity across the year
              </div>
              <Heatmap />
            </div>

            {/* Officer growth line chart */}
            <div
              className="chart-card dark rv"
              style={{ transitionDelay: ".2s" }}
            >
              <div className="chart-card-title">Officer Deployments</div>
              <div className="chart-card-sub">Active officers per month</div>
              <LineChart data={lineVals} label={lineMonths} color="#22c55e" />
            </div>

            {/* Coverage stats */}
            <div
              className="chart-card rv"
              style={{
                transitionDelay: ".25s",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div className="chart-card-title">Coverage Stats</div>
                <div className="chart-card-sub">
                  Platform performance snapshot
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginTop: 10,
                }}
              >
                {[
                  { label: "GPS accuracy", pct: 96, color: "#22c55e" },
                  { label: "Offline sync success", pct: 99, color: "#16a34a" },
                  { label: "Form completion rate", pct: 87, color: "#15803d" },
                  { label: "Data upload speed", pct: 91, color: "#166534" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(10,15,13,.6)",
                        }}
                      >
                        {stat.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "var(--mono)",
                          fontWeight: 600,
                          color: stat.color,
                        }}
                      >
                        {stat.pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "rgba(10,35,24,.08)",
                        borderRadius: 99,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${stat.pct}%`,
                          background: stat.color,
                          borderRadius: 99,
                          transition: "width 1.2s cubic-bezier(.4,0,.2,1)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SERVICES BENTO */}
      <section id="services">
        <div className="sec" style={{ paddingTop: 0 }}>
          <div className="rv">
            <div className="tag">Features</div>
            <h2 className="h2">
              Everything your
              <br />
              team <em>needs.</em>
            </h2>
          </div>
          <div className="bento">
            {services.map((s, i) => (
              <div
                key={s.title}
                className={`bcard rv ${s.feat ? "feat" : ""}`}
                style={{ transitionDelay: `${i * 0.07}s` }}
              >
                <div className="bcard-icon">{s.icon}</div>
                <div className="bcard-title">{s.title}</div>
                <div className="bcard-body">{s.body}</div>
                {s.feat && <div className="bcard-tag">Core Feature</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div id="process" className="how">
        <div className="how-inner">
          <div className="rv">
            <div className="tag">Process</div>
            <h2 className="h2">
              From deploy to
              <br />
              <em>data.</em>
            </h2>
          </div>
          <div className="steps">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="step rv"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="step-n">{s.n}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-body">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROLES */}
      {/* <section id="roles">
        <div className="sec">
          <div className="rv">
            <div className="tag">Roles</div>
            <h2 className="h2">One platform,<br /><em>three roles.</em></h2>
            <p className="body-text">GT Mapper gives each team member exactly the tools they need — nothing more, nothing less.</p>
          </div>
          <div className="roles-grid">
            {roles.map((r, i) => (
              <div key={r.cls} className={`role ${r.cls} rv`} style={{ transitionDelay: `${i * .1}s` }}>
                <div className="role-emoji">{r.emoji}</div>
                <div className="role-title">{r.title}</div>
                <div className="role-body">{r.body}</div>
                <ul className="role-list">{r.features.map(f => <li key={f}>{f}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* CTA */}
      <div className="cta">
        <h2 className="cta-h2 rv">
          Ready to map
          <br />
          your fieldwork?
        </h2>
        <p className="cta-body rv" style={{ transitionDelay: ".1s" }}>
          Join field teams across Africa already using GT Mapper.
        </p>
        <a
          href="/login"
          className="btn-dark rv"
          style={{ transitionDelay: ".2s" }}
        >
          Start using GT Mapper →
        </a>
      </div>

      {/* FOOTER */}
      <footer id="contact" className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {/* <div className="footer-mark">
                  {(() => { const [err, setErr] = useState(false); return err ? <span className="footer-mark-fb">G</span> : <img src="/images/logo.jpeg" alt="" onError={() => setErr(true)} style={{ width: 34, height: 34, objectFit: 'contain' }} /> })()}
                </div> */}
                <span className="footer-brand">GT Mapper</span>
                <div className="n-sub">GeoTreks Kenya</div>
              </div>
              <p className="footer-tagline">
                Real-time field data collection and GIS platform for teams
                across Africa. Built by GeoTreks Kenya.
              </p>
            </div>
            <div>
              <div className="footer-col-title">Platform</div>
              <div className="footer-links">
                {["Features", "How it Works", "Sign In"].map((l) => (
                  <a key={l} href="#">
                    {l}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <div className="footer-col-title">Contact</div>
              <div className="footer-links">
                <a href="mailto:info@geotreks.co.ke">info@geotreks.co.ke</a>
                <a
                  href="https://geotreks.co.ke"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GeoTreks Kenya
                </a>
                <a>Nairobi, Kenya</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">
              © {new Date().getFullYear()} GeoTreks Kenya · All rights reserved
            </span>
            <span className="footer-ver">GT Mapper</span>
          </div>
        </div>
      </footer>
    </>
  );
}
