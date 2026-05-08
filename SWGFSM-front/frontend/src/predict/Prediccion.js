import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Helpers ────────────────────────────────────────────────────────────────────
const estimatePh = (dias, tamano, tipo) => {
  const TAMANO_MAP = { Pequeño: 0, Mediano: 1, Grande: 2, grande: 2, "": 1 };
  const TIPO_MAP   = { Exportación: 0, Fuerte: 0, Local: 1, Hass: 1, Orgánico: 2, Hall: 2 };
  const tamOff = [0.1, 0.0, -0.05][TAMANO_MAP[tamano] ?? 1] ?? 0;
  const tipOff = [0.0, -0.1, 0.15][TIPO_MAP[tipo]     ?? 0] ?? 0;
  return Math.max(4.5, parseFloat((7.8 - dias * 0.24 + tamOff + tipOff).toFixed(2)));
};

const ESTADO_LABELS = ["verde", "sazon", "maduro", "punto_negro"];
const ACCIONES_MAP  = ["En proceso", "Almacenar", "Vender hoy", "Venta urgente"];
const ESTADO_CONFIG = {
  maduro:      { label: "Maduro",      bg: "bg-yellow-100",  text: "text-yellow-800"  },
  punto_negro: { label: "Punto negro", bg: "bg-red-100",     text: "text-red-800"     },
  sazon:       { label: "Sazón",       bg: "bg-emerald-100", text: "text-emerald-800" },
  verde:       { label: "Verde",       bg: "bg-sky-100",     text: "text-sky-800"     },
};

const SUB_LOTE_CONFIG = {
  verde:  { label: "Lote físico verde",  bg: "bg-sky-50",     text: "text-sky-700",     icon: "🟢" },
  sazon:  { label: "Lote físico sazón",  bg: "bg-emerald-50", text: "text-emerald-700", icon: "🟡" },
  maduro: { label: "Lote físico maduro", bg: "bg-yellow-50",  text: "text-yellow-700",  icon: "🟠" },
  sin_definir: { label: "Lote sin definir", bg: "bg-gray-50", text: "text-gray-600", icon: "⚪" },
};


const API = "http://localhost:5000/api/prediccion";

// ── Hook — carga datos desde la API ───────────────────────────────────────────
const useInventarioML = () => {
  const [data,        setData]        = useState([]);
  const [resumen,     setResumen]     = useState(null);
  const [historialDB, setHistorialDB] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, resRes, histRes] = await Promise.all([
        fetch(`${API}/inventario`).then(r => r.json()),
        fetch(`${API}/resumen`).then(r => r.json()),
        fetch(`${API}/historial`).then(r => r.json()),
      ]);

      if (invRes.ok) {
        const normalizarSubLote = (value) => {
  if (!value) return null;
  const v = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (v === "verde" || v === "sazon" || v === "maduro") return v;
  return null;
};

const mapped = invRes.data.map(p => ({
  _id:         p._id,
  productoId:  p.productoId,
  fecha:       p.fecha ? new Date(p.fecha).toISOString().split("T")[0] : "—",
  proveedor:   p.proveedor ?? p.categoriaId ?? "—",
  producto:    p.producto ?? "Palta",
  tipo:        p.tipo ?? "",
  tamano:      p.tamano ?? "",
  subLote:     normalizarSubLote(p.subLote) ?? "sin_definir",
  cant:        p.cantidad ?? 0,
  diasAlmacen: p.diasAlmacen ?? 0,
  phEstimado:  p.phEstimado ?? null,
  estadoML:    p.estadoML ?? null,
  confianza:   typeof p.confianza === "number" ? p.confianza : 0,
  probs:       Array.isArray(p.probs) ? p.probs : [],
  accion:      p.accion ?? "—",
  accuracy:    typeof p.accuracy === "number" ? p.accuracy : null,
}));
        setData(mapped);
      }
      if (resRes.ok)  setResumen(resRes.data);
      if (histRes.ok) setHistorialDB(histRes.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [cargar]);

  return { data, resumen, historialDB, loading, error, recargar: cargar };
};

// ── Sonido de alerta ──────────────────────────────────────────────────────────
const playAlertSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (startTime, freq = 880) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.35);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + 0.36);
    };
    beep(0.0, 880); beep(0.4, 880); beep(0.8, 1100);
  } catch (e) { /* AudioContext no disponible */ }
};

