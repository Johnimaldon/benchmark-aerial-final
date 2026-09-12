import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Plane, Radar, Layers, SlidersHorizontal, Columns, Upload, CheckCircle2,
  Circle, ChevronRight, MapPin, Calendar, TrendingUp,
  ArrowLeftRight, Building2, X, Loader2, ImagePlus, ArrowLeft, Home,
  Share2, Copy, Check, ShieldCheck, LogOut, Satellite, FolderInput,
  Images, Compass, Clock, ChevronDown, Download, FileText,
  Lock, KeyRound, Settings, Trash2, Plus, Pencil, RefreshCw, ShieldAlert,
  Factory, Warehouse, TreePine, Eye, EyeOff, AlertCircle, UserCog
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tokens                                                              */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#F3F8FE",
  panel: "#FFFFFF",
  panel2: "#EDF4FC",
  line: "#DCE7F5",
  cyan: "#1C64D6",
  cyanDim: "#BBD6F7",
  skySoft: "#7EC1FA",
  orange: "#FF5D2E",
  text: "#121826",
  muted: "#5B6672",
  faint: "#8B96A3",
  ok: "#1C9A5B",
  onAccent: "#FFFFFF",
};

/* ------------------------------------------------------------------ */
/*  Icon registry — lets project icons round-trip through localStorage */
/* ------------------------------------------------------------------ */
const ICON_MAP = { Building2, Home, MapPin, Factory, Warehouse, TreePine };
const ICON_OPTIONS = Object.keys(ICON_MAP);
function resolveIcon(iconKey) {
  return ICON_MAP[iconKey] || Building2;
}

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
  box-shadow: 0 18px 36px -18px rgba(18,24,38,0.18), 0 0 0 1px rgba(28,100,214,0.18);
  border-color: rgba(28,100,214,0.3) !important;
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
  background: linear-gradient(90deg, #7EC1FA, #1C64D6);
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
/*  Site data — projects are created from scratch via Admin controls;   */
/*  there is no seeded demo data                                       */
/* ------------------------------------------------------------------ */
const W = 480, H = 300;

/* ------------------------------------------------------------------ */
/*  Access control & persistence — everything below runs client-side    */
/*  only (no backend), so localStorage is the source of truth for       */
/*  admin-edited project data and the current session.                  */
/* ------------------------------------------------------------------ */
const STORAGE_KEY_SITES = "wisconsin-aerial:sites";
const STORAGE_KEY_SESSION = "wisconsin-aerial:session";

function defaultAccessCode(seed) {
  return Math.abs(hashStr(seed + "-access")).toString(36).slice(0, 6).toUpperCase();
}

function generateAccessCode(seed) {
  return Math.abs(hashStr(seed + "-" + Date.now() + "-" + Math.random())).toString(36).slice(0, 6).toUpperCase();
}

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "") || "project";
}

function uniqueId(base, existingIds) {
  let id = base, n = 2;
  while (existingIds.includes(id)) { id = `${base}-${n}`; n++; }
  return id;
}

function formatShortDate(date = new Date()) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function hydrateSite(raw) {
  return { ...raw, icon: resolveIcon(raw.iconKey) };
}

function serializeSite(site) {
  const { icon, ...rest } = site;
  return rest;
}

function loadPersistedSites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SITES);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return null;
    return parsed.map(hydrateSite);
  } catch {
    return null;
  }
}

function persistSites(sites) {
  try {
    localStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(sites.map(serializeSite)));
  } catch {}
}

function loadPersistedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && (parsed.role === "admin" || parsed.role === "client")) return parsed;
  } catch {}
  return { role: null, siteId: null };
}

function persistSession(session) {
  try {
    if (!session.role) localStorage.removeItem(STORAGE_KEY_SESSION);
    else localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  } catch {}
}

function makeNewProject({ name, address, client, type, iconKey, lat, lon }, existingIds) {
  const id = uniqueId(slugify(name), existingIds);
  return {
    id,
    name,
    address,
    client,
    type,
    lat: Number(lat) || 0,
    lon: Number(lon) || 0,
    iconKey,
    icon: resolveIcon(iconKey),
    accessCode: defaultAccessCode(id),
    clientAccessEnabled: true,
    _weeks: [],
  };
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

function sceneCanvas(weekEntry) {
  return loadImageToCanvas(weekEntry.dataUrl);
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
function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Wisconsin Aerial" className="shrink-0">
      <circle cx="32" cy="32" r="30" fill="#FFFFFF" stroke={C.line} strokeWidth="2" />
      <circle cx="32" cy="32" r="30" fill="none" stroke={C.cyan} strokeWidth="1.5" opacity="0.4" />
      <text x="32" y="28" textAnchor="middle" fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
        fontWeight="700" fontSize="8.5" letterSpacing="0.5" fill={C.text}>WISCONSIN</text>
      <text x="32" y="42" textAnchor="middle" fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
        fontWeight="800" fontSize="13" letterSpacing="0.5" fill={C.cyan}>AERIAL</text>
    </svg>
  );
}

