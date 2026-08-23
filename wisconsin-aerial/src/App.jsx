import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plane, Radar, Layers, SlidersHorizontal, Columns, Upload, CheckCircle2,
  Circle, ChevronRight, MapPin, Calendar, TrendingUp, Crosshair,
  ArrowLeftRight, Building2, X, Loader2, ImagePlus, ArrowLeft, Home,
  Share2, Link2, Copy, Check, ShieldCheck, LogOut, Satellite, FolderInput,
  Images, Compass, Clock, ChevronDown, Download, FileText
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tokens                                                              */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#080B10",
  panel: "#11161D",
  panel2: "#1B222C",
  line: "#232C38",
  cyan: "#3ED6C4",
  cyanDim: "#215C56",
  orange: "#FF5D2E",
  text: "#EDF1F5",
  muted: "#8B96A3",
  faint: "#4F5A66",
  ok: "#6FCF97",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.font-display { font-family: 'Bricolage Grotesque', system-ui, sans-serif; letter-spacing: -0.015em; }
.font-body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
.font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}
@keyframes driftGlow {
  0% { transform: translate(0,0) scale(1); }
  50% { transform: translate(3%, -4%) scale(1.08); }
  100% { transform: translate(0,0) scale(1); }
}

.fade-in-up { animation: fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both; }
.card-lift {
  transition: transform 0.35s cubic-bezier(0.16,1,0.3,1),
              box-shadow 0.35s cubic-bezier(0.16,1,0.3,1),
              border-color 0.35s ease;
}
.card-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px -16px rgba(0,0,0,0.55), 0 0 0 1px rgba(62,214,196,0.15);
  border-color: rgba(62,214,196,0.25) !important;
}
.btn-modern {
  transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), filter 0.2s ease, box-shadow 0.2s ease;
}
.btn-modern:hover { filter: brightness(1.1); }
.btn-modern:active { transform: scale(0.96); }

.glass {
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}
.ambient-glow { animation: driftGlow 16s ease-in-out infinite; }
.live-dot { animation: glowPulse 2.4s ease-in-out infinite; }

.nav-underline {
  position: relative;
  overflow: hidden;
}
.nav-underline::after {
  content: "";
  position: absolute;
  left: 0; bottom: 0;
  height: 2px; width: 100%;
  background: linear-gradient(90deg, #FF5D2E, #3ED6C4);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
}
.nav-underline.is-active::after { transform: scaleX(1); }

@media (prefers-reduced-motion: reduce) {
  .fade-in-up, .card-lift, .btn-modern, .ambient-glow, .live-dot, .nav-underline::after {
    animation: none !important;
    transition: none !important;
  }
}

@media print {
  body * { visibility: hidden; }
  #printable-report, #printable-report * { visibility: visible; }
  #printable-report { position: absolute; inset: 0; width: 100%; margin: 0; }
  .no-print { display: none !important; }
}
`;

/* ------------------------------------------------------------------ */
/*  Seeded RNG                                                          */
/* ------------------------------------------------------------------ */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Site data — buildings carry a stage timeline so week-over-week      */
/*  scenes are deterministic and the diff signal is meaningful          */
/* ------------------------------------------------------------------ */
const WEEK_DATES = ["Jul 13", "Jul 20", "Jul 27", "Aug 3", "Aug 10", "Aug 17"];

const SITES = [
  {
    id: "foundry-row",
    name: "Foundry Row — Phase 2",
    address: "1180 Kestrel Way, Marrow County",
    client: "Kestrel Development Group",
    type: "Multifamily construction",
    lat: 39.7684, lon: -86.1581,
    icon: Building2,
    terrain: ["#4b4536", "#3c3728"],
    bounds: { x: 40, y: 40, w: 400, h: 220 },
    roads: [{ x1: 0, y1: 250, x2: 480, y2: 250, w: 26 }],
    buildings: [
      { x: 70, y: 70, w: 90, h: 60, stages: [{ w: 1, c: "#8a7256" }, { w: 2, c: "#9aa3ab" }, { w: 3, c: "#caa06b" }, { w: 5, c: "#e3ddd0" }] },
      { x: 180, y: 70, w: 90, h: 60, stages: [{ w: 1, c: "#8a7256" }, { w: 2, c: "#9aa3ab" }, { w: 4, c: "#caa06b" }] },
      { x: 290, y: 70, w: 90, h: 60, stages: [{ w: 2, c: "#8a7256" }, { w: 3, c: "#9aa3ab" }] },
      { x: 70, y: 150, w: 200, h: 40, stages: [{ w: 4, c: "#8a7256" }, { w: 5, c: "#9aa3ab" }, { w: 6, c: "#caa06b" }] },
    ],
  },
  {
    id: "riverstone",
    name: "Riverstone Commercial Plaza",
    address: "402 Halden Ave, Riverstone",
    client: "Halden Retail Partners",
    type: "Retail build-out",
    lat: 39.8012, lon: -86.1102,
    icon: Building2,
    terrain: ["#5a5648", "#454135"],
    bounds: { x: 30, y: 30, w: 420, h: 240 },
    roads: [{ x1: 0, y1: 60, x2: 480, y2: 60, w: 22 }, { x1: 250, y1: 0, x2: 250, y2: 300, w: 18 }],
    buildings: [
      { x: 60, y: 100, w: 150, h: 110, stages: [{ w: 1, c: "#8a7256" }, { w: 2, c: "#9aa3ab" }, { w: 4, c: "#caa06b" }, { w: 6, c: "#e3ddd0" }] },
      { x: 300, y: 100, w: 130, h: 90, stages: [{ w: 3, c: "#8a7256" }, { w: 4, c: "#9aa3ab" }, { w: 5, c: "#caa06b" }] },
      { x: 300, y: 200, w: 130, h: 50, stages: [{ w: 5, c: "#8a7256" }] },
    ],
  },
  {
    id: "maple-ridge",
    name: "Maple Ridge Estates — Lot 14",
    address: "14 Songbird Ct, Maple Ridge",
    client: "Maple Ridge Realty",
    type: "Residential listing",
    lat: 39.8467, lon: -86.2201,
    icon: Home,
    terrain: ["#4a5636", "#3a4429"],
    bounds: { x: 60, y: 60, w: 360, h: 190 },
    roads: [{ x1: 0, y1: 40, x2: 480, y2: 40, w: 20 }],
    buildings: [
      { x: 160, y: 100, w: 160, h: 100, stages: [{ w: 1, c: "#caa06b" }, { w: 3, c: "#e3ddd0" }] },
      { x: 100, y: 210, w: 60, h: 30, stages: [{ w: 4, c: "#9aa3ab" }] },
      { x: 330, y: 90, w: 45, h: 45, stages: [{ w: 5, c: "#9aa3ab" }] },
    ],
  },
  {
    id: "overlook",
    name: "Overlook Business Park — Parcel C",
    address: "9 Ridgeline Dr, Overlook",
    client: "Overlook Land Holdings",
    type: "Land / grading",
    lat: 39.7211, lon: -86.0893,
    icon: MapPin,
    terrain: ["#6b6144", "#554d36"],
    bounds: { x: 30, y: 30, w: 420, h: 240 },
    roads: [{ x1: 0, y1: 270, x2: 480, y2: 270, w: 24 }],
    buildings: [
      { x: 80, y: 80, w: 320, h: 30, stages: [{ w: 2, c: "#8a7256" }] },
      { x: 80, y: 130, w: 150, h: 20, stages: [{ w: 4, c: "#8a7256" }] },
      { x: 260, y: 130, w: 140, h: 20, stages: [{ w: 5, c: "#8a7256" }] },
    ],
  },
];

const W = 480, H = 300;

/* ------------------------------------------------------------------ */
/*  Procedural scene renderer                                           */
/* ------------------------------------------------------------------ */
function stageColorAt(building, week) {
  let c = null;
  for (const s of building.stages) if (s.w <= week) c = s.c;
  return c;
}

function drawScene(ctx, site, week) {
  ctx.clearRect(0, 0, W, H);
  const rngSite = mulberry32(hashStr(site.id));
  const rngWeek = mulberry32(hashStr(site.id + "-" + week));

  // terrain
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, site.terrain[0]);
  grad.addColorStop(1, site.terrain[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ground speckle texture (seeded by site only — stable across weeks)
  for (let i = 0; i < 220; i++) {
    const x = rngSite() * W, y = rngSite() * H, r = 0.6 + rngSite() * 1.4;
    ctx.fillStyle = `rgba(0,0,0,${0.05 + rngSite() * 0.08})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // roads
  ctx.strokeStyle = "#2b2a27";
  site.roads.forEach((r) => {
    ctx.lineWidth = r.w;
    ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke();
    ctx.strokeStyle = "#c9c2a8"; ctx.lineWidth = 1.2; ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle = "#2b2a27";
  });

  // parcel boundary
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  ctx.strokeRect(site.bounds.x, site.bounds.y, site.bounds.w, site.bounds.h);
  ctx.setLineDash([]);

  // buildings by stage
  site.buildings.forEach((b) => {
    const col = stageColorAt(b, week);
    if (!col) return;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(b.x + 4, b.y + 4, b.w, b.h);
    ctx.fillStyle = col;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const finalStage = b.stages[b.stages.length - 1];
    if (finalStage.w <= week && (col === "#e3ddd0")) {
      ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h / 2); ctx.lineTo(b.x + b.w, b.y + b.h / 2); ctx.stroke();
      ctx.fillStyle = "rgba(60,110,140,0.55)";
      for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 18) ctx.fillRect(wx, b.y + 8, 8, 8);
    }
  });

  // equipment (vehicles) — position changes week to week
  const eqCount = 2 + Math.floor(rngWeek() * 3);
  for (let i = 0; i < eqCount; i++) {
    const x = site.bounds.x + rngWeek() * site.bounds.w;
    const y = site.bounds.y + rngWeek() * site.bounds.h;
    ctx.fillStyle = C.orange;
    ctx.fillRect(x, y, 10, 6);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + 1, y + 6, 3, 2); ctx.fillRect(x + 6, y + 6, 3, 2);
  }

  // north arrow + scale bar (signature reticle motif)
  ctx.save();
  ctx.translate(W - 34, 34);
  ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 16); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-4, -6); ctx.lineTo(4, -6); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(16, H - 20, 40, 3);
  ctx.font = "9px monospace";
  ctx.fillText("50 M", 16, H - 24);
}