// ── Modal de alerta ────────────────────────────────────────────────────────────
const AlertModal = ({ predictions, onDismiss }) => {
  const criticos = predictions.filter(p => p.estadoML === "punto_negro" || p.estadoML === "maduro");
  if (!criticos.length) return null;
  const tienePuntoNegro = criticos.some(p => p.estadoML === "punto_negro");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-red-200 flex flex-col" style={{ maxHeight: "80vh" }}>
        <div className={`px-5 py-4 flex items-start gap-3 flex-shrink-0 rounded-t-3xl ${tienePuntoNegro ? "bg-red-50" : "bg-yellow-50"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tienePuntoNegro ? "bg-red-100" : "bg-yellow-100"}`}>
            <span className="text-xl">{tienePuntoNegro ? "⚠️" : "🟡"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm leading-snug ${tienePuntoNegro ? "text-red-800" : "text-yellow-800"}`}>
              {tienePuntoNegro ? "¡Paltas en punto negro detectadas!" : "Paltas maduras — acción requerida"}
            </p>
            <p className={`text-xs mt-0.5 ${tienePuntoNegro ? "text-red-500" : "text-yellow-600"}`}>
              {criticos.length} sub-lote{criticos.length > 1 ? "s" : ""} crítico{criticos.length > 1 ? "s" : ""} · actúa de inmediato
            </p>
          </div>
          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${tienePuntoNegro ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
            {criticos.length}
          </span>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2" style={{ overscrollBehavior: "contain" }}>
          {criticos.map((p, i) => (
            <div key={i} className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${p.estadoML === "punto_negro" ? "bg-red-50 border-red-100" : "bg-yellow-50 border-yellow-100"}`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{p.producto}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {p.cant} kg · {p.diasAlmacen}d
                  {p.subLote ? ` · ${SUB_LOTE_CONFIG[p.subLote]?.label ?? p.subLote}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right space-y-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.estadoML === "punto_negro" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {ESTADO_CONFIG[p.estadoML].label}
                </span>
                <p className={`text-[11px] font-semibold ${p.estadoML === "punto_negro" ? "text-red-600" : "text-yellow-600"}`}>
                  ⚠ {ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}
                </p>
              </div>
            </div>
          ))}
        </div>
        {criticos.length > 3 && (
          <p className="text-center text-[10px] text-gray-400 pb-1 flex-shrink-0">↓ desliza para ver más</p>
        )}
        <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-gray-100">
          <button onClick={onDismiss} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition">
            Entendido — gestionar ahora
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Loaders ────────────────────────────────────────────────────────────────────
const useChartJs = () => {
  const [ready, setReady] = useState(!!window.Chart);
  useEffect(() => {
    if (window.Chart) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = () => setReady(true); document.head.appendChild(s);
  }, []);
  return ready;
};

// ── Componentes UI ─────────────────────────────────────────────────────────────
const Badge = ({ estado }) => {
  const cfg = ESTADO_CONFIG[estado] ?? { label: estado, bg: "bg-gray-100", text: "text-gray-700" };
  return <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
};
const SubLoteBadge = ({ subLote }) => {
  const cfg = SUB_LOTE_CONFIG[subLote] ?? { label: subLote, bg: "bg-gray-50", text: "text-gray-600", icon: "⚪" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span>{cfg.icon}</span>{cfg.label}
    </span>
  );
};
const ConfidencePill = ({ value }) => {
  if (typeof value !== "number") {
    return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">—</span>;
  }

  const pct = Math.round(value * 100);
  const color =
    pct >= 90
      ? "bg-emerald-100 text-emerald-800"
      : pct >= 75
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
      {pct}%
    </span>
  );
};

const PhBadge = ({ ph }) => <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 font-mono">{ph}</span>;
const CalBadge = ({ cal }) => {
  const map = { Excelente: "bg-emerald-100 text-emerald-800", Bueno: "bg-sky-100 text-sky-800", Regular: "bg-yellow-100 text-yellow-800" };
  return <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${map[cal] ?? "bg-gray-100 text-gray-700"}`}>{cal}</span>;
};
const DotTimeline = ({ color }) => {
  const map = { rojo: "bg-red-500", amarillo: "bg-yellow-500", verde: "bg-emerald-500" };
  return <span className={`absolute -left-[9px] top-1 w-3 h-3 rounded-full border-2 border-lime-50 ${map[color]}`} />;
};
const HBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-24 text-right text-emerald-700 shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-4 bg-lime-100 rounded overflow-hidden">
        {value > 0
          ? <div className={`h-full ${color} flex items-center pl-2 text-white font-semibold text-[10px]`} style={{ width: `${Math.max(pct, 6)}%` }}>{value} kg</div>
          : <div className="h-full flex items-center pl-2 text-gray-400 text-[10px]">0 kg</div>}
      </div>
      <span className={`w-10 text-right font-semibold ${value > 0 ? "text-emerald-700" : "text-gray-400"}`}>{pct}%</span>
    </div>
  );
};
const ProgressBar = ({ value, max, color }) => (
  <div className="h-1.5 bg-lime-100 rounded-full overflow-hidden mt-1">
    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%` }} />
  </div>
);
const MetricCard = ({ label, value, sub, valueColor = "text-emerald-900" }) => (
  <div className="bg-lime-100 rounded-2xl p-4">
    <p className="text-xs text-emerald-700 mb-1">{label}</p>
    <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
    {sub && <p className="text-[11px] text-emerald-600 mt-1">{sub}</p>}
  </div>
);
const Skel = ({ className }) => <div className={`bg-lime-200 animate-pulse rounded-lg ${className}`} />;
const ChartSkeleton = ({ height = "h-44" }) => (
  <div className={`${height} flex flex-col items-center justify-center gap-2 bg-lime-50 rounded-xl border border-lime-200`}>
    <div className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
    <p className="text-xs text-emerald-600">Cargando datos…</p>
  </div>
);
const InfoNote = ({ children }) => (
  <p className="text-xs text-emerald-600 mt-2 px-3 py-2 bg-lime-50 rounded-lg border border-lime-200">{children}</p>
);

const diasColor   = (d) => d >= 7 ? "text-red-700" : d >= 5 ? "text-yellow-700" : "text-emerald-700";
const accionColor = (e) => (e === "punto_negro" || e === "maduro") ? "text-red-600" : "text-emerald-700";
const accionPrefix = (e) => (e === "punto_negro" || e === "maduro") ? "⚠ " : "✓ ";

// ── Tarjeta de producto agrupado con sus 3 sub-lotes ──────────────────────────
const ProductoCard = ({ productoNombre, sublotes }) => {
  const totalKg = sublotes.reduce((s, sl) => s + (sl.cant ?? 0), 0);
  const tieneRiesgo = sublotes.some(sl => sl.estadoML === "punto_negro" || sl.estadoML === "maduro");

  const SUBLOTE_ORDER = ["verde", "sazon", "maduro"];
  const sortedSublotes = [...sublotes].sort(
    (a, b) => SUBLOTE_ORDER.indexOf(a.subLote) - SUBLOTE_ORDER.indexOf(b.subLote)
  );

  return (
    <div className={`rounded-2xl border overflow-hidden ${tieneRiesgo ? "border-red-200" : "border-lime-200"} bg-white`}>
      {/* Header del producto */}
      <div className={`px-4 py-3 flex items-center justify-between ${tieneRiesgo ? "bg-red-50" : "bg-lime-50"}`}>
        <div>
          <p className="font-semibold text-sm text-emerald-900">{productoNombre}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">
            {sublotes[0]?.tipo ?? "—"} · {sublotes[0]?.tamano ?? "—"} · {totalKg} kg total
          </p>
        </div>
        {tieneRiesgo && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">⚠ Atención</span>
        )}
      </div>

      {/* Barra visual de distribución de stocks */}
      <div className="px-4 py-2 border-b border-lime-100">
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {sortedSublotes.map((sl, i) => {
            const pct = totalKg > 0 ? (sl.cant / totalKg) * 100 : 0;
            const colors = { verde: "bg-sky-400", sazon: "bg-emerald-400", maduro: "bg-yellow-400" };
            return pct > 0 ? (
              <div
                key={i}
                className={`${colors[sl.subLote] ?? "bg-gray-300"} transition-all`}
                style={{ width: `${pct}%` }}
                title={`${SUB_LOTE_CONFIG[sl.subLote]?.label}: ${sl.cant} kg (${Math.round(pct)}%)`}
              />
            ) : null;
          })}
        </div>
        <div className="flex gap-3 mt-1.5">
          {sortedSublotes.map((sl, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full inline-block ${
                sl.subLote === "verde" ? "bg-sky-400" : sl.subLote === "sazon" ? "bg-emerald-400" : "bg-yellow-400"
              }`} />
              <span className="text-[10px] text-gray-500">
                {SUB_LOTE_CONFIG[sl.subLote]?.label?.replace("Stock ", "") ?? sl.subLote}: {sl.cant} kg
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filas por sub-lote */}
      <div className="divide-y divide-lime-50">
        {sortedSublotes.map((sl, i) => {
          const phE = sl.phEstimado ?? estimatePh(sl.diasAlmacen ?? 0, sl.tamano, sl.tipo);
          return (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3">
              <SubLoteBadge subLote={sl.subLote} />
              <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                <div>
                  <p className="text-[11px] text-gray-500">Cantidad</p>
                  <p className="text-xs font-semibold text-emerald-800">{sl.cant} kg</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">pH est.</p>
                  <PhBadge ph={phE} />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Estado ML</p>
                  <Badge estado={sl.estadoML} />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Confianza</p>
                  <ConfidencePill value={sl.confianza} />
                </div>
              </div>
              <div className={`text-[11px] font-semibold shrink-0 ${accionColor(sl.estadoML)}`}>
                {accionPrefix(sl.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(sl.estadoML)]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TABS = [
  { id: "resumen",    label: "Resumen"    },
  { id: "productos",  label: "Productos"  },
  { id: "graficos",   label: "Análisis"   },
  { id: "inventario", label: "Inventario" },
  { id: "historial",  label: "Historial"  },
];

const useChart = (canvasRef, config) => {
  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    const chart = new window.Chart(canvasRef.current, config);
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const LineChartCanvas = ({ enRiesgo, enSazon }) => {
  const ref = useRef(null);
  const gen = (end, f) => Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(end * (0.4 + (i / 6) * 0.6 * f))));
  useChart(ref, {
    type: "line",
    data: {
      labels: ["-6d", "-5d", "-4d", "-3d", "-2d", "Ayer", "Hoy"],
      datasets: [
        { label: "En riesgo", data: gen(enRiesgo, 1),   borderColor: "#dc2626", backgroundColor: "rgba(220,38,38,.1)",  tension: .4, fill: true, pointRadius: 3 },
        { label: "En sazón",  data: gen(enSazon, 1.5),  borderColor: "#15803d", backgroundColor: "rgba(21,128,61,.1)",  tension: .4, fill: true, pointRadius: 3 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 10, padding: 8 } } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } },
  });
  return <canvas ref={ref} />;
};
const DoughnutChartCanvas = ({ data }) => {
  const ref = useRef(null);
  useChart(ref, {
    type: "doughnut",
    data: { labels: ["Punto negro", "Maduro", "Sazón", "Verde"], datasets: [{ data, backgroundColor: ["#dc2626", "#d97706", "#15803d", "#0284c7"], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { font: { size: 11 }, boxWidth: 10, padding: 8 } } } },
  });
  return <canvas ref={ref} />;
};
const BarChartCanvas = ({ labels, values }) => {
  const ref = useRef(null);
  useChart(ref, {
    type: "bar",
    data: { labels, datasets: [{ label: "Kg en riesgo", data: values, backgroundColor: values.map(v => v > 0 ? "#dc2626" : "#15803d"), borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 11 } } } } },
  });
  return <canvas ref={ref} />;
};

// ── Componente de stocks de un producto (vista detallada) ──────────────────────
const StockBreakdownCard = ({ sublotes, productoNombre }) => {
  const SUBLOTE_ORDER = ["verde", "sazon", "maduro"];
  const sorted = [...sublotes].sort((a, b) => SUBLOTE_ORDER.indexOf(a.subLote) - SUBLOTE_ORDER.indexOf(b.subLote));
  const total = sublotes.reduce((s, sl) => s + (sl.cant ?? 0), 0);

  const stockColors = {
    verde:  { bar: "bg-sky-400",     text: "text-sky-700",     ring: "ring-sky-200"     },
    sazon:  { bar: "bg-emerald-400", text: "text-emerald-700", ring: "ring-emerald-200" },
    maduro: { bar: "bg-yellow-400",  text: "text-yellow-700",  ring: "ring-yellow-200"  },
  };

  return (
    <div className="bg-white rounded-2xl border border-lime-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-emerald-800">{productoNombre}</p>
        <span className="text-xs text-emerald-600 font-medium">{total} kg total</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((sl, i) => {
          const pct = total > 0 ? Math.round((sl.cant / total) * 100) : 0;
          const cfg = stockColors[sl.subLote] ?? { bar: "bg-gray-300", text: "text-gray-600", ring: "ring-gray-200" };
          return (
            <div key={i} className={`rounded-xl p-3 bg-lime-50 ring-1 ${cfg.ring}`}>
              <div className="flex items-center gap-1 mb-2">
                <span className={`w-2 h-2 rounded-full ${cfg.bar}`} />
                <span className={`text-[10px] font-semibold ${cfg.text}`}>
                  {SUB_LOTE_CONFIG[sl.subLote]?.label?.replace("Stock ", "") ?? sl.subLote}
                </span>
              </div>
              <p className={`text-lg font-bold ${cfg.text}`}>{sl.cant}</p>
              <p className="text-[10px] text-gray-500">kg · {pct}%</p>
              <div className="mt-2">
                <Badge estado={sl.estadoML} />
              </div>
            </div>
          );
        })}
      </div>
      {/* Mini barra de distribución */}
      <div className="h-2 flex rounded-full overflow-hidden gap-0.5">
        {sorted.map((sl, i) => {
          const pct = total > 0 ? (sl.cant / total) * 100 : 0;
          const colors = { verde: "bg-sky-400", sazon: "bg-emerald-400", maduro: "bg-yellow-400" };
          return pct > 0 ? <div key={i} className={colors[sl.subLote] ?? "bg-gray-200"} style={{ width: `${pct}%` }} /> : null;
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
const Prediccion = () => {
  const [tab,    setTab]    = useState("resumen");
  const [filtro, setFiltro] = useState("todos");
  const [showAlert,      setShowAlert]      = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const chartReady = useChartJs();

  const {
    data: inventarioDB,
    resumen,
    historialDB,
    loading: dbLoading,
    error: dbError,
    recargar,
  } = useInventarioML();

  const reentrenarBackend = useCallback(async () => {
    try {
      await fetch(`${API}/reentrenar`, { method: "POST" });
      setTimeout(() => recargar(), 30000);
    } catch (e) {
      console.error("Error al re-entrenar:", e);
    }
  }, [recargar]);

  const predictions = inventarioDB;
  const mlStatus    = dbLoading ? "training" : dbError ? "error" : "ready";

  // ── Métricas ────────────────────────────────────────────────────────────────
  const totalKg     = resumen?.totalKg    ?? predictions.reduce((s, p) => s + (p.cant ?? 0), 0);
  const totalRiesgo = resumen?.totalRiesgo ?? predictions.filter(p => p.estadoML === "punto_negro" || p.estadoML === "maduro").length;
  const totalSazon  = resumen?.totalSazon  ?? predictions.filter(p => p.estadoML === "sazon").length;
  const diasProm    = resumen?.diasProm    ?? (predictions.length ? (predictions.reduce((s, p) => s + (p.diasAlmacen ?? 0), 0) / predictions.length).toFixed(1) : "—");
  const avgConf     = resumen?.avgConf     ?? (predictions.length ? Math.round((predictions.reduce((s, p) => s + (p.confianza ?? 0), 0) / predictions.length) * 100) : null);
  const accuracy =
  resumen?.accuracy ??
  predictions.find(p => typeof p.accuracy === "number")?.accuracy ??
  null;

  // ── Stocks totales por tipo de sub-lote ──────────────────────────────────────
  const totalVerde  = predictions.filter(p => p.subLote === "verde").reduce((s, p) => s + (p.cant ?? 0), 0);
  const totalSazonKg = predictions.filter(p => p.subLote === "sazon").reduce((s, p) => s + (p.cant ?? 0), 0);
  const totalMaduro = predictions.filter(p => p.subLote === "maduro").reduce((s, p) => s + (p.cant ?? 0), 0);

  const countByEstado = (est) => predictions.filter(p => p.estadoML === est).reduce((s, p) => s + (p.cant ?? 0), 0);
  const doughnutData  = ["punto_negro", "maduro", "sazon", "verde"].map(countByEstado);

  // ── Agrupar sub-lotes por productoId para la vista de productos ───────────────
  const productosAgrupados = Object.values(
    predictions.reduce((acc, p) => {
      const key = p.productoId ?? p.producto;
      if (!acc[key]) acc[key] = { nombre: p.producto, sublotes: [] };
      acc[key].sublotes.push(p);
      return acc;
    }, {})
  );

  // ── Filtro para tab Productos ─────────────────────────────────────────────────
  const productosFiltrados = productosAgrupados.filter(prod => {
    if (filtro === "riesgo") return prod.sublotes.some(sl => sl.estadoML === "punto_negro" || sl.estadoML === "maduro");
    if (filtro === "sazon")  return prod.sublotes.some(sl => sl.estadoML === "sazon");
    return true;
  });

  // ── Historial ───────────────────────────────────────────────────────────────
  const historialFuente = (historialDB.length > 0 ? historialDB : predictions).map(p => ({
    color:     p.estadoML === "punto_negro" ? "rojo" : p.estadoML === "maduro" ? "amarillo" : "verde",
    nombre:    `${p.producto ?? ""} (${SUB_LOTE_CONFIG[p.subLote]?.label ?? p.subLote ?? ""}) — ${ESTADO_CONFIG[p.estadoML]?.label ?? p.estadoML}`,
    detalle:   `${p.cant ?? p.cantidad ?? 0} kg · ${p.proveedor ?? "—"} · ${p.tamano ?? ""} · ${p.tipo ?? ""}`,
    proveedor: p.proveedor ?? "—",
    fecha:     new Date(p.fecha).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
  }));

  // ── Calificación por tipo de palta ─────────────────────────────────────────
  const tiposUnicos = [...new Set(predictions.map(p => p.producto))];
  const CALIFICACIONES = tiposUnicos.map(prod => {
    const lotes  = predictions.filter(p => p.producto === prod);
    const total  = lotes.reduce((s, p) => s + (p.cant ?? 0), 0);
    const riesgo = lotes.filter(p => p.estadoML === "punto_negro" || p.estadoML === "maduro").reduce((s, p) => s + (p.cant ?? 0), 0);
    const cal    = mlStatus !== "ready" ? null : riesgo === 0 ? "Excelente" : riesgo < total * 0.3 ? "Bueno" : "Regular";
    return { nombre: prod, unidades: total, riesgo, cal };
  });

  const barLabels = CALIFICACIONES.map(p => p.nombre);
  const barValues = CALIFICACIONES.map(p => mlStatus === "ready" ? p.riesgo : 0);

  // ── Alerta automática ───────────────────────────────────────────────────────
  useEffect(() => {
    if (mlStatus !== "ready" || alertDismissed) return;
    if (predictions.some(p => p.estadoML === "punto_negro" || p.estadoML === "maduro")) {
      setShowAlert(true); playAlertSound();
    }
  }, [mlStatus, predictions, alertDismissed]);

  const handleDismissAlert = () => { setShowAlert(false); setAlertDismissed(true); };

  return (
    <>
      {showAlert && <AlertModal predictions={predictions} onDismiss={handleDismissAlert} />}

      <section className="flex-1 p-6 lg:p-8">
        <div className="bg-lime-50 rounded-3xl shadow-lg shadow-lime-900/10 border border-lime-200 overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-6 pb-4 border-b border-lime-200 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-emerald-900">Predicción de madurez — Paltas</h2>
              <p className="text-xs text-emerald-700 mt-0.5">
                Actualizado: {new Date().toLocaleDateString("es-PE")} · Stock total: {totalKg} kg
                {totalVerde > 0 && <span className="ml-2 text-sky-600">· 🟢 Verde: {totalVerde} kg</span>}
                {totalSazonKg > 0 && <span className="ml-2 text-emerald-600">· 🟡 Sazón: {totalSazonKg} kg</span>}
                {totalMaduro > 0 && <span className="ml-2 text-yellow-600">· 🟠 Maduro: {totalMaduro} kg</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {mlStatus === "training" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                  <span className="w-3 h-3 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
                  Cargando datos…
                </span>
              )}
              {mlStatus === "ready" && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  ML activo{accuracy != null ? ` · ${accuracy}% precisión` : ""}{avgConf != null ? ` · ${avgConf}% conf. media` : ""}
                </span>
              )}
              {mlStatus === "error" && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Error al cargar datos</span>
              )}
              {mlStatus === "ready" && totalRiesgo > 0 && (
                <button
                  onClick={() => { setShowAlert(true); playAlertSound(); setAlertDismissed(false); }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition animate-pulse"
                >
                  ⚠ {totalRiesgo} sub-lote{totalRiesgo > 1 ? "s" : ""} en riesgo — ver alerta
                </button>
              )}
              <button
                onClick={recargar}
                disabled={dbLoading}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${dbLoading ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "border-emerald-300 text-emerald-700 hover:bg-lime-100"}`}
              >
                {dbLoading ? "Cargando…" : "↺ Actualizar"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-lime-200 overflow-x-auto bg-lime-100/60">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${tab === t.id ? "border-emerald-700 text-emerald-900 bg-lime-50" : "border-transparent text-emerald-700 hover:text-emerald-900 hover:bg-lime-100"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6 lg:p-8">

            {/* ── RESUMEN ── */}
            {tab === "resumen" && (
              <div className="space-y-6">
                {/* Métricas principales */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard label="Stock total" value={`${totalKg} kg`} sub="Verde + sazón + maduro" />
                  <MetricCard label="Días prom. almacén" value={diasProm} sub="Referencia por sub-lote" valueColor="text-yellow-600" />
                  {mlStatus === "ready"
                    ? <MetricCard label="Sub-lotes en riesgo" value={totalRiesgo} sub="Detectados por ML" valueColor="text-red-600" />
                    : <div className="bg-lime-100 rounded-2xl p-4 space-y-2"><p className="text-xs text-emerald-700">Sub-lotes en riesgo</p><Skel className="h-8 w-16" /><Skel className="h-3 w-24" /></div>}
                  {mlStatus === "ready"
                    ? <MetricCard label="En sazón" value={totalSazon} sub="Sub-lotes listos para venta" valueColor="text-emerald-700" />
                    : <div className="bg-lime-100 rounded-2xl p-4 space-y-2"><p className="text-xs text-emerald-700">En sazón</p><Skel className="h-8 w-16" /><Skel className="h-3 w-24" /></div>}
                </div>

                {/* ── NUEVO: Stock breakdown por sub-lote ── */}
                {mlStatus === "ready" && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">
                      Distribución de stock por tipo — vista por producto
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {productosAgrupados.map((prod, i) => (
                        <StockBreakdownCard key={i} productoNombre={prod.nombre} sublotes={prod.sublotes} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Tabla de predicciones */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Predicciones ML — sub-lotes actuales</p>
                    <div className="rounded-2xl border border-lime-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-emerald-900 text-lime-50">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold text-left">Producto</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Sub-lote</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Días</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Estado ML</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {predictions.map((p, i) => (
                            <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                              <td className="px-4 py-2.5">
                                <p className="font-medium text-xs">{p.producto}</p>
                                <p className="text-[11px] text-emerald-600">{p.cant} kg</p>
                              </td>
                              <td className="px-4 py-2.5"><SubLoteBadge subLote={p.subLote} /></td>
                              <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(p.diasAlmacen)}`}>{p.diasAlmacen}d</td>
                              <td className="px-4 py-2.5">
                                <div className="flex flex-col gap-0.5">
                                  <Badge estado={p.estadoML} />
                                  <ConfidencePill value={p.confianza} />
                                </div>
                              </td>
                              <td className={`px-4 py-2.5 text-xs font-semibold ${accionColor(p.estadoML)}`}>
                                {accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}
                              </td>
                            </tr>
                          ))}
                          {mlStatus === "training" && [1, 2, 3].map(i => (
                            <tr key={i} className="border-t border-lime-100">
                              {[1,2,3,4,5].map(j => <td key={j} className="px-4 py-2.5"><Skel className="h-4 w-full" /></td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <InfoNote>Cada fila es un sub-lote (verde/sazón/maduro) del Producto en MongoDB</InfoNote>
                  </div>

                  <div className="space-y-5">
                    {/* Distribución kg */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Distribución de kg por estado ML</p>
                      {mlStatus === "ready"
                        ? <div className="space-y-2">
                            {["punto_negro", "maduro", "sazon", "verde"].map((est, i) => {
                              const colors = ["bg-red-500", "bg-yellow-500", "bg-emerald-600", "bg-sky-500"];
                              const lbls   = ["Punto negro", "Maduro", "Sazón", "Verde"];
                              return <HBar key={est} label={lbls[i]} value={countByEstado(est)} max={totalKg} color={colors[i]} />;
                            })}
                          </div>
                        : <div className="space-y-2">{[1,2,3,4].map(i => <Skel key={i} className="h-4 w-full" />)}</div>}
                    </div>

                    {/* Vida útil por sub-lote */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Vida útil — días estimados por sub-lote</p>
                      <div className="space-y-2.5">
                        {predictions.slice(0, 6).map((item, idx) => {
                          const dias  = item.diasAlmacen ?? 0;
                          const ph    = item.phEstimado  ?? estimatePh(dias, item.tamano, item.tipo);
                          const color = dias >= 7 ? "bg-red-500" : dias >= 5 ? "bg-yellow-500" : "bg-emerald-600";
                          return (
                            <div key={idx}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-emerald-800">
                                  {item.producto} <span className="text-[10px] text-emerald-500">({SUB_LOTE_CONFIG[item.subLote]?.label ?? item.subLote})</span>
                                </span>
                                <span className={diasColor(dias)}>{dias}d · pH {ph}</span>
                              </div>
                              <ProgressBar value={dias} max={10} color={color} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PRODUCTOS — vista agrupada con tarjetas ── */}
            {tab === "productos" && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap items-center justify-between">
                  <div className="flex gap-2">
                    {[{ id: "todos", label: "Todos" }, { id: "riesgo", label: "En riesgo" }, { id: "sazon", label: "En sazón" }].map(f => (
                      <button key={f.id} onClick={() => mlStatus === "ready" && setFiltro(f.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${filtro === f.id && mlStatus === "ready" ? "bg-emerald-700 text-lime-50 border-emerald-700" : mlStatus !== "ready" ? "border-emerald-100 text-emerald-300 cursor-not-allowed" : "border-emerald-200 text-emerald-700 hover:bg-lime-100"}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-emerald-600">
                    {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? "s" : ""} · {predictions.length} sub-lotes en total
                  </p>
                </div>

                {/* Vista de cards por producto — cada una muestra sus 3 stocks */}
                {mlStatus === "ready" ? (
                  <div className="space-y-4">
                    {productosFiltrados.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400">Sin productos en este estado</div>
                    ) : (
                      productosFiltrados.map((prod, i) => (
                        <ProductoCard key={i} productoNombre={prod.nombre} sublotes={prod.sublotes} />
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">{[1,2,3].map(i => <Skel key={i} className="h-40 w-full" />)}</div>
                )}

                <InfoNote>
                  Cada tarjeta muestra un producto con sus 3 sub-lotes (stockPaltaVerde / stockPaltaSazon / stockPaltaMadura).
                  La barra de color refleja la proporción de cada stock. El estado ML es predicho por el modelo entrenado.
                </InfoNote>
              </div>
            )}

            {/* ── GRÁFICOS ── */}
            {tab === "graficos" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {mlStatus === "ready"
                    ? (<>
                        <MetricCard label="Precisión del modelo" value={accuracy != null ? `${accuracy}%` : "—"} sub="Reportada por backend" valueColor="text-emerald-700" />
                        <MetricCard label="Confianza media" value={avgConf != null ? `${avgConf}%` : "—"} sub="En todos los sub-lotes" valueColor="text-sky-700" />
                        <MetricCard label="Sub-lotes en riesgo" value={totalRiesgo} sub="Punto negro + maduro" valueColor="text-red-600" />
                      </>)
                    : [1, 2, 3].map(i => (<div key={i} className="bg-lime-100 rounded-2xl p-4 space-y-2"><Skel className="h-3 w-24" /><Skel className="h-8 w-16" /><Skel className="h-3 w-20" /></div>))}
                </div>

                {/* Stocks totales por sub-lote */}
                {mlStatus === "ready" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
                      <p className="text-xs text-sky-600 mb-1">🟢 Stock Verde total</p>
                      <p className="text-2xl font-semibold text-sky-800">{totalVerde} kg</p>
                      <p className="text-[11px] text-sky-500 mt-1">Recién ingresado</p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                      <p className="text-xs text-emerald-600 mb-1">🟡 Stock Sazón total</p>
                      <p className="text-2xl font-semibold text-emerald-800">{totalSazonKg} kg</p>
                      <p className="text-[11px] text-emerald-500 mt-1">En maduración</p>
                    </div>
                    <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
                      <p className="text-xs text-yellow-600 mb-1">🟠 Stock Maduro total</p>
                      <p className="text-2xl font-semibold text-yellow-800">{totalMaduro} kg</p>
                      <p className="text-[11px] text-yellow-500 mt-1">Listo para venta</p>
                    </div>
                  </div>
                )}

                {chartReady ? (
                  <div className="space-y-4">
                    <div className="grid lg:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-lime-200 p-4">
                        <p className="text-xs font-semibold text-emerald-800 mb-1">Evolución estimada — 7 días</p>
                        <p className="text-[10px] text-gray-400 mb-3">Proyección basada en estado ML actual</p>
                        {mlStatus === "ready"
                          ? <div className="relative h-44">
                              <LineChartCanvas
                                key={`l-${totalRiesgo}-${totalSazon}`}
                                enRiesgo={predictions.filter(p => p.estadoML === "punto_negro" || p.estadoML === "maduro").reduce((s, p) => s + (p.cant ?? 0), 0)}
                                enSazon={predictions.filter(p => p.estadoML === "sazon").reduce((s, p) => s + (p.cant ?? 0), 0)}
                              />
                            </div>
                          : <ChartSkeleton height="h-44" />}
                      </div>
                      <div className="rounded-2xl border border-lime-200 p-4">
                        <p className="text-xs font-semibold text-emerald-800 mb-3">Distribución por estado ML — kg</p>
                        {mlStatus === "ready"
                          ? <div className="relative h-44"><DoughnutChartCanvas key={`d-${doughnutData.join("-")}`} data={doughnutData} /></div>
                          : <ChartSkeleton height="h-44" />}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-lime-200 p-4">
                      <p className="text-xs font-semibold text-emerald-800 mb-3">Kg en riesgo por tipo de palta (ML)</p>
                      {mlStatus === "ready"
                        ? <div className="relative h-36"><BarChartCanvas key={`b-${barValues.join("-")}`} labels={barLabels} values={barValues} /></div>
                        : <ChartSkeleton height="h-36" />}
                    </div>
                  </div>
                ) : <div className="space-y-4"><ChartSkeleton height="h-44" /><ChartSkeleton height="h-36" /></div>}
              </div>
            )}

            {/* ── INVENTARIO ── */}
            {tab === "inventario" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Resumen por sub-lote — stocks del Producto
                </p>

                {/* Tarjetas de stock por producto */}
                {mlStatus === "ready" && productosAgrupados.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    {productosAgrupados.map((prod, i) => (
                      <StockBreakdownCard key={i} productoNombre={prod.nombre} sublotes={prod.sublotes} />
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-lime-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-emerald-900 text-lime-50">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-left">Producto</th>
                        <th className="px-4 py-3 font-semibold text-left">Tipo / Tamaño</th>
                        <th className="px-4 py-3 font-semibold text-left">Sub-lote</th>
                        <th className="px-4 py-3 font-semibold text-left">Kg</th>
                        <th className="px-4 py-3 font-semibold text-left">Días ref.</th>
                        <th className="px-4 py-3 font-semibold text-left">pH est.</th>
                        <th className="px-4 py-3 font-semibold text-left">Estado ML</th>
                        <th className="px-4 py-3 font-semibold text-left">Confianza</th>
                        <th className="px-4 py-3 font-semibold text-left">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map((p, i) => (
                        <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                          <td className="px-4 py-2.5 font-medium text-xs">{p.producto}</td>
                          <td className="px-4 py-2.5 text-xs text-emerald-600">{p.tipo} / {p.tamano || "—"}</td>
                          <td className="px-4 py-2.5"><SubLoteBadge subLote={p.subLote} /></td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-emerald-800">{p.cant} kg</td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(p.diasAlmacen)}`}>{p.diasAlmacen}d</td>
                          <td className="px-4 py-2.5"><PhBadge ph={p.phEstimado ?? estimatePh(p.diasAlmacen ?? 0, p.tamano, p.tipo)} /></td>
                          <td className="px-4 py-2.5"><Badge estado={p.estadoML} /></td>
                          <td className="px-4 py-2.5"><ConfidencePill value={p.confianza} /></td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${accionColor(p.estadoML)}`}>
                            {accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}
                          </td>
                        </tr>
                      ))}
                      {mlStatus === "training" && [1, 2, 3].map(i => (
                        <tr key={i} className="border-t border-lime-100">
                          {[1,2,3,4,5,6,7,8,9].map(j => <td key={j} className="px-4 py-2.5"><Skel className="h-4 w-full" /></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <InfoNote>
                  "Días ref." = días representativos por estado del sub-lote (verde ≈ 1.5d, sazón ≈ 4.5d, maduro ≈ 6.5d) ·
                  Sub-lote refleja stockPaltaVerde / stockPaltaSazon / stockPaltaMadura ·
                  Estado y confianza calculados por el modelo ML
                </InfoNote>

                {mlStatus === "ready" && CALIFICACIONES.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Calificación por tipo de palta (ML)</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {CALIFICACIONES.map(pv => (
                        <div key={pv.nombre} className="rounded-2xl border border-lime-200 p-4 bg-white space-y-1.5">
                          <p className="font-semibold text-sm text-emerald-900">{pv.nombre}</p>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Kg total</span><span className="font-medium text-emerald-900">{pv.unidades} kg</span></div>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">En riesgo</span><span className={`font-medium ${pv.riesgo > 0 ? "text-red-600" : "text-emerald-700"}`}>{pv.riesgo} kg</span></div>
                          <ProgressBar value={pv.riesgo} max={pv.unidades || 1} color={pv.riesgo > 0 ? "bg-red-500" : "bg-emerald-500"} />
                          {pv.cal && <CalBadge cal={pv.cal} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORIAL ── */}
            {tab === "historial" && (
              <div className="space-y-6">
                {mlStatus === "ready" && predictions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Alertas generadas — sub-lotes actuales</p>
                    <div className="rounded-2xl border border-lime-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-emerald-900 text-lime-50">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold text-left">Producto</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Sub-lote</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Kg</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Días ref.</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Estado ML</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Acción recomendada</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Confianza</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...predictions]
                            .sort((a, b) => ESTADO_LABELS.indexOf(b.estadoML) - ESTADO_LABELS.indexOf(a.estadoML))
                            .map((p, i) => (
                              <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                                <td className="px-4 py-2.5 font-medium text-xs">{p.producto}</td>
                                <td className="px-4 py-2.5"><SubLoteBadge subLote={p.subLote} /></td>
                                <td className="px-4 py-2.5 text-xs font-semibold text-emerald-800">{p.cant} kg</td>
                                <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(p.diasAlmacen)}`}>{p.diasAlmacen}d</td>
                                <td className="px-4 py-2.5"><Badge estado={p.estadoML} /></td>
                                <td className={`px-4 py-2.5 text-xs font-semibold ${accionColor(p.estadoML)}`}>
                                  {accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}
                                </td>
                                <td className="px-4 py-2.5"><ConfidencePill value={p.confianza} /></td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {historialFuente.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Línea de tiempo — eventos registrados</p>
                    <div className="relative pl-5 border-l-2 border-lime-200 space-y-5">
                      {historialFuente.map((ev, i) => (
                        <div key={i} className="relative pl-3">
                          <DotTimeline color={ev.color} />
                          <p className="text-sm font-medium text-emerald-900">{ev.nombre}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{ev.detalle}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ev.color === "rojo" ? "bg-red-100 text-red-700" : ev.color === "amarillo" ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {ev.fecha}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-4">
                  <button
                    onClick={reentrenarBackend}
                    disabled={dbLoading}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${dbLoading ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"}`}
                  >
                    {dbLoading ? "Procesando…" : "Re-entrenar modelo"}
                  </button>
                  <p className="text-[11px] text-gray-400">Tarda ~30 s · los resultados se recargan automáticamente</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>
    </>
  );
};

export default Prediccion;