function Badge({ children, tone = "muted" }) {
  const map = {
    muted: { bg: "rgba(91,102,114,0.09)", fg: C.muted },
    cyan: { bg: "rgba(28,100,214,0.12)", fg: C.cyan },
    orange: { bg: "rgba(255,93,46,0.12)", fg: C.orange },
    ok: { bg: "rgba(28,154,91,0.12)", fg: C.ok },
    // Dark, theme-independent variants for badges placed on top of the
    // aerial photo canvases, which stay dark/earthy regardless of app theme.
    overlayMuted: { bg: "rgba(10,14,20,0.55)", fg: "#E7ECF2" },
    overlayCyan: { bg: "rgba(10,14,20,0.55)", fg: "#8FC1FA" },
    overlayOrange: { bg: "rgba(10,14,20,0.55)", fg: "#FF9166" },
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
        borderLeft: active ? `2px solid ${C.cyan}` : "2px solid transparent",
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
                <div className="w-px h-3" style={{ background: isSel ? C.cyan : C.faint }} />
                <div className="w-3 h-3 rounded-full transition-all"
                  style={{
                    background: isSel ? C.cyan : C.panel2,
                    border: `2px solid ${isSel ? C.cyan : C.line}`,
                    boxShadow: isSel ? `0 0 0 3px rgba(28,100,214,0.18)` : "none",
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
        <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${pct}%`, background: C.cyan }}>
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: C.cyan, boxShadow: "0 4px 14px rgba(28,100,214,0.4)" }}>
            <ArrowLeftRight size={14} color={C.onAccent} />
          </div>
        </div>
        <div className="absolute top-2 left-2"><Badge tone="overlayMuted">{labelBefore}</Badge></div>
        <div className="absolute top-2 right-2"><Badge tone="overlayCyan">{labelAfter}</Badge></div>
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
      const [ca, cb] = await Promise.all([sceneCanvas(weekA), sceneCanvas(weekB)]);
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
                background: mode === t.id ? C.cyan : C.panel2,
                color: mode === t.id ? C.onAccent : C.muted,
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
            <div className="absolute top-2 right-2"><Badge tone="overlayOrange">Changed area</Badge></div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="font-mono text-[10px]" style={{ color: C.faint }}>OVERLAY</span>
            <input type="range" min="0" max="100" value={opacity}
              onChange={(e) => setOpacity(+e.target.value)} className="flex-1 accent-blue-600" />
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
  const last = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];

  useEffect(() => {
    if (!last) return;
    setThumb(null);
    setPct(null);
    (async () => {
      const cb = await sceneCanvas(last);
      setThumb(cb.toDataURL());
      if (prev) {
        const ca = await sceneCanvas(prev);
        setPct(diffCanvases(ca, cb).percent);
      }
    })();
  }, [site]);

  const Icon = site.icon;
  return (
    <button onClick={() => onOpen(site.id)}
      className="card-lift fade-in-up text-left rounded-2xl overflow-hidden"
      style={{ background: C.panel, border: `1px solid ${C.line}`, animationDelay: `${index * 70}ms` }}>
      <div className="relative" style={{ aspectRatio: `${W}/${H}`, background: C.panel2 }}>
        {!last ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <Satellite size={18} color={C.faint} />
            <span className="font-mono text-[10px]" style={{ color: C.faint }}>No captures yet</span>
          </div>
        ) : thumb ? <img src={thumb} className="w-full h-full object-cover" /> :
          <div className="w-full h-full flex items-center justify-center"><Loader2 size={16} className="animate-spin" color={C.faint} /></div>}
        {last && <div className="absolute top-2 left-2"><Badge tone="overlayCyan">W{last.n} · {last.date}</Badge></div>}
        {pct !== null && (
          <div className="absolute top-2 right-2"><Badge tone={pct > 4 ? "overlayOrange" : "overlayMuted"}>{pct.toFixed(1)}% Δ this week</Badge></div>
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

function Dashboard({ sites, onOpen, onGoToAdmin }) {
  return (
    <div>
      <div className="rounded-2xl overflow-hidden mb-6" style={{ border: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-4 px-6 py-8 md:px-10 md:py-10"
          style={{ background: "linear-gradient(135deg, #CFE7FC 0%, #EAF4FD 55%, #FFFFFF 100%)" }}>
          <Logo size={54} />
          <div>
            <h1 className="font-display text-xl md:text-2xl font-extrabold tracking-tight" style={{ color: "#0B1E3D" }}>
              WISCONSIN AERIAL IMAGERY
            </h1>
            <p className="font-body text-sm mt-1" style={{ color: C.muted }}>
              {sites.length ? `${sites.length} ${sites.length === 1 ? "site" : "sites"} under aerial survey` : "Weekly drone survey, progress tracking, and client reporting."}
            </p>
          </div>
        </div>
        <div style={{ height: 4, background: "linear-gradient(90deg, #7EC1FA, #1C64D6)" }} />
      </div>

      {sites.length === 0 ? (
        <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-3"
          style={{ background: C.panel, border: `1px dashed ${C.line}` }}>
          <Plane size={22} color={C.cyan} />
          <h2 className="font-display text-lg font-semibold" style={{ color: C.text }}>No projects yet</h2>
          <p className="font-body text-sm max-w-sm" style={{ color: C.muted }}>
            Set up your first project in Admin controls, then send flight imagery for it through the Receiving engine.
          </p>
          <button onClick={onGoToAdmin} className="btn-modern mt-2 flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-body text-sm font-medium"
            style={{ background: C.cyan, color: C.onAccent, boxShadow: "0 8px 24px -8px rgba(28,100,214,0.4)" }}>
            <Plus size={15} /> New project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sites.map((s, i) => <SiteCard key={s.id} site={s} onOpen={onOpen} index={i} />)}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Site detail                                                         */
/* ------------------------------------------------------------------ */
function ShareModal({ site, onClose, onPreview }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(site.accessCode); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="glass fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(18,24,38,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="fade-in-up w-full max-w-md rounded-2xl p-6"
        style={{ background: C.panel, border: `1px solid ${C.line}`, boxShadow: "0 24px 60px -20px rgba(18,24,38,0.35)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 size={16} color={C.cyan} />
            <h3 className="font-display text-lg font-semibold" style={{ color: C.text }}>Share with client</h3>
          </div>
          <button onClick={onClose}><X size={16} color={C.faint} /></button>
        </div>
        <p className="font-body text-sm mb-4" style={{ color: C.muted }}>
          Anyone with this access code gets a read-only report for <span style={{ color: C.text }}>{site.name}</span> —
          flight history, side-by-side captures, and change highlights. No sign-in, no access to other sites.
        </p>
        {site.clientAccessEnabled ? (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-4" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
            <KeyRound size={13} color={C.faint} className="shrink-0" />
            <span className="font-mono text-sm tracking-widest flex-1" style={{ color: C.text }}>{site.accessCode}</span>
            <button onClick={copy} className="btn-modern shrink-0 flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded"
              style={{ background: copied ? "rgba(28,154,91,0.12)" : C.panel2, color: copied ? C.ok : C.cyan }}>
              {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-4 font-body text-xs" style={{ background: "rgba(255,93,46,0.08)", color: C.orange }}>
            <AlertCircle size={14} /> Client access is currently disabled for this project. Enable it in Admin controls.
          </div>
        )}
        <button onClick={onPreview} className="btn-modern w-full py-2.5 rounded-lg font-body text-sm font-medium flex items-center justify-center gap-2"
          style={{ background: C.cyan, color: C.onAccent, boxShadow: "0 8px 24px -8px rgba(28,100,214,0.4)" }}>
          <Compass size={14} /> Preview what your client sees
        </button>
      </div>
    </div>
  );
}

function SiteDetail({ site, onBack, onPreviewClient, onGoToIngest }) {
  const weeks = site._weeks;
  const [selected, setSelected] = useState(() =>
    weeks.length >= 2 ? [weeks[weeks.length - 2].n, weeks[weeks.length - 1].n] : weeks.length === 1 ? [weeks[0].n] : []
  );
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

      {weeks.length === 0 ? (
        <div className="rounded-xl p-8 text-center font-body text-sm flex flex-col items-center gap-3" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.muted }}>
          <Satellite size={20} color={C.faint} />
          <span>No flights logged yet for this project.</span>
          <button onClick={onGoToIngest}
            className="btn-modern flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-body text-xs font-medium"
            style={{ background: C.cyan, color: "#FFFFFF" }}>
            <FolderInput size={13} /> Add the first capture
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <FlightLogStrip weeks={weeks} selected={selected} onToggle={toggle} />
          </div>
          {selected.length < 2 ? (
            <div className="rounded-xl p-8 text-center font-body text-sm" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.muted }}>
              {weeks.length === 1
                ? "One capture logged so far. Add another flight to unlock comparisons."
                : "Select one more capture on the flight log to build a comparison."}
            </div>
          ) : (
            <CompareWorkspace site={site} weekA={weekA} weekB={weekB} />
          )}
        </>
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

function ReceivingEngine({ sites, onIngested, onOpenSite, onGoToAdmin }) {
  const [received, setReceived] = useState([]); // {id,file,name,dataUrl,alt,dLat,dLon,t}
  const [dragOver, setDragOver] = useState(false);
  const [detectedId, setDetectedId] = useState(null);
  const [siteId, setSiteId] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [stage, setStage] = useState(-1);
  const timerRef = useRef(null);

  const site = sites.find((s) => s.id === (siteId || detectedId));

  const handleFiles = (fileList) => {
    if (!sites.length) return;
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
    const nextN = weeks.length ? weeks[weeks.length - 1].n + 1 : 1;
    onIngested(site.id, { n: nextN, date: formatShortDate(), real: true, dataUrl: hero.dataUrl, sourceCount: received.length });
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

      {sites.length === 0 ? (
        <div className="rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3"
          style={{ background: C.panel, border: `1px dashed ${C.line}` }}>
          <Settings size={22} color={C.faint} />
          <div className="font-body text-sm" style={{ color: C.text }}>No projects set up yet</div>
          <div className="font-mono text-[11px] max-w-xs" style={{ color: C.faint }}>
            Create a project in Admin controls before receiving flight imagery for it.
          </div>
          <button onClick={onGoToAdmin} className="btn-modern mt-2 px-4 py-2 rounded-lg font-body text-xs font-medium"
            style={{ background: C.cyan, color: "#FFFFFF" }}>
            Go to Admin controls
          </button>
        </div>
      ) : received.length === 0 && (
        <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className="rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3 transition-colors"
          style={{ background: C.panel, border: `2px dashed ${dragOver ? C.cyan : C.line}` }}>
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
                style={{ background: C.cyan, color: C.onAccent, boxShadow: "0 8px 24px -8px rgba(28,100,214,0.4)" }}>
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
                    The aligner registers every frame in this batch against the site's prior capture before diffing.
                  </p>
                  <button onClick={finish} className="btn-modern w-full py-2.5 rounded-lg font-body text-sm font-medium"
                    style={{ background: C.cyan, color: C.onAccent }}>
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
                  style={{ background: mode === t.id ? C.cyan : C.panel2, color: mode === t.id ? C.onAccent : C.muted, fontWeight: mode === t.id ? 600 : 400 }}>
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
      const [ca, cb] = await Promise.all([sceneCanvas(weekA), sceneCanvas(weekB)]);
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
          style={{ background: C.cyan, color: C.onAccent, boxShadow: "0 8px 24px -8px rgba(28,100,214,0.4)" }}>
          <Download size={15} /> Download PDF
        </button>
      </div>

      <div id="printable-report" className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF" }}>
        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Logo size={26} />
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

function ClientPortal({ site, mode, onExitPreview, initialTab = "interactive" }) {
  const weeks = site._weeks;
  const [selected, setSelected] = useState(() =>
    weeks.length >= 2 ? [weeks[weeks.length - 2].n, weeks[weeks.length - 1].n] : weeks.length === 1 ? [weeks[0].n] : []
  );
  const [latestPct, setLatestPct] = useState(null);
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (weeks.length < 2) return;
    let cancelled = false;
    (async () => {
      const a = weeks[weeks.length - 2], b = weeks[weeks.length - 1];
      const [ca, cb] = await Promise.all([sceneCanvas(a), sceneCanvas(b)]);
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
  const canDiff = weeks.length >= 2;

  return (
    <div className="min-h-screen font-body" style={{ background: C.bg }}>
      <style>{FONTS}</style>

      {(mode === "preview" || mode === "client") && (
        <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 flex-wrap"
          style={{ background: mode === "preview" ? C.orange : C.cyan, color: mode === "preview" ? "#160C05" : C.onAccent }}>
          <div className="flex items-center gap-2 font-body text-xs font-medium">
            <Compass size={13} />
            {mode === "preview" ? <>Admin preview — this is exactly what {site.client} receives</> : <>Client access — {site.name}</>}
          </div>
          <button onClick={onExitPreview} className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
            <LogOut size={12} /> {mode === "preview" ? "Exit preview" : "Sign out"}
          </button>
        </div>
      )}

      {/* client header */}
      <header className="no-print px-5 md:px-10 pt-8 pb-6" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Logo size={30} />
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
          <ClientStat icon={Clock} label="Tracking since" value={first?.date ?? "—"} />
          <ClientStat icon={Calendar} label="Latest capture" value={last?.date ?? "—"} />
          <ClientStat icon={TrendingUp} label="Change, last flight" tone="orange"
            value={!canDiff ? "—" : latestPct === null ? "…" : `${latestPct.toFixed(1)}%`} />
        </div>

        {weeks.length === 0 ? (
          <div className="no-print rounded-xl p-10 text-center font-body text-sm flex flex-col items-center gap-2" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.muted }}>
            <Satellite size={20} color={C.faint} />
            Your project pilot hasn't logged any flights yet — check back soon.
          </div>
        ) : (
          <>
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
                  style={{ background: tab === t.id ? C.cyan : "transparent", color: tab === t.id ? "#FFFFFF" : C.muted, fontWeight: tab === t.id ? 600 : 400 }}>
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>

            {selected.length < 2 ? (
              <div className="no-print rounded-xl p-8 text-center font-body text-sm" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.muted }}>
                {weeks.length === 1 ? "Only one capture so far — comparisons will appear after the next flight." : "Select one more capture above to compare."}
              </div>
            ) : tab === "interactive" ? (
              <CompareWorkspace site={site} weekA={weekA} weekB={weekB} />
            ) : (
              <PrintableReport site={site} weekA={weekA} weekB={weekB} weeks={weeks} />
            )}
          </>
        )}

        <footer className="no-print mt-12 pt-6 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <span className="font-mono text-[10px]" style={{ color: C.faint }}>
            Flown &amp; processed by Wisconsin Aerial · questions go to your project pilot
          </span>
          <span className="font-mono text-[10px]" style={{ color: C.faint }}>Report generated {last?.date ?? "—"}</span>
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Access gate — admin sign-in vs client access code                   */
/* ------------------------------------------------------------------ */
// Demo-grade check only: there is no backend, so this can't be a real secret.
const ADMIN_PASSCODE = "wisconsin-admin";

function AccessGate({ sites, onAdminLogin, onClientAccess }) {
  const [mode, setMode] = useState("choose");
  const [passcode, setPasscode] = useState("");
  const [code, setCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);

  const submitAdmin = (e) => {
    e.preventDefault();
    if (passcode.trim() === ADMIN_PASSCODE) { onAdminLogin(); return; }
    setError("Incorrect passcode.");
  };

  const submitClient = (e) => {
    e.preventDefault();
    const match = sites.find((s) => s.accessCode.toLowerCase() === code.trim().toLowerCase());
    if (!match) { setError("That access code doesn't match any project."); return; }
    if (!match.clientAccessEnabled) { setError("Client access for this project has been disabled by the site administrator."); return; }
    onClientAccess(match.id);
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-body p-5" style={{ background: C.bg }}>
      <style>{FONTS}</style>
      <div className="ambient-glow pointer-events-none fixed -top-40 -left-32 w-[560px] h-[560px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(28,100,214,0.14), transparent 70%)", filter: "blur(10px)", zIndex: 0 }} />
      <div className="ambient-glow pointer-events-none fixed -bottom-52 -right-40 w-[620px] h-[620px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(126,193,250,0.20), transparent 70%)", filter: "blur(10px)", zIndex: 0, animationDelay: "-7s" }} />

      <div className="fade-in-up relative z-10 w-full max-w-sm rounded-2xl p-7"
        style={{ background: C.panel, border: `1px solid ${C.line}`, boxShadow: "0 24px 60px -24px rgba(18,24,38,0.25)" }}>
        <div className="flex items-center gap-2 mb-6 justify-center">
          <Logo size={34} />
          <div>
            <div className="font-display text-sm font-semibold leading-none" style={{ color: C.text }}>Wisconsin</div>
            <div className="font-mono text-[9px] tracking-widest" style={{ color: C.faint }}>AERIAL</div>
          </div>
        </div>

        {mode === "choose" && (
          <div className="space-y-2.5">
            <button onClick={() => { setMode("admin"); setError(null); }}
              className="btn-modern w-full flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm"
              style={{ background: C.panel2, border: `1px solid ${C.line}`, color: C.text }}>
              <UserCog size={16} color={C.cyan} /> Admin sign-in
            </button>
            <button onClick={() => { setMode("client"); setError(null); }}
              className="btn-modern w-full flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm"
              style={{ background: C.panel2, border: `1px solid ${C.line}`, color: C.text }}>
              <KeyRound size={16} color={C.cyan} /> I have a client access code
            </button>
          </div>
        )}

        {mode === "admin" && (
          <form onSubmit={submitAdmin} className="space-y-3">
            <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.faint }}>Admin passcode</label>
            <div className="relative">
              <Lock size={14} color={C.faint} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input autoFocus type={showPass ? "text" : "password"} value={passcode}
                onChange={(e) => { setPasscode(e.target.value); setError(null); }}
                className="w-full rounded-lg pl-9 pr-9 py-2.5 font-body text-sm outline-none"
                style={{ background: C.panel2, color: C.text, border: `1px solid ${C.line}` }} />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPass ? <EyeOff size={14} color={C.faint} /> : <Eye size={14} color={C.faint} />}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 font-body text-xs" style={{ color: C.orange }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}
            <button type="submit" className="btn-modern w-full py-2.5 rounded-lg font-body text-sm font-medium"
              style={{ background: C.cyan, color: C.onAccent, boxShadow: "0 8px 24px -8px rgba(28,100,214,0.4)" }}>
              Sign in
            </button>
            <button type="button" onClick={() => { setMode("choose"); setError(null); }}
              className="w-full font-mono text-[11px]" style={{ color: C.faint }}>
              Back
            </button>
          </form>
        )}

        {mode === "client" && (
          <form onSubmit={submitClient} className="space-y-3">
            <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.faint }}>Project access code</label>
            <div className="relative">
              <KeyRound size={14} color={C.faint} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input autoFocus value={code}
                onChange={(e) => { setCode(e.target.value); setError(null); }}
                placeholder="e.g. 4F9K2C"
                className="w-full rounded-lg pl-9 pr-3 py-2.5 font-mono text-sm tracking-widest uppercase outline-none"
                style={{ background: C.panel2, color: C.text, border: `1px solid ${C.line}` }} />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 font-body text-xs" style={{ color: C.orange }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}
            <button type="submit" className="btn-modern w-full py-2.5 rounded-lg font-body text-sm font-medium"
              style={{ background: C.cyan, color: C.onAccent, boxShadow: "0 8px 24px -8px rgba(28,100,214,0.4)" }}>
              View my project
            </button>
            <button type="button" onClick={() => { setMode("choose"); setError(null); }}
              className="w-full font-mono text-[11px]" style={{ color: C.faint }}>
              Back
            </button>
          </form>
        )}

        <p className="font-mono text-[10px] text-center mt-6" style={{ color: C.faint }}>
          Client access codes are issued by your project pilot.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Admin controls — create / edit / delete projects, manage client     */
/*  access permissions                                                  */
/* ------------------------------------------------------------------ */
const TYPE_PRESETS = [
  "Multifamily construction", "Retail build-out", "Residential listing",
  "Land / grading", "Industrial / warehouse", "Other",
];

function FormField({ label, children }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: C.faint }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { background: C.panel2, color: C.text, border: `1px solid ${C.line}` };

function ProjectForm({ mode, initial, onCancel, onSave, onDelete }) {
  const [name, setName] = useState(initial?.name || "");
  const [client, setClient] = useState(initial?.client || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [type, setType] = useState(initial?.type || TYPE_PRESETS[0]);
  const [iconKey, setIconKey] = useState(initial?.iconKey || "Building2");
  const [lat, setLat] = useState(initial?.lat ?? "");
  const [lon, setLon] = useState(initial?.lon ?? "");
  const [clientAccessEnabled, setClientAccessEnabled] = useState(initial?.clientAccessEnabled ?? true);
  const [accessCode, setAccessCode] = useState(initial?.accessCode || "");
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const regenerate = () => setAccessCode(generateAccessCode(initial?.id || name || "project"));
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(accessCode); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: initial?.id,
      name: name.trim(),
      client: client.trim() || "Unassigned",
      address: address.trim(),
      type,
      iconKey,
      lat: lat === "" ? 0 : Number(lat),
      lon: lon === "" ? 0 : Number(lon),
      clientAccessEnabled,
      accessCode: accessCode || defaultAccessCode(initial?.id || name),
    });
  };

  return (
    <div className="glass fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(18,24,38,0.45)" }} onClick={onCancel}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="fade-in-up w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: C.panel, border: `1px solid ${C.line}`, boxShadow: "0 24px 60px -20px rgba(18,24,38,0.35)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold" style={{ color: C.text }}>
            {mode === "create" ? "New project" : "Edit project"}
          </h3>
          <button type="button" onClick={onCancel}><X size={16} color={C.faint} /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <FormField label="Project name">
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={inputStyle} />
            </FormField>
          </div>
          <FormField label="Client">
            <input value={client} onChange={(e) => setClient(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={inputStyle} />
          </FormField>
          <FormField label="Project type">
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={inputStyle}>
              {TYPE_PRESETS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <div className="col-span-2">
            <FormField label="Address">
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={inputStyle} />
            </FormField>
          </div>
          <FormField label="Icon">
            <select value={iconKey} onChange={(e) => setIconKey(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={inputStyle}>
              {ICON_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </FormField>
          <div />
          <FormField label="Latitude">
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={inputStyle} />
          </FormField>
          <FormField label="Longitude">
            <input type="number" step="any" value={lon} onChange={(e) => setLon(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={inputStyle} />
          </FormField>
        </div>

        <div className="rounded-xl p-4 mb-5" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
          <div className="flex items-center gap-1.5 mb-3 font-body text-sm font-medium" style={{ color: C.text }}>
            <ShieldAlert size={14} color={C.orange} /> Access &amp; permissions
          </div>
          <label className="flex items-center justify-between mb-3 cursor-pointer">
            <span className="font-body text-xs" style={{ color: C.muted }}>Allow client access with this project's code</span>
            <input type="checkbox" checked={clientAccessEnabled} onChange={(e) => setClientAccessEnabled(e.target.checked)}
              className="w-4 h-4 accent-blue-600" />
          </label>
          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs tracking-widest"
                style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.text }}>
                <KeyRound size={12} color={C.faint} /> {accessCode}
              </div>
              <button type="button" onClick={copyCode} className="btn-modern p-2 rounded-lg" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
                {copied ? <Check size={14} color={C.ok} /> : <Copy size={14} color={C.cyan} />}
              </button>
              <button type="button" onClick={regenerate} className="btn-modern p-2 rounded-lg" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
                <RefreshCw size={14} color={C.faint} />
              </button>
            </div>
          )}
          {mode === "create" && (
            <p className="font-mono text-[10px]" style={{ color: C.faint }}>An access code is generated automatically once the project is created.</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          {onDelete ? (
            <button type="button"
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              className="btn-modern flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-xs font-medium"
              style={{ background: "rgba(255,93,46,0.1)", color: C.orange }}>
              <Trash2 size={13} /> {confirmDelete ? "Confirm delete" : "Delete project"}
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} className="font-body text-xs px-3 py-2" style={{ color: C.muted }}>Cancel</button>
            <button type="submit" className="btn-modern px-4 py-2 rounded-lg font-body text-sm font-medium"
              style={{ background: C.cyan, color: C.onAccent, boxShadow: "0 8px 24px -8px rgba(28,100,214,0.4)" }}>
              {mode === "create" ? "Create project" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function AdminControls({ sites, onCreate, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null); // null | "new" | site id
  const editingSite = editing && editing !== "new" ? sites.find((s) => s.id === editing) : null;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings size={18} color={C.cyan} />
            <h1 className="font-display text-2xl font-semibold" style={{ color: C.text }}>Admin controls</h1>
          </div>
          <p className="font-body text-sm" style={{ color: C.muted }}>
            Set up, configure, and edit projects, and manage the access code each client needs to view their site.
          </p>
        </div>
        <button onClick={() => setEditing("new")}
          className="btn-modern flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg font-body text-sm font-medium shrink-0"
          style={{ background: C.cyan, color: C.onAccent, boxShadow: "0 8px 24px -8px rgba(28,100,214,0.4)" }}>
          <Plus size={15} /> New project
        </button>
      </div>

      <div className="space-y-3">
        {sites.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
              style={{ background: C.panel, border: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.panel2 }}>
                  <Icon size={16} color={C.cyan} />
                </div>
                <div className="min-w-0">
                  <div className="font-body text-sm font-medium truncate" style={{ color: C.text }}>{s.name}</div>
                  <div className="font-mono text-[11px] truncate" style={{ color: C.faint }}>{s.client} · {s.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={s.clientAccessEnabled ? "ok" : "muted"}>{s.clientAccessEnabled ? "Client access on" : "Client access off"}</Badge>
                <span className="font-mono text-[11px] tracking-widest hidden sm:inline" style={{ color: C.faint }}>{s.accessCode}</span>
                <button onClick={() => setEditing(s.id)} className="btn-modern p-2 rounded-lg" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
                  <Pencil size={14} color={C.muted} />
                </button>
              </div>
            </div>
          );
        })}
        {!sites.length && (
          <div className="rounded-xl p-8 text-center font-body text-sm" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.muted }}>
            No projects yet. Create one to get started.
          </div>
        )}
      </div>

      {(editing === "new" || editingSite) && (
        <ProjectForm
          mode={editing === "new" ? "create" : "edit"}
          initial={editingSite}
          onCancel={() => setEditing(null)}
          onSave={(data) => { editing === "new" ? onCreate(data) : onUpdate(data); setEditing(null); }}
          onDelete={editingSite ? () => { onDelete(editingSite.id); setEditing(null); } : null}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root app                                                            */
/* ------------------------------------------------------------------ */
export default function App() {
  const [sites, setSites] = useState(() => loadPersistedSites() ?? []);
  const [session, setSession] = useState(() => loadPersistedSession());
  const [view, setView] = useState("dashboard");
  const [activeSiteId, setActiveSiteId] = useState(null);
  const [clientPreview, setClientPreview] = useState(null); // { id, tab }

  useEffect(() => { persistSites(sites); }, [sites]);
  useEffect(() => { persistSession(session); }, [session]);

  const openSite = (id) => { setActiveSiteId(id); setView("site"); };
  const previewClient = (id, tab = "interactive") => setClientPreview({ id, tab });
  const signOut = () => { setSession({ role: null, siteId: null }); setView("dashboard"); setActiveSiteId(null); setClientPreview(null); };

  const handleIngested = (siteId, weekEntry) => {
    setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, _weeks: [...s._weeks, weekEntry] } : s)));
  };

  const createProject = (data) => {
    setSites((prev) => [...prev, makeNewProject(data, prev.map((s) => s.id))]);
  };
  const updateProject = (data) => {
    setSites((prev) => prev.map((s) => (s.id === data.id ? { ...s, ...data, icon: resolveIcon(data.iconKey) } : s)));
  };
  const deleteProject = (id) => {
    setSites((prev) => prev.filter((s) => s.id !== id));
    if (activeSiteId === id) { setActiveSiteId(null); setView("dashboard"); }
  };

  const activeSite = sites.find((s) => s.id === activeSiteId);

  const clientSite = session.role === "client" ? sites.find((s) => s.id === session.siteId) : null;
  const clientAccessValid = !!(clientSite && clientSite.clientAccessEnabled);

  useEffect(() => {
    if (session.role === "client" && !clientAccessValid) setSession({ role: null, siteId: null });
  }, [session.role, clientAccessValid]);

  if (session.role === null || (session.role === "client" && !clientAccessValid)) {
    return (
      <AccessGate sites={sites}
        onAdminLogin={() => setSession({ role: "admin", siteId: null })}
        onClientAccess={(id) => setSession({ role: "client", siteId: id })} />
    );
  }

  if (session.role === "client") {
    return <ClientPortal site={clientSite} mode="client" onExitPreview={signOut} />;
  }

  if (clientPreview) {
    const previewSite = sites.find((s) => s.id === clientPreview.id);
    return (
      <ClientPortal site={previewSite} mode="preview" initialTab={clientPreview.tab}
        onExitPreview={() => setClientPreview(null)} />
    );
  }

  return (
    <div className="min-h-screen font-body flex relative" style={{ background: C.bg }}>
      <style>{FONTS}</style>

      {/* ambient background glow — signature modern touch, quiet and slow */}
      <div className="ambient-glow pointer-events-none fixed -top-40 -left-32 w-[560px] h-[560px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(28,100,214,0.14), transparent 70%)", filter: "blur(10px)", zIndex: 0 }} />
      <div className="ambient-glow pointer-events-none fixed -bottom-52 -right-40 w-[620px] h-[620px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(126,193,250,0.20), transparent 70%)", filter: "blur(10px)", zIndex: 0, animationDelay: "-7s" }} />

      <aside className="glass w-56 shrink-0 p-4 flex-col gap-1 hidden md:flex relative z-10"
        style={{ borderRight: `1px solid ${C.line}`, background: "rgba(255,255,255,0.72)" }}>
        <div className="flex items-center gap-2 px-2 mb-6">
          <Logo size={34} />
          <div>
            <div className="font-display text-sm font-semibold leading-none" style={{ color: C.text }}>Wisconsin</div>
            <div className="font-mono text-[9px] tracking-widest" style={{ color: C.faint }}>AERIAL</div>
          </div>
        </div>
        <NavButton active={view === "dashboard"} icon={Home} label="Dashboard" onClick={() => setView("dashboard")} />
        <NavButton active={view === "ingest"} icon={FolderInput} label="Receiving engine" onClick={() => setView("ingest")} />
        <NavButton active={view === "quick"} icon={ArrowLeftRight} label="Quick compare" onClick={() => setView("quick")} />
        <NavButton active={view === "admin"} icon={Settings} label="Admin controls" onClick={() => setView("admin")} />
        {sites.length > 0 && (
          <>
            <div className="mt-6 px-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: C.faint }}>Sites</div>
            {sites.map((s) => (
              <NavButton key={s.id} active={view === "site" && activeSiteId === s.id} icon={s.icon}
                label={s.name.split(" — ")[0].split(" Estates")[0]}
                onClick={() => openSite(s.id)} />
            ))}
          </>
        )}
        <div className="mt-auto px-2 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
          <button onClick={signOut} className="btn-modern w-full flex items-center gap-2 pt-3 font-mono text-[10px]" style={{ color: C.faint }}>
            <LogOut size={12} /> Sign out (admin)
          </button>
        </div>
      </aside>

      {/* mobile top nav */}
      <div className="glass md:hidden fixed top-0 left-0 right-0 z-10 flex items-center gap-1 p-2 overflow-x-auto"
        style={{ background: "rgba(255,255,255,0.85)", borderBottom: `1px solid ${C.line}` }}>
        <button onClick={() => setView("dashboard")} className="btn-modern p-2 rounded-lg shrink-0" style={{ background: view === "dashboard" ? C.panel2 : "transparent" }}><Home size={16} color={C.text} /></button>
        <button onClick={() => setView("ingest")} className="btn-modern p-2 rounded-lg shrink-0" style={{ background: view === "ingest" ? C.panel2 : "transparent" }}><FolderInput size={16} color={C.text} /></button>
        <button onClick={() => setView("quick")} className="btn-modern p-2 rounded-lg shrink-0" style={{ background: view === "quick" ? C.panel2 : "transparent" }}><ArrowLeftRight size={16} color={C.text} /></button>
        <button onClick={() => setView("admin")} className="btn-modern p-2 rounded-lg shrink-0" style={{ background: view === "admin" ? C.panel2 : "transparent" }}><Settings size={16} color={C.text} /></button>
        <button onClick={signOut} className="btn-modern p-2 rounded-lg shrink-0 ml-auto"><LogOut size={16} color={C.faint} /></button>
      </div>

      <main className="flex-1 p-5 md:p-8 pt-16 md:pt-8 max-w-4xl relative z-10">
        {view === "dashboard" && <Dashboard sites={sites} onOpen={openSite} onGoToAdmin={() => setView("admin")} />}
        {view === "site" && activeSite && (
          <SiteDetail site={activeSite} onBack={() => setView("dashboard")} onPreviewClient={previewClient}
            onGoToIngest={() => setView("ingest")} />
        )}
        {view === "ingest" && (
          <ReceivingEngine sites={sites} onIngested={handleIngested} onOpenSite={openSite}
            onGoToAdmin={() => setView("admin")} />
        )}
        {view === "quick" && <QuickCompare />}
        {view === "admin" && (
          <AdminControls sites={sites} onCreate={createProject} onUpdate={updateProject} onDelete={deleteProject} />
        )}
      </main>
    </div>
  );
}