function canvasFor(site, week) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  drawScene(c.getContext("2d"), site, week);
  return c;
}

function loadImageToCanvas(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
      resolve(c);
    };
    img.src = dataUrl;
  });
}

async function sceneCanvas(site, weekEntry) {
  if (weekEntry.real) return loadImageToCanvas(weekEntry.dataUrl);
  return canvasFor(site, weekEntry.n);
}

function diffCanvases(canvasA, canvasB) {
  const a = canvasA.getContext("2d").getImageData(0, 0, W, H).data;
  const b = canvasB.getContext("2d").getImageData(0, 0, W, H).data;
  const mask = document.createElement("canvas");
  mask.width = W; mask.height = H;
  const mctx = mask.getContext("2d");
  const out = mctx.createImageData(W, H);
  let changed = 0;
  for (let i = 0; i < a.length; i += 4) {
    const dist = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (dist > 70) {
      changed++;
      out.data[i] = 255; out.data[i + 1] = 93; out.data[i + 2] = 46;
      out.data[i + 3] = Math.min(255, 130 + dist * 0.3);
    }
  }
  mctx.putImageData(out, 0, 0);
  return { maskUrl: mask.toDataURL(), percent: (changed / (W * H)) * 100 };
}

/* ------------------------------------------------------------------ */
/*  Small UI atoms                                                      */
/* ------------------------------------------------------------------ */
function Badge({ children, tone = "muted" }) {
  const map = {
    muted: { bg: "rgba(139,150,163,0.12)", fg: C.muted },
    cyan: { bg: "rgba(62,214,196,0.14)", fg: C.cyan },
    orange: { bg: "rgba(255,93,46,0.15)", fg: C.orange },
    ok: { bg: "rgba(111,207,151,0.12)", fg: C.ok },
  }[tone];
  return (
    <span className="font-mono text-[10px] tracking-wide uppercase px-2 py-1 rounded-md"
      style={{ background: map.bg, color: map.fg }}>
      {children}
    </span>
  );
}

function NavButton({ active, icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className={`nav-underline w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors ${active ? "is-active" : ""}`}
      style={{
        background: active ? C.panel2 : "transparent",
        color: active ? C.text : C.muted,
        borderLeft: active ? `2px solid ${C.orange}` : "2px solid transparent",
      }}>
      <Icon size={16} strokeWidth={2} />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Flight log strip                                                    */
/* ------------------------------------------------------------------ */
function FlightLogStrip({ weeks, selected, onToggle }) {
  return (
    <div className="rounded-xl p-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.faint }}>
          Flight log — select two captures to compare
        </div>
        <Radar size={14} color={C.faint} />
      </div>
      <div className="flex items-end gap-0 overflow-x-auto pb-1">
        {weeks.map((w, i) => {
          const isSel = selected.includes(w.n);
          return (
            <React.Fragment key={w.n}>
              {i > 0 && <div className="h-px w-6 shrink-0" style={{ background: C.line }} />}
              <button onClick={() => onToggle(w.n)} className="flex flex-col items-center gap-1.5 shrink-0 px-2 group">
                <div className="w-px h-3" style={{ background: isSel ? C.orange : C.faint }} />
                <div className="w-3 h-3 rounded-full transition-all"
                  style={{
                    background: isSel ? C.orange : C.panel2,
                    border: `2px solid ${isSel ? C.orange : C.line}`,
                    boxShadow: isSel ? `0 0 0 3px rgba(255,93,46,0.18)` : "none",
                  }} />
                <div className="font-mono text-[10px]" style={{ color: isSel ? C.text : C.faint }}>W{w.n}</div>
                <div className="font-mono text-[9px]" style={{ color: isSel ? C.muted : C.faint }}>{w.date}</div>
                {w.real && <div className="live-dot font-mono text-[8px]" style={{ color: C.cyan }}>NEW</div>}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slider compare                                                      */
/* ------------------------------------------------------------------ */
function SliderCompare({ before, after, labelBefore, labelAfter }) {
  const ref = useRef(null);
  const [pct, setPct] = useState(50);
  const dragging = useRef(false);

  const move = useCallback((clientX) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    let p = ((clientX - rect.left) / rect.width) * 100;
    p = Math.max(0, Math.min(100, p));
    setPct(p);
  }, []);

  useEffect(() => {
    const onMove = (e) => { if (dragging.current) move(e.touches ? e.touches[0].clientX : e.clientX); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [move]);

  return (
    <div className="select-none">
      <div ref={ref} className="relative w-full rounded-lg overflow-hidden cursor-ew-resize"
        style={{ aspectRatio: `${W}/${H}`, border: `1px solid ${C.line}` }}
        onMouseDown={(e) => { dragging.current = true; move(e.clientX); }}
        onTouchStart={(e) => { dragging.current = true; move(e.touches[0].clientX); }}>
        <img src={after} alt="after" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
          <img src={before} alt="before" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        </div>
        <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${pct}%`, background: C.orange }}>
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: C.orange, boxShadow: "0 4px 14px rgba(255,93,46,0.4)" }}>
            <ArrowLeftRight size={14} color="#0A0E13" />
          </div>
        </div>
        <div className="absolute top-2 left-2"><Badge tone="muted">{labelBefore}</Badge></div>
        <div className="absolute top-2 right-2"><Badge tone="cyan">{labelAfter}</Badge></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Compare workspace (slider / side-by-side / highlight)               */
/* ------------------------------------------------------------------ */
function CompareWorkspace({ site, weekA, weekB }) {
  const [imgA, setImgA] = useState(null);
  const [imgB, setImgB] = useState(null);
  const [diff, setDiff] = useState(null);
  const [mode, setMode] = useState("slider");
  const [opacity, setOpacity] = useState(85);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [ca, cb] = await Promise.all([sceneCanvas(site, weekA), sceneCanvas(site, weekB)]);
      if (cancelled) return;
      setImgA(ca.toDataURL());
      setImgB(cb.toDataURL());
      setDiff(diffCanvases(ca, cb));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [site, weekA, weekB]);

  if (loading || !imgA || !imgB) {
    return (
      <div className="rounded-xl flex items-center justify-center gap-2 font-mono text-xs"
        style={{ background: C.panel, border: `1px solid ${C.line}`, aspectRatio: `${W}/${H}`, color: C.muted }}>
        <Loader2 size={14} className="animate-spin" /> Rendering comparison…
      </div>
    );
  }

  const labelA = `W${weekA.n} · ${weekA.date}`;
  const labelB = `W${weekB.n} · ${weekB.date}`;

  return (
    <div className="fade-in-up rounded-xl p-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {[
            { id: "slider", label: "Slider", icon: SlidersHorizontal },
            { id: "side", label: "Side-by-side", icon: Columns },
            { id: "highlight", label: "Highlight", icon: Layers },
          ].map((t) => (
            <button key={t.id} onClick={() => setMode(t.id)}
              className="btn-modern flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body"
              style={{
                background: mode === t.id ? C.orange : C.panel2,
                color: mode === t.id ? "#160C05" : C.muted,
                fontWeight: mode === t.id ? 600 : 400,
              }}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: C.muted }}>
          <TrendingUp size={13} color={C.orange} />
          <span style={{ color: C.orange, fontWeight: 600 }}>{diff.percent.toFixed(1)}%</span>
          surface area changed
        </div>
      </div>

      {mode === "slider" && (
        <SliderCompare before={imgA} after={imgB} labelBefore={labelA} labelAfter={labelB} />
      )}

      {mode === "side" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <img src={imgA} className="w-full rounded-lg" style={{ border: `1px solid ${C.line}` }} />
            <div className="mt-2"><Badge>{labelA}</Badge></div>
          </div>
          <div>
            <img src={imgB} className="w-full rounded-lg" style={{ border: `1px solid ${C.line}` }} />
            <div className="mt-2"><Badge tone="cyan">{labelB}</Badge></div>
          </div>
        </div>
      )}

      {mode === "highlight" && (
        <div>
          <div className="relative w-full rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            <img src={imgB} className="w-full block" />
            <img src={diff.maskUrl} className="absolute inset-0 w-full h-full" style={{ opacity: opacity / 100 }} />
            <div className="absolute top-2 right-2"><Badge tone="orange">Changed area</Badge></div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="font-mono text-[10px]" style={{ color: C.faint }}>OVERLAY</span>
            <input type="range" min="0" max="100" value={opacity}
              onChange={(e) => setOpacity(+e.target.value)} className="flex-1 accent-orange-500" />
            <span className="font-mono text-[10px] w-8 text-right" style={{ color: C.muted }}>{opacity}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                            */
/* ------------------------------------------------------------------ */
function SiteCard({ site, onOpen, index = 0 }) {
  const [thumb, setThumb] = useState(null);
  const [pct, setPct] = useState(null);
  const weeks = site._weeks;
  useEffect(() => {
    const last = weeks[weeks.length - 1], prev = weeks[weeks.length - 2];
    (async () => {
      const [ca, cb] = await Promise.all([sceneCanvas(site, prev), sceneCanvas(site, last)]);
      setThumb(cb.toDataURL());
      setPct(diffCanvases(ca, cb).percent);
    })();
  }, [site]);
  const Icon = site.icon;
  const last = weeks[weeks.length - 1];
  return (
    <button onClick={() => onOpen(site.id)}
      className="card-lift fade-in-up text-left rounded-2xl overflow-hidden"
      style={{ background: C.panel, border: `1px solid ${C.line}`, animationDelay: `${index * 70}ms` }}>
      <div className="relative" style={{ aspectRatio: `${W}/${H}`, background: C.panel2 }}>
        {thumb ? <img src={thumb} className="w-full h-full object-cover" /> :
          <div className="w-full h-full flex items-center justify-center"><Loader2 size={16} className="animate-spin" color={C.faint} /></div>}
        <div className="absolute top-2 left-2"><Badge tone="cyan">W{last.n} · {last.date}</Badge></div>
        {pct !== null && (
          <div className="absolute top-2 right-2"><Badge tone={pct > 4 ? "orange" : "muted"}>{pct.toFixed(1)}% Δ this week</Badge></div>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={14} color={C.cyan} />
          <span className="font-display text-sm font-semibold" style={{ color: C.text }}>{site.name}</span>
        </div>
        <div className="font-mono text-[11px] mb-2" style={{ color: C.faint }}>{site.address}</div>
        <div className="flex items-center justify-between">
          <span className="font-body text-xs" style={{ color: C.muted }}>{site.type}</span>
          <ChevronRight size={14} color={C.faint} />
        </div>
      </div>
    </button>
  );
}

function Dashboard({ sites, onOpen }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: C.text }}>Active sites</h1>
        <p className="font-body text-sm mt-1" style={{ color: C.muted }}>
          {sites.length} sites under aerial survey · flown on a weekly cadence
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sites.map((s, i) => <SiteCard key={s.id} site={s} onOpen={onOpen} index={i} />)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Site detail                                                         */
/* ------------------------------------------------------------------ */
function ShareModal({ site, onClose, onPreview }) {
  const [copied, setCopied] = useState(false);
  const token = useMemo(() => Math.abs(hashStr(site.id + "-share")).toString(36).slice(0, 8), [site.id]);
  const link = `https://view.wisconsin-aerial.com/${site.id}/${token}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="glass fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(5,7,10,0.72)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="fade-in-up w-full max-w-md rounded-2xl p-6"
        style={{ background: C.panel, border: `1px solid ${C.line}`, boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 size={16} color={C.orange} />
            <h3 className="font-display text-lg font-semibold" style={{ color: C.text }}>Share with client</h3>
          </div>
          <button onClick={onClose}><X size={16} color={C.faint} /></button>
        </div>
        <p className="font-body text-sm mb-4" style={{ color: C.muted }}>
          Anyone with this link gets a read-only report for <span style={{ color: C.text }}>{site.name}</span> —
          flight history, side-by-side captures, and change highlights. No sign-in, no access to other sites.
        </p>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-4" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
          <Link2 size={13} color={C.faint} className="shrink-0" />
          <span className="font-mono text-[11px] truncate flex-1" style={{ color: C.muted }}>{link}</span>
          <button onClick={copy} className="btn-modern shrink-0 flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded"
            style={{ background: copied ? "rgba(111,207,151,0.15)" : C.panel, color: copied ? C.ok : C.cyan }}>
            {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button onClick={onPreview} className="btn-modern w-full py-2.5 rounded-lg font-body text-sm font-medium flex items-center justify-center gap-2"
          style={{ background: C.orange, color: "#160C05", boxShadow: "0 8px 24px -8px rgba(255,93,46,0.45)" }}>
          <Compass size={14} /> Preview what your client sees
        </button>
      </div>
    </div>
  );
}

function SiteDetail({ site, onBack, onPreviewClient }) {
  const weeks = site._weeks;
  const [selected, setSelected] = useState([weeks[weeks.length - 2].n, weeks[weeks.length - 1].n]);
  const [showShare, setShowShare] = useState(false);

  const toggle = (n) => {
    setSelected((sel) => {
      if (sel.includes(n)) return sel.length === 1 ? sel : sel.filter((x) => x !== n);
      if (sel.length < 2) return [...sel, n].sort((a, b) => a - b);
      return [n];
    });
  };

  const sorted = [...selected].sort((a, b) => a - b);
  const weekA = weeks.find((w) => w.n === sorted[0]);
  const weekB = weeks.find((w) => w.n === (sorted[1] ?? sorted[0]));
  const Icon = site.icon;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 mb-4 font-mono text-[11px]" style={{ color: C.faint }}>
        <ArrowLeft size={13} /> All sites
      </button>
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon size={18} color={C.cyan} />
          <h1 className="font-display text-2xl font-semibold" style={{ color: C.text }}>{site.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onPreviewClient(site.id, "pdf")}
            className="btn-modern flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-medium"
            style={{ background: C.panel2, color: C.muted, border: `1px solid ${C.line}` }}>
            <FileText size={13} /> PDF report
          </button>
          <button onClick={() => setShowShare(true)}
            className="btn-modern flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-medium"
            style={{ background: C.panel2, color: C.cyan, border: `1px solid ${C.cyanDim}` }}>
            <Share2 size={13} /> Share with client
          </button>
        </div>
      </div>
      <div className="font-mono text-xs mb-6 flex items-center gap-1.5" style={{ color: C.faint }}>
        <MapPin size={12} /> {site.address}
      </div>

      <div className="mb-4">
        <FlightLogStrip weeks={weeks} selected={selected} onToggle={toggle} />
      </div>

      {selected.length < 2 ? (
        <div className="rounded-xl p-8 text-center font-body text-sm" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.muted }}>
          Select one more capture on the flight log to build a comparison.
        </div>
      ) : (
        <CompareWorkspace site={site} weekA={weekA} weekB={weekB} />
      )}

      {showShare && (
        <ShareModal site={site} onClose={() => setShowShare(false)}
          onPreview={() => { setShowShare(false); onPreviewClient(site.id); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Receiving engine — batch ingest from DJI Air 3S                     */
/* ------------------------------------------------------------------ */
const PIPELINE_STEPS = [
  { label: "Receiving imagery from DJI Air 3S", icon: Satellite },
  { label: "Extracting GPS + EXIF flight metadata", icon: Compass },
  { label: "Matching flight path to project boundary", icon: MapPin },
  { label: "Stitching orthomosaic composite", icon: Layers },
  { label: "Aligning to the prior capture", icon: SlidersHorizontal },
  { label: "Running change-detection analysis", icon: TrendingUp },
];

function metersToDeg(m) { return m / 111111; }

function buildReceivedFile(file, index, seedBase) {
  const rng = mulberry32(hashStr(seedBase + "-" + file.name + "-" + index));
  return {
    id: seedBase + "-" + index,
    file,
    name: file.name,
    dataUrl: null,
    alt: Math.round(260 + rng() * 40),
    dLat: (rng() - 0.5) * metersToDeg(120),
    dLon: (rng() - 0.5) * metersToDeg(120),
    t: index * 3,
  };
}

function ReceivingEngine({ sites, onIngested, onOpenSite }) {
  const [received, setReceived] = useState([]); // {id,file,name,dataUrl,alt,dLat,dLon,t}
  const [dragOver, setDragOver] = useState(false);
  const [detectedId, setDetectedId] = useState(null);
  const [siteId, setSiteId] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [stage, setStage] = useState(-1);
  const timerRef = useRef(null);

  const site = sites.find((s) => s.id === (siteId || detectedId));

  const handleFiles = (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const seedBase = "batch-" + Date.now();
    const entries = files.map((f, i) => buildReceivedFile(f, i, seedBase));
    entries.forEach((e) => {
      const reader = new FileReader();
      reader.onload = () => setReceived((prev) => prev.map((p) => (p.id === e.id ? { ...p, dataUrl: reader.result } : p)));
      reader.readAsDataURL(e.file);
    });
    setReceived((prev) => [...prev, ...entries]);

    // "detect" the project by hashing filenames against known sites
    const h = Math.abs(hashStr(files.map((f) => f.name).join("|") || seedBase));
    const idx = h % sites.length;
    const rng = mulberry32(h);
    setDetectedId(sites[idx].id);
    setSiteId(sites[idx].id);
    setConfidence(Math.round(91 + rng() * 8));
    setStage(-1);
  };

  const clearBatch = () => { setReceived([]); setDetectedId(null); setSiteId(null); setConfidence(null); setStage(-1); };

  const begin = () => {
    setStage(0);
    let s = 0;
    timerRef.current = setInterval(() => {
      s += 1;
      setStage(s);
      if (s >= PIPELINE_STEPS.length) clearInterval(timerRef.current);
    }, 650);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const done = stage >= PIPELINE_STEPS.length;
  const hero = received[0];

  const finish = () => {
    const weeks = site._weeks;
    const nextN = weeks[weeks.length - 1].n + 1;
    onIngested(site.id, { n: nextN, date: "New", real: true, dataUrl: hero.dataUrl, sourceCount: received.length });
    onOpenSite(site.id);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FolderInput size={18} color={C.cyan} />
          <h1 className="font-display text-2xl font-semibold" style={{ color: C.text }}>Receiving engine</h1>
        </div>
        <p className="font-body text-sm" style={{ color: C.muted }}>
          Drop the full image batch straight off the Air 3S SD card. The engine reads flight metadata, matches it to a
          project, stitches a composite, and runs change detection automatically.
        </p>
      </div>

      {received.length === 0 && (
        <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className="rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3 transition-colors"
          style={{ background: C.panel, border: `2px dashed ${dragOver ? C.orange : C.line}` }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.panel2 }}>
            <Plane size={22} color={C.cyan} />
          </div>
          <div className="font-body text-sm" style={{ color: C.text }}>Drop a batch of flight images here</div>
          <div className="font-mono text-[11px]" style={{ color: C.faint }}>JPEG · any number of files · Air 3S gimbal camera</div>
          <label className="btn-modern mt-2 px-4 py-2 rounded-lg font-body text-xs cursor-pointer flex items-center gap-2"
            style={{ background: C.panel2, color: C.cyan, border: `1px solid ${C.cyanDim}` }}>
            <ImagePlus size={13} /> Choose files
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
        </div>
      )}

      {received.length > 0 && (
        <>
          <div className="rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3"
            style={{ background: C.panel, border: `1px solid ${C.line}` }}>
            <div className="flex items-center gap-2">
              <Images size={15} color={C.cyan} />
              <span className="font-body text-sm" style={{ color: C.text }}>{received.length} images received</span>
            </div>
            {stage === -1 && (
              <button onClick={clearBatch} className="font-mono text-[10px] uppercase tracking-wide" style={{ color: C.faint }}>
                Clear batch
              </button>
            )}
          </div>

          <div className="rounded-xl p-4 mb-4 overflow-x-auto" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
            <div className="flex gap-3">
              {received.map((r, i) => (
                <div key={r.id} className="shrink-0 w-28 rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}`, background: C.panel2 }}>
                  <div className="w-full" style={{ aspectRatio: "4/3" }}>
                    {r.dataUrl ? <img src={r.dataUrl} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center"><Loader2 size={12} className="animate-spin" color={C.faint} /></div>}
                  </div>
                  <div className="p-1.5 font-mono text-[8.5px] leading-tight" style={{ color: C.faint }}>
                    <div>{(site?.lat + r.dLat).toFixed(4)}, {(site?.lon + r.dLon).toFixed(4)}</div>
                    <div>{r.alt} ft AGL · t+{r.t}s</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {stage === -1 && (
            <div className="fade-in-up rounded-xl p-5 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={14} color={C.ok} />
                <span className="font-body text-sm" style={{ color: C.text }}>
                  Detected project: <span style={{ color: C.cyan, fontWeight: 600 }}>{sites.find((s) => s.id === detectedId)?.name}</span>
                </span>
                <Badge tone="ok">{confidence}% confidence</Badge>
              </div>
              <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.faint }}>Not this project? Assign manually</label>
              <select value={siteId || ""} onChange={(e) => setSiteId(e.target.value)}
                className="w-full mt-1.5 rounded-lg px-3 py-2 font-body text-sm outline-none"
                style={{ background: C.panel2, color: C.text, border: `1px solid ${C.line}` }}>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={begin} className="btn-modern w-full mt-4 py-3 rounded-lg font-body text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: C.orange, color: "#160C05", boxShadow: "0 8px 24px -8px rgba(255,93,46,0.45)" }}>
                <Upload size={15} /> Process batch
              </button>
            </div>
          )}

          {stage >= 0 && (
            <div className="fade-in-up rounded-xl p-5" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
              <div className="space-y-3">
                {PIPELINE_STEPS.map((step, i) => {
                  const isDone = i < stage, isActive = i === stage && !done;
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      {isDone ? <CheckCircle2 size={16} color={C.ok} /> :
                        isActive ? <Loader2 size={16} className="animate-spin" color={C.cyan} /> :
                        <Circle size={16} color={C.faint} />}
                      <Icon size={13} color={isDone || isActive ? C.muted : C.faint} />
                      <span className="font-body text-sm" style={{ color: isDone || isActive ? C.text : C.faint }}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
              {done && (
                <div className="fade-in-up mt-5 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
                  <div className="flex items-center gap-2 mb-3 font-body text-sm" style={{ color: C.ok }}>
                    <CheckCircle2 size={15} /> Batch processed — orthomosaic ready for review
                  </div>
                  <p className="font-mono text-[11px] mb-3" style={{ color: C.faint }}>
                    Demo note: baseline imagery for existing weeks is simulated. In production the aligner registers
                    every frame in the batch against the site's true prior capture before diffing.
                  </p>
                  <button onClick={finish} className="btn-modern w-full py-2.5 rounded-lg font-body text-sm font-medium"
                    style={{ background: C.cyan, color: "#0A0E13" }}>
                    Add to flight log &amp; compare
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick compare (ad-hoc, no site required)                            */
/* ------------------------------------------------------------------ */
function QuickCompare() {
  const [aUrl, setAUrl] = useState(null);
  const [bUrl, setBUrl] = useState(null);
  const [imgA, setImgA] = useState(null);
  const [imgB, setImgB] = useState(null);
  const [diff, setDiff] = useState(null);
  const [mode, setMode] = useState("slider");
  const [opacity, setOpacity] = useState(85);
  const [busy, setBusy] = useState(false);

  const readFile = (f, setUrl) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setUrl(r.result);
    r.readAsDataURL(f);
  };

  useEffect(() => {
    if (!aUrl || !bUrl) return;
    setBusy(true);
    (async () => {
      const [ca, cb] = await Promise.all([loadImageToCanvas(aUrl), loadImageToCanvas(bUrl)]);
      setImgA(ca.toDataURL());
      setImgB(cb.toDataURL());
      setDiff(diffCanvases(ca, cb));
      setBusy(false);
    })();
  }, [aUrl, bUrl]);

  const Slot = ({ label, url, onPick }) => (
    <label className="btn-modern flex-1 rounded-xl flex flex-col items-center justify-center gap-2 p-6 cursor-pointer text-center"
      style={{ background: C.panel, border: `1px dashed ${C.line}`, aspectRatio: `${W}/${H}` }}>
      {url ? <img src={url} className="w-full h-full object-cover rounded-lg" /> : (
        <>
          <ImagePlus size={18} color={C.faint} />
          <span className="font-body text-xs" style={{ color: C.muted }}>{label}</span>
        </>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files[0])} />
    </label>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: C.text }}>Quick compare</h1>
        <p className="font-body text-sm mt-1" style={{ color: C.muted }}>
          Drop any two photos of the same location to test the slider, side-by-side, and change-highlight tools directly.
        </p>
      </div>
      <div className="flex gap-4 mb-4">
        <Slot label="Before image" url={aUrl} onPick={(f) => readFile(f, setAUrl)} />
        <Slot label="After image" url={bUrl} onPick={(f) => readFile(f, setBUrl)} />
      </div>

      {busy && (
        <div className="flex items-center gap-2 font-mono text-xs mb-4" style={{ color: C.muted }}>
          <Loader2 size={14} className="animate-spin" /> Computing pixel-level difference…
        </div>
      )}

      {diff && imgA && imgB && !busy && (
        <div className="fade-in-up rounded-xl p-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {[
                { id: "slider", label: "Slider", icon: SlidersHorizontal },
                { id: "side", label: "Side-by-side", icon: Columns },
                { id: "highlight", label: "Highlight", icon: Layers },
              ].map((t) => (
                <button key={t.id} onClick={() => setMode(t.id)}
                  className="btn-modern flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body"
                  style={{ background: mode === t.id ? C.orange : C.panel2, color: mode === t.id ? "#160C05" : C.muted, fontWeight: mode === t.id ? 600 : 400 }}>
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: C.muted }}>
              <TrendingUp size={13} color={C.orange} />
              <span style={{ color: C.orange, fontWeight: 600 }}>{diff.percent.toFixed(1)}%</span> changed
            </div>
          </div>
          {mode === "slider" && <SliderCompare before={imgA} after={imgB} labelBefore="Before" labelAfter="After" />}
          {mode === "side" && (
            <div className="grid grid-cols-2 gap-3">
              <div><img src={imgA} className="w-full rounded-lg" style={{ border: `1px solid ${C.line}` }} /><div className="mt-2"><Badge>Before</Badge></div></div>
              <div><img src={imgB} className="w-full rounded-lg" style={{ border: `1px solid ${C.line}` }} /><div className="mt-2"><Badge tone="cyan">After</Badge></div></div>
            </div>
          )}
          {mode === "highlight" && (
            <div>
              <div className="relative w-full rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
                <img src={imgB} className="w-full block" />
                <img src={diff.maskUrl} className="absolute inset-0 w-full h-full" style={{ opacity: opacity / 100 }} />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="font-mono text-[10px]" style={{ color: C.faint }}>OVERLAY</span>
                <input type="range" min="0" max="100" value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="flex-1" />
                <span className="font-mono text-[10px] w-8 text-right" style={{ color: C.muted }}>{opacity}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Printable PDF report — light "paper" layout, driven by window.print */
/* ------------------------------------------------------------------ */
const INK = { text: "#12161C", muted: "#5B6672", faint: "#93A0AD", line: "#E4E7EB", panel: "#F7F8FA" };

function PrintableReport({ site, weekA, weekB, weeks }) {
  const [imgA, setImgA] = useState(null);
  const [imgB, setImgB] = useState(null);
  const [merged, setMerged] = useState(null);
  const [pct, setPct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [ca, cb] = await Promise.all([sceneCanvas(site, weekA), sceneCanvas(site, weekB)]);
      const { maskUrl, percent } = diffCanvases(ca, cb);
      const mergeCanvas = document.createElement("canvas");
      mergeCanvas.width = W; mergeCanvas.height = H;
      const mctx = mergeCanvas.getContext("2d");
      mctx.drawImage(cb, 0, 0);
      const maskImg = new Image();
      await new Promise((res) => { maskImg.onload = res; maskImg.src = maskUrl; });
      mctx.globalAlpha = 0.85;
      mctx.drawImage(maskImg, 0, 0);
      mctx.globalAlpha = 1;
      if (cancelled) return;
      setImgA(ca.toDataURL());
      setImgB(cb.toDataURL());
      setMerged(mergeCanvas.toDataURL());
      setPct(percent);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [site, weekA, weekB]);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  if (loading || !imgA) {
    return (
      <div className="rounded-xl p-10 flex items-center justify-center gap-2 font-mono text-xs"
        style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.muted }}>
        <Loader2 size={14} className="animate-spin" /> Building printable report…
      </div>
    );
  }

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-mono text-[11px]" style={{ color: C.faint }}>
          This is exactly how the PDF will lay out. "Download PDF" opens your browser's print dialog — choose
          "Save as PDF" as the destination.
        </p>
        <button onClick={() => window.print()}
          className="btn-modern flex items-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-medium shrink-0"
          style={{ background: C.orange, color: "#160C05", boxShadow: "0 8px 24px -8px rgba(255,93,46,0.45)" }}>
          <Download size={15} /> Download PDF
        </button>
      </div>

      <div id="printable-report" className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF" }}>
        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.orange }}>
                <Crosshair size={14} color="#160C05" />
              </div>
              <span className="font-display text-sm font-semibold" style={{ color: INK.text }}>Wisconsin Aerial</span>
            </div>
            <span className="font-mono text-[9px] tracking-widest" style={{ color: INK.faint }}>SITE PROGRESS REPORT</span>
          </div>

          <div className="pb-6 mb-6" style={{ borderBottom: `1px solid ${INK.line}` }}>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: INK.faint }}>
              Prepared for {site.client}
            </div>
            <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: INK.text }}>{site.name}</h1>
            <div className="font-mono text-xs" style={{ color: INK.muted }}>{site.address}</div>
            <div className="font-mono text-[10px] mt-2" style={{ color: INK.faint }}>Report generated {today}</div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: "Total flights", value: weeks.length },
              { label: "Tracking since", value: weeks[0].date },
              { label: "Comparing", value: `W${weekA.n} → W${weekB.n}` },
              { label: "Area changed", value: `${pct.toFixed(1)}%`, accent: true },
            ].map((s) => (
              <div key={s.label} className="rounded-lg p-3" style={{ background: INK.panel, border: `1px solid ${INK.line}` }}>
                <div className="font-mono text-[8.5px] uppercase tracking-widest mb-1" style={{ color: INK.faint }}>{s.label}</div>
                <div className="font-display text-base font-semibold" style={{ color: s.accent ? C.orange : INK.text }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="font-display text-sm font-semibold mb-3" style={{ color: INK.text }}>
            Capture comparison — W{weekA.n} ({weekA.date}) to W{weekB.n} ({weekB.date})
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <img src={imgA} className="w-full rounded-lg" style={{ border: `1px solid ${INK.line}` }} />
              <div className="font-mono text-[10px] mt-1.5" style={{ color: INK.muted }}>Before · W{weekA.n} · {weekA.date}</div>
            </div>
            <div>
              <img src={imgB} className="w-full rounded-lg" style={{ border: `1px solid ${INK.line}` }} />
              <div className="font-mono text-[10px] mt-1.5" style={{ color: INK.muted }}>After · W{weekB.n} · {weekB.date}</div>
            </div>
          </div>

          <div className="font-display text-sm font-semibold mb-3" style={{ color: INK.text }}>Change highlight</div>
          <img src={merged} className="w-full rounded-lg mb-1.5" style={{ border: `1px solid ${INK.line}` }} />
          <div className="font-mono text-[10px] mb-8" style={{ color: INK.muted }}>
            Orange-highlighted regions mark automated, pixel-level change between the two captures above — {pct.toFixed(1)}% of the visible site surface.
          </div>

          <div className="font-display text-sm font-semibold mb-3" style={{ color: INK.text }}>Flight history</div>
          <div className="rounded-lg overflow-hidden mb-8" style={{ border: `1px solid ${INK.line}` }}>
            {weeks.map((w, i) => (
              <div key={w.n} className="flex items-center justify-between px-3 py-2 font-mono text-[11px]"
                style={{ background: i % 2 ? "#FFFFFF" : INK.panel, color: INK.muted, borderTop: i ? `1px solid ${INK.line}` : "none" }}>
                <span style={{ color: INK.text }}>Flight W{w.n}</span>
                <span>{w.date}{w.real ? " · client-supplied capture" : ""}</span>
              </div>
            ))}
          </div>

          <div className="pt-5 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: `1px solid ${INK.line}` }}>
            <span className="font-mono text-[9.5px]" style={{ color: INK.faint }}>
              Flown &amp; processed by Wisconsin Aerial · imagery captured via DJI Air 3S
            </span>
            <span className="font-mono text-[9.5px]" style={{ color: INK.faint }}>Automated change detection, not a survey-grade measurement</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Client portal — the read-only report link sent to clients           */
/* ------------------------------------------------------------------ */
function ClientStat({ icon: Icon, label, value, tone = "muted" }) {
  const fg = tone === "orange" ? C.orange : tone === "ok" ? C.ok : C.text;
  return (
    <div className="rounded-xl p-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-1.5 mb-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: C.faint }}>
        <Icon size={11} /> {label}
      </div>
      <div className="font-display text-xl font-semibold" style={{ color: fg }}>{value}</div>
    </div>
  );
}

function ClientPortal({ site, isPreview, onExitPreview, initialTab = "interactive" }) {
  const weeks = site._weeks;
  const [selected, setSelected] = useState([weeks[weeks.length - 2].n, weeks[weeks.length - 1].n]);
  const [latestPct, setLatestPct] = useState(null);
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const a = weeks[weeks.length - 2], b = weeks[weeks.length - 1];
      const [ca, cb] = await Promise.all([sceneCanvas(site, a), sceneCanvas(site, b)]);
      if (!cancelled) setLatestPct(diffCanvases(ca, cb).percent);
    })();
    return () => { cancelled = true; };
  }, [site]);

  const toggle = (n) => {
    setSelected((sel) => {
      if (sel.includes(n)) return sel.length === 1 ? sel : sel.filter((x) => x !== n);
      if (sel.length < 2) return [...sel, n].sort((a, b) => a - b);
      return [n];
    });
  };
  const sorted = [...selected].sort((a, b) => a - b);
  const weekA = weeks.find((w) => w.n === sorted[0]);
  const weekB = weeks.find((w) => w.n === (sorted[1] ?? sorted[0]));
  const Icon = site.icon;
  const first = weeks[0], last = weeks[weeks.length - 1];

  return (
    <div className="min-h-screen font-body" style={{ background: C.bg }}>
      <style>{FONTS}</style>

      {isPreview && (
        <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 flex-wrap"
          style={{ background: C.orange, color: "#160C05" }}>
          <div className="flex items-center gap-2 font-body text-xs font-medium">
            <Compass size={13} /> Admin preview — this is exactly what {site.client} receives
          </div>
          <button onClick={onExitPreview} className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
            <LogOut size={12} /> Exit preview
          </button>
        </div>
      )}

      {/* client header */}
      <header className="no-print px-5 md:px-10 pt-8 pb-6" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.orange }}>
              <Crosshair size={14} color="#160C05" />
            </div>
            <span className="font-display text-sm font-semibold" style={{ color: C.text }}>Wisconsin Aerial</span>
            <span className="font-mono text-[9px] tracking-widest ml-1" style={{ color: C.faint }}>CLIENT REPORT</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: C.faint }}>
            Prepared for {site.client}
          </div>
          <div className="flex items-center gap-2.5">
            <Icon size={22} color={C.cyan} />
            <h1 className="font-display text-3xl font-semibold" style={{ color: C.text }}>{site.name}</h1>
          </div>
          <div className="font-mono text-xs mt-2 flex items-center gap-1.5" style={{ color: C.faint }}>
            <MapPin size={12} /> {site.address}
          </div>
        </div>
      </header>

      <main className="px-5 md:px-10 py-8 max-w-4xl mx-auto">
        <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <ClientStat icon={Plane} label="Total flights" value={weeks.length} />
          <ClientStat icon={Clock} label="Tracking since" value={first.date} />
          <ClientStat icon={Calendar} label="Latest capture" value={last.date} />
          <ClientStat icon={TrendingUp} label="Change, last flight" tone="orange"
            value={latestPct === null ? "…" : `${latestPct.toFixed(1)}%`} />
        </div>

        <div className="no-print mb-3 flex items-center gap-2">
          <ChevronDown size={13} color={C.faint} />
          <h2 className="font-display text-base font-semibold" style={{ color: C.text }}>Flight history</h2>
        </div>
        <div className="no-print mb-6">
          <FlightLogStrip weeks={weeks} selected={selected} onToggle={toggle} />
        </div>

        <div className="no-print flex items-center gap-2 mb-5 rounded-lg p-1 w-fit" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
          {[
            { id: "interactive", label: "Interactive report", icon: SlidersHorizontal },
            { id: "pdf", label: "PDF report", icon: FileText },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="btn-modern flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body"
              style={{ background: tab === t.id ? C.orange : "transparent", color: tab === t.id ? "#160C05" : C.muted, fontWeight: tab === t.id ? 600 : 400 }}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {selected.length < 2 ? (
          <div className="no-print rounded-xl p-8 text-center font-body text-sm" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.muted }}>
            Select one more capture above to compare.
          </div>
        ) : tab === "interactive" ? (
          <CompareWorkspace site={site} weekA={weekA} weekB={weekB} />
        ) : (
          <PrintableReport site={site} weekA={weekA} weekB={weekB} weeks={weeks} />
        )}

        <footer className="no-print mt-12 pt-6 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <span className="font-mono text-[10px]" style={{ color: C.faint }}>
            Flown &amp; processed by Wisconsin Aerial · questions go to your project pilot
          </span>
          <span className="font-mono text-[10px]" style={{ color: C.faint }}>Report generated {last.date}</span>
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root app                                                            */
/* ------------------------------------------------------------------ */
export default function App() {
  const [sites, setSites] = useState(() =>
    SITES.map((s) => ({ ...s, _weeks: [1, 2, 3, 4, 5, 6].map((n) => ({ n, date: WEEK_DATES[n - 1], real: false })) }))
  );
  const [view, setView] = useState("dashboard");
  const [activeSiteId, setActiveSiteId] = useState(null);
  const [clientPreview, setClientPreview] = useState(null); // { id, tab }

  const openSite = (id) => { setActiveSiteId(id); setView("site"); };
  const previewClient = (id, tab = "interactive") => setClientPreview({ id, tab });

  const handleIngested = (siteId, weekEntry) => {
    setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, _weeks: [...s._weeks, weekEntry] } : s)));
  };

  const activeSite = sites.find((s) => s.id === activeSiteId);

  if (clientPreview) {
    const previewSite = sites.find((s) => s.id === clientPreview.id);
    return (
      <ClientPortal site={previewSite} isPreview initialTab={clientPreview.tab}
        onExitPreview={() => setClientPreview(null)} />
    );
  }

  return (
    <div className="min-h-screen font-body flex relative" style={{ background: C.bg }}>
      <style>{FONTS}</style>

      {/* ambient background glow — signature modern touch, quiet and slow */}
      <div className="ambient-glow pointer-events-none fixed -top-40 -left-32 w-[560px] h-[560px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(62,214,196,0.16), transparent 70%)", filter: "blur(10px)", zIndex: 0 }} />
      <div className="ambient-glow pointer-events-none fixed -bottom-52 -right-40 w-[620px] h-[620px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,93,46,0.12), transparent 70%)", filter: "blur(10px)", zIndex: 0, animationDelay: "-7s" }} />

      <aside className="glass w-56 shrink-0 p-4 flex-col gap-1 hidden md:flex relative z-10"
        style={{ borderRight: `1px solid ${C.line}`, background: "rgba(17,22,29,0.6)" }}>
        <div className="flex items-center gap-2 px-2 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.orange, boxShadow: "0 6px 18px -6px rgba(255,93,46,0.5)" }}>
            <Crosshair size={16} color="#160C05" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold leading-none" style={{ color: C.text }}>Wisconsin</div>
            <div className="font-mono text-[9px] tracking-widest" style={{ color: C.faint }}>AERIAL</div>
          </div>
        </div>
        <NavButton active={view === "dashboard"} icon={Home} label="Dashboard" onClick={() => setView("dashboard")} />
        <NavButton active={view === "ingest"} icon={FolderInput} label="Receiving engine" onClick={() => setView("ingest")} />
        <NavButton active={view === "quick"} icon={ArrowLeftRight} label="Quick compare" onClick={() => setView("quick")} />
        <div className="mt-6 px-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: C.faint }}>Sites</div>
        {sites.map((s) => (
          <NavButton key={s.id} active={view === "site" && activeSiteId === s.id} icon={s.icon}
            label={s.name.split(" — ")[0].split(" Estates")[0]}
            onClick={() => openSite(s.id)} />
        ))}
        <div className="mt-auto px-2 pt-4 font-mono text-[9px]" style={{ color: C.faint, borderTop: `1px solid ${C.line}` }}>
          <div className="pt-3">v0.1 · demo build</div>
        </div>
      </aside>

      {/* mobile top nav */}
      <div className="glass md:hidden fixed top-0 left-0 right-0 z-10 flex items-center gap-1 p-2 overflow-x-auto"
        style={{ background: "rgba(17,22,29,0.75)", borderBottom: `1px solid ${C.line}` }}>
        <button onClick={() => setView("dashboard")} className="btn-modern p-2 rounded-lg shrink-0" style={{ background: view === "dashboard" ? C.panel2 : "transparent" }}><Home size={16} color={C.text} /></button>
        <button onClick={() => setView("ingest")} className="btn-modern p-2 rounded-lg shrink-0" style={{ background: view === "ingest" ? C.panel2 : "transparent" }}><FolderInput size={16} color={C.text} /></button>
        <button onClick={() => setView("quick")} className="btn-modern p-2 rounded-lg shrink-0" style={{ background: view === "quick" ? C.panel2 : "transparent" }}><ArrowLeftRight size={16} color={C.text} /></button>
      </div>

      <main className="flex-1 p-5 md:p-8 pt-16 md:pt-8 max-w-4xl relative z-10">
        {view === "dashboard" && <Dashboard sites={sites} onOpen={openSite} />}
        {view === "site" && activeSite && (
          <SiteDetail site={activeSite} onBack={() => setView("dashboard")} onPreviewClient={previewClient} />
        )}
        {view === "ingest" && <ReceivingEngine sites={sites} onIngested={handleIngested} onOpenSite={openSite} />}
        {view === "quick" && <QuickCompare />}
      </main>
    </div>
  );
}
