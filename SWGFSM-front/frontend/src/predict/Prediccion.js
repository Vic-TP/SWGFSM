import React, { useState, useEffect, useRef, useCallback } from "react";

const computeDias = (fecha) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entry = new Date(fecha + "T00:00:00");
  return Math.max(0, Math.floor((today - entry) / 86400000));
};

const estimatePh = (dias, tamano, tipo) => {
  const TAMANO_MAP = { Pequeño: 0, Mediano: 1, Grande: 2 };
  const TIPO_MAP   = { Exportación: 0, Local: 1, Orgánico: 2 };
  const tamOff = [0.1, 0.0, -0.05][TAMANO_MAP[tamano] ?? 1] ?? 0;
  const tipOff = [0.0, -0.1, 0.15][TIPO_MAP[tipo]   ?? 0] ?? 0;
  return Math.max(4.5, parseFloat((7.8 - dias * 0.24 + tamOff + tipOff).toFixed(2)));
};



const TAMANO_MAP    = { Pequeño: 0, Mediano: 1, Grande: 2 };
const TIPO_MAP      = { Exportación: 0, Local: 1, Orgánico: 2 };
const ESTADO_LABELS = ["verde", "sazon", "maduro", "punto_negro"];
const ACCIONES_MAP  = ["En proceso", "Almacenar", "Vender hoy", "Venta urgente"];
const ESTADO_CONFIG = {
  maduro:      { label: "Maduro",      bg: "bg-yellow-100",  text: "text-yellow-800"  },
  punto_negro: { label: "Punto negro", bg: "bg-red-100",     text: "text-red-800"     },
  sazon:       { label: "Sazón",       bg: "bg-emerald-100", text: "text-emerald-800" },
  verde:       { label: "Verde",       bg: "bg-sky-100",     text: "text-sky-800"     },
};

const API = "http://localhost:5000/api/prediccion"; // ajusta tu URL

// ── Hook de API — reemplaza INVENTARIO_DEMO ───────────────────────────────────
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
        const mapped = invRes.data.map(p => ({
          _id:         p.inventarioId?._id || p._id,
          fecha:       p.inventarioId?.fecha
                         ? new Date(p.inventarioId.fecha).toISOString().split("T")[0]
                         : new Date(p.fecha).toISOString().split("T")[0],
          proveedor:   p.proveedor,
          producto:    (() => {
            // El router ya puede devolver "Palta Fuerte" — evitar doble "Palta Palta Fuerte"
            const base = p.producto === "Palta" ? `Palta ${p.tipo}` : p.producto;
            return base.startsWith("Palta") ? base : `Palta ${base}`;
          })(),
          tipo:        p.tipo,
          tamano:      p.tamano,
          cant:        p.cantidad,
          diasAlmacen: p.diasAlmacen,
          phEstimado:  p.phEstimado,
          estadoML:    p.estadoML,
          confianza:   p.confianza,
          probs:       p.probs,
          accion:      p.accion,
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
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.35);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + 0.36);
    };
    beep(0.0, 880);
    beep(0.4, 880);
    beep(0.8, 1100);
  } catch (e) { /* AudioContext no disponible */ }
};

// ── Modal de alerta ────────────────────────────────────────────────────────────
const AlertModal = ({ predictions, onDismiss }) => {
  const criticos = predictions.filter(p => p.estadoML === "punto_negro" || p.estadoML === "maduro");
  if (!criticos.length) return null;
  const tienePuntoNegro = criticos.some(p => p.estadoML === "punto_negro");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-red-200">
        <div className={`px-6 py-5 flex items-start gap-4 ${tienePuntoNegro ? "bg-red-50" : "bg-yellow-50"}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${tienePuntoNegro ? "bg-red-100" : "bg-yellow-100"}`}>
            {tienePuntoNegro ? "⚠️" : "🟡"}
          </div>
          <div>
            <p className={`font-semibold text-sm ${tienePuntoNegro ? "text-red-800" : "text-yellow-800"}`}>
              {tienePuntoNegro ? "¡Paltas en punto negro detectadas!" : "Paltas maduras — acción requerida"}
            </p>
            <p className={`text-xs mt-0.5 ${tienePuntoNegro ? "text-red-600" : "text-yellow-600"}`}>
              El modelo ML identificó {criticos.length} lote{criticos.length > 1 ? "s" : ""} crítico{criticos.length > 1 ? "s" : ""}. Actúa de inmediato.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 space-y-3">
          {criticos.map((p, i) => (
            <div key={i} className={`rounded-2xl border p-3 flex items-start justify-between gap-3 ${p.estadoML === "punto_negro" ? "bg-red-50 border-red-100" : "bg-yellow-50 border-yellow-100"}`}>
              <div>
                <p className="text-sm font-semibold text-gray-800">{p.producto}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.cant} kg · {p.diasAlmacen} días almacenado · {p.proveedor}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.estadoML === "punto_negro" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {ESTADO_CONFIG[p.estadoML].label}
                </span>
                <p className={`text-[11px] font-semibold mt-1 ${p.estadoML === "punto_negro" ? "text-red-600" : "text-yellow-600"}`}>
                  ⚠ {ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onDismiss} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition">
            Entendido — gestionar ahora
          </button>
        </div>
      </div>
    </div>
  );
};

// ── TF.js y Chart.js loaders ──────────────────────────────────────────────────
const useTfJs = () => {
  const [ready, setReady] = useState(!!window.tf);
  useEffect(() => {
    if (window.tf) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/tensorflow/4.10.0/tf.min.js";
    s.onload = () => setReady(true); document.head.appendChild(s);
  }, []); return ready;
};

const useChartJs = () => {
  const [ready, setReady] = useState(!!window.Chart);
  useEffect(() => {
    if (window.Chart) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = () => setReady(true); document.head.appendChild(s);
  }, []); return ready;
};

// ── Componentes UI ────────────────────────────────────────────────────────────
const Badge = ({ estado }) => { const cfg = ESTADO_CONFIG[estado] ?? { label: estado, bg: "bg-gray-100", text: "text-gray-700" }; return <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>; };
const ConfidencePill = ({ value }) => { const pct = Math.round(value * 100), color = pct >= 90 ? "bg-emerald-100 text-emerald-800" : pct >= 75 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"; return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{pct}%</span>; };
const PhBadge = ({ ph }) => <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 font-mono">{ph}</span>;
const CalBadge = ({ cal }) => { const map = { Excelente: "bg-emerald-100 text-emerald-800", Bueno: "bg-sky-100 text-sky-800", Regular: "bg-yellow-100 text-yellow-800" }; return <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${map[cal] ?? "bg-gray-100 text-gray-700"}`}>{cal}</span>; };
const DotTimeline = ({ color }) => { const map = { rojo: "bg-red-500", amarillo: "bg-yellow-500", verde: "bg-emerald-500" }; return <span className={`absolute -left-[9px] top-1 w-3 h-3 rounded-full border-2 border-lime-50 ${map[color]}`} />; };
const HBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-24 text-right text-emerald-700 shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-4 bg-lime-100 rounded overflow-hidden">
        {value > 0
          ? <div className={`h-full ${color} flex items-center pl-2 text-white font-semibold text-[10px]`} style={{ width: `${Math.max(pct, 6)}%` }}>{value} kg</div>
          : <div className="h-full flex items-center pl-2 text-gray-400 text-[10px]">0 kg</div>
        }
      </div>
      <span className={`w-10 text-right font-semibold ${value > 0 ? "text-emerald-700" : "text-gray-400"}`}>{pct}%</span>
    </div>
  );
};
const ProgressBar = ({ value, max, color }) => <div className="h-1.5 bg-lime-100 rounded-full overflow-hidden mt-1"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%` }} /></div>;
const MetricCard = ({ label, value, sub, valueColor = "text-emerald-900" }) => (
  <div className="bg-lime-100 rounded-2xl p-4"><p className="text-xs text-emerald-700 mb-1">{label}</p><p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>{sub && <p className="text-[11px] text-emerald-600 mt-1">{sub}</p>}</div>
);
const Skel = ({ className }) => <div className={`bg-lime-200 animate-pulse rounded-lg ${className}`} />;
const ChartSkeleton = ({ height = "h-44" }) => (
  <div className={`${height} flex flex-col items-center justify-center gap-2 bg-lime-50 rounded-xl border border-lime-200`}>
    <div className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
    <p className="text-xs text-emerald-600">Cargando datos…</p>
  </div>
);
const InfoNote = ({ children }) => <p className="text-xs text-emerald-600 mt-2 px-3 py-2 bg-lime-50 rounded-lg border border-lime-200">{children}</p>;
const ConfBar = ({ value }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-lime-100 rounded-full overflow-hidden w-16"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round(value * 100)}%` }} /></div>
    <span className="text-xs text-gray-500">{Math.round(value * 100)}%</span>
  </div>
);

const diasColor  = (d) => d >= 7 ? "text-red-700" : d >= 5 ? "text-yellow-700" : "text-emerald-700";
const accionColor = (e) => (e === "punto_negro" || e === "maduro") ? "text-red-600" : "text-emerald-700";
const accionPrefix = (e) => (e === "punto_negro" || e === "maduro") ? "⚠ " : "✓ ";

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
  useChart(ref, { type: "line", data: { labels: ["-6d", "-5d", "-4d", "-3d", "-2d", "Ayer", "Hoy"], datasets: [{ label: "En riesgo", data: gen(enRiesgo, 1), borderColor: "#dc2626", backgroundColor: "rgba(220,38,38,.1)", tension: .4, fill: true, pointRadius: 3 }, { label: "En sazón", data: gen(enSazon, 1.5), borderColor: "#15803d", backgroundColor: "rgba(21,128,61,.1)", tension: .4, fill: true, pointRadius: 3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 10, padding: 8 } } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } } });
  return <canvas ref={ref} />;
};
const DoughnutChartCanvas = ({ data }) => {
  const ref = useRef(null);
  useChart(ref, { type: "doughnut", data: { labels: ["Punto negro", "Maduro", "Sazón", "Verde"], datasets: [{ data, backgroundColor: ["#dc2626", "#d97706", "#15803d", "#0284c7"], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { font: { size: 11 }, boxWidth: 10, padding: 8 } } } } });
  return <canvas ref={ref} />;
};
const BarChartCanvas = ({ labels, values }) => {
  const ref = useRef(null);
  useChart(ref, { type: "bar", data: { labels, datasets: [{ label: "Kg en riesgo", data: values, backgroundColor: values.map(v => v > 0 ? "#dc2626" : "#15803d"), borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 11 } } } } } });
  return <canvas ref={ref} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
const Prediccion = () => {
  const [tab,    setTab]    = useState("resumen");
  const [filtro, setFiltro] = useState("todos");
  const [showAlert,      setShowAlert]      = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const chartReady = useChartJs();
  useTfJs(); // carga TF.js aunque ya no lo usamos para predecir

  // ── Datos desde API ─────────────────────────────────────────────────────────
  const {
    data: inventarioDB,
    resumen,
    historialDB,
    loading: dbLoading,
    error: dbError,
    recargar,
  } = useInventarioML();

  // Re-entrenar: llama al backend y espera 30s antes de recargar
  const reentrenarBackend = useCallback(async () => {
    try {
      await fetch(`${API}/reentrenar`, { method: "POST" });
      setTimeout(() => recargar(), 30000);
    } catch (e) {
      console.error("Error al re-entrenar:", e);
    }
  }, [recargar]);

  // Alias para mantener compatibilidad con el resto del JSX
  const predictions = inventarioDB;
  const mlStatus    = dbLoading ? "training" : dbError ? "error" : "ready";

  // Métricas —  usa resumen de la BD si está disponible, si no calcula local
  const totalKg     = resumen?.totalKg    ?? predictions.reduce((s, p) => s + (p.cant ?? 0), 0);
  const totalRiesgo = resumen?.totalRiesgo ?? predictions.filter(p => p.estadoML === "punto_negro" || p.estadoML === "maduro").length;
  const totalSazon  = resumen?.totalSazon  ?? predictions.filter(p => p.estadoML === "sazon").length;
  const diasProm    = resumen?.diasProm    ?? (predictions.length ? (predictions.reduce((s, p) => s + (p.diasAlmacen ?? 0), 0) / predictions.length).toFixed(1) : "—");
  const avgConf     = resumen?.avgConf     ?? (predictions.length ? Math.round((predictions.reduce((s, p) => s + (p.confianza ?? 0), 0) / predictions.length) * 100) : null);
  const accuracy    = resumen?.accuracy    ?? null;

  const countByEstado = (est) => predictions.filter(p => p.estadoML === est).reduce((s, p) => s + (p.cant ?? 0), 0);
  const doughnutData  = ["punto_negro", "maduro", "sazon", "verde"].map(countByEstado);

  // Historial: prioriza historialDB si tiene datos, si no usa predictions directas
  // Así siempre se muestran todos los lotes aunque no tengan predicción guardada en BD
  const historialFuente = historialDB.length > 0
    ? historialDB.map(p => {
        const nombreProducto = (() => {
          const raw = p.producto ?? "";
          if (raw === "Palta") return `Palta ${p.tipo ?? ""}`.trim();
          return raw.startsWith("Palta") ? raw : `Palta ${raw}`;
        })();
        return {
          color:      p.estadoML === "punto_negro" ? "rojo" : p.estadoML === "maduro" ? "amarillo" : "verde",
          nombre:     `${nombreProducto} — ${ESTADO_CONFIG[p.estadoML]?.label ?? p.estadoML}`,
          detalle:    `${p.cantidad} kg · ${p.proveedor} · ${p.tamano} · ${p.tipo}`,
          proveedor:  p.proveedor,
          fecha:      new Date(p.fecha).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
        };
      })
    : predictions.map(p => ({
        color:     p.estadoML === "punto_negro" ? "rojo" : p.estadoML === "maduro" ? "amarillo" : "verde",
        nombre:    `${p.producto} — ${ESTADO_CONFIG[p.estadoML]?.label ?? p.estadoML}`,
        detalle:   `${p.cant} kg · ${p.proveedor} · ${p.tamano} · ${p.tipo}`,
        proveedor: p.proveedor,
        fecha:     p.fecha ? new Date(p.fecha).toLocaleString("es-PE", { day: "2-digit", month: "2-digit" }) : "—",
      }));

  // Proveedores calculados desde predictions
  const proveedoresUnicos = [...new Set(predictions.map(p => p.proveedor))];
  const PROVEEDORES = proveedoresUnicos.map(prov => {
    const lotes  = predictions.filter(p => p.proveedor === prov);
    const total  = lotes.reduce((s, p) => s + (p.cant ?? 0), 0);
    const riesgo = lotes.filter(p => p.estadoML === "punto_negro" || p.estadoML === "maduro").reduce((s, p) => s + (p.cant ?? 0), 0);
    const cal    = mlStatus !== "ready" ? null : riesgo === 0 ? "Excelente" : riesgo < total * 0.3 ? "Bueno" : "Regular";
    return { nombre: prov, unidades: total, riesgo, cal };
  });

  const barLabels = PROVEEDORES.map(p => p.nombre);
  const barValues = PROVEEDORES.map(p => mlStatus === "ready" ? p.riesgo : 0);

  // Tab Productos: usa directamente los lotes reales de la BD
  // cada prediction ya contiene producto, cant, dias, pH, estadoML, confianza
  const productosFiltrados = predictions.filter(p => {
    if (filtro === "riesgo") return p.estadoML === "punto_negro" || p.estadoML === "maduro";
    if (filtro === "sazon")  return p.estadoML === "sazon";
    return true;
  });

  // Alerta automática cuando hay críticos
  useEffect(() => {
    if (mlStatus !== "ready" || alertDismissed) return;
    const criticos = predictions.filter(p => p.estadoML === "punto_negro" || p.estadoML === "maduro");
    if (criticos.length > 0) { setShowAlert(true); playAlertSound(); }
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
              <p className="text-xs text-emerald-700 mt-0.5">Actualizado: {new Date().toLocaleDateString("es-PE")} · Lote actual: {totalKg} kg</p>
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
                  ⚠ {totalRiesgo} lote{totalRiesgo > 1 ? "s" : ""} en riesgo — ver alerta
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard label="Total kg" value={`${totalKg} kg`} sub="Lotes activos" />
                  <MetricCard label="Días prom. almacén" value={diasProm} sub="Calculado desde fechas" valueColor="text-yellow-600" />
                  {mlStatus === "ready"
                    ? <MetricCard label="Lotes en riesgo" value={totalRiesgo} sub="Detectados por ML" valueColor="text-red-600" />
                    : <div className="bg-lime-100 rounded-2xl p-4 space-y-2"><p className="text-xs text-emerald-700">Lotes en riesgo</p><Skel className="h-8 w-16" /><Skel className="h-3 w-24" /></div>}
                  {mlStatus === "ready"
                    ? <MetricCard label="En sazón" value={totalSazon} sub="Listos para venta" valueColor="text-emerald-700" />
                    : <div className="bg-lime-100 rounded-2xl p-4 space-y-2"><p className="text-xs text-emerald-700">En sazón</p><Skel className="h-8 w-16" /><Skel className="h-3 w-24" /></div>}
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Predicciones ML — lotes actuales</p>
                    <div className="rounded-2xl border border-lime-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-emerald-900 text-lime-50">
                          <tr><th className="px-4 py-2.5 font-semibold text-left">Producto</th><th className="px-4 py-2.5 font-semibold text-left">Días</th><th className="px-4 py-2.5 font-semibold text-left">Estado ML</th><th className="px-4 py-2.5 font-semibold text-left">Acción</th></tr>
                        </thead>
                        <tbody>
                          {predictions.map((p, i) => (
                            <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                              <td className="px-4 py-2.5"><p className="font-medium text-xs">{p.producto}</p><p className="text-[11px] text-emerald-600">{p.cant} kg · {p.proveedor}</p></td>
                              <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(p.diasAlmacen)}`}>{p.diasAlmacen}d</td>
                              <td className="px-4 py-2.5"><div className="flex flex-col gap-0.5"><Badge estado={p.estadoML} /><ConfidencePill value={p.confianza} /></div></td>
                              <td className={`px-4 py-2.5 text-xs font-semibold ${accionColor(p.estadoML)}`}>{accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}</td>
                            </tr>
                          ))}
                          {mlStatus === "training" && [1, 2, 3].map(i => (
                            <tr key={i} className="border-t border-lime-100">
                              <td className="px-4 py-2.5"><Skel className="h-4 w-32" /></td>
                              <td className="px-4 py-2.5"><Skel className="h-4 w-8" /></td>
                              <td className="px-4 py-2.5"><Skel className="h-5 w-20" /></td>
                              <td className="px-4 py-2.5"><Skel className="h-4 w-24" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <InfoNote>Estado y acción calculados por el modelo ML del backend</InfoNote>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Distribución de kg por estado</p>
                      {mlStatus === "ready"
                        ? <div className="space-y-2">{["punto_negro", "maduro", "sazon", "verde"].map((est, i) => { const colors = ["bg-red-500", "bg-yellow-500", "bg-emerald-600", "bg-sky-500"], lbls = ["Punto negro", "Maduro", "Sazón", "Verde"]; return <HBar key={est} label={lbls[i]} value={countByEstado(est)} max={totalKg} color={colors[i]} />; })}</div>
                        : <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skel key={i} className="h-4 w-full" />)}</div>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Vida útil por lote (días desde ingreso)</p>
                      <div className="space-y-2.5">
                        {predictions.slice(0, 4).map(item => {
                          const dias = item.diasAlmacen ?? 0;
                          const ph   = item.phEstimado ?? estimatePh(dias, item.tamano, item.tipo);
                          const color = dias >= 7 ? "bg-red-500" : dias >= 5 ? "bg-yellow-500" : "bg-emerald-600";
                          return (
                            <div key={item.producto}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-emerald-800">{item.producto}</span>
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

            {/* ── PRODUCTOS ── */}
            {tab === "productos" && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {[{ id: "todos", label: "Todos" }, { id: "riesgo", label: "En riesgo" }, { id: "sazon", label: "En sazón" }].map(f => (
                    <button key={f.id} onClick={() => mlStatus === "ready" && setFiltro(f.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${filtro === f.id && mlStatus === "ready" ? "bg-emerald-700 text-lime-50 border-emerald-700" : mlStatus !== "ready" ? "border-emerald-100 text-emerald-300 cursor-not-allowed" : "border-emerald-200 text-emerald-700 hover:bg-lime-100"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-lime-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-emerald-900 text-lime-50">
                      <tr><th className="px-4 py-3 font-semibold text-left">Nombre</th><th className="px-4 py-3 font-semibold text-left">Kg</th><th className="px-4 py-3 font-semibold text-left">Días</th><th className="px-4 py-3 font-semibold text-left">pH est.</th><th className="px-4 py-3 font-semibold text-left">Estado ML</th><th className="px-4 py-3 font-semibold text-left">Confianza</th><th className="px-4 py-3 font-semibold text-left">Acción recomendada</th></tr>
                    </thead>
                    <tbody>
                      {mlStatus === "training" && [1,2,3].map(i => (
                        <tr key={i} className="border-t border-lime-100">
                          {[1,2,3,4,5,6,7].map(j => <td key={j} className="px-4 py-2.5"><Skel className="h-4 w-full" /></td>)}
                        </tr>
                      ))}
                      {mlStatus === "ready" && productosFiltrados.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-gray-400">Sin lotes en este estado</td></tr>
                      )}
                      {productosFiltrados.map((p, i) => {
                        const dias = p.diasAlmacen;
                        const phE  = p.phEstimado ?? (dias != null ? estimatePh(dias, p.tamano, p.tipo) : null);
                        return (
                          <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-xs">{p.producto}</p>
                              <p className="text-[11px] text-emerald-600">{p.proveedor}</p>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-emerald-600">{p.cant ?? "—"} kg</td>
                            <td className={`px-4 py-2.5 text-xs font-semibold ${dias != null ? diasColor(dias) : "text-gray-400"}`}>{dias != null ? `${dias}d` : "—"}</td>
                            <td className="px-4 py-2.5">{phE ? <PhBadge ph={phE} /> : "—"}</td>
                            <td className="px-4 py-2.5"><Badge estado={p.estadoML} /></td>
                            <td className="px-4 py-2.5"><ConfidencePill value={p.confianza} /></td>
                            <td className={`px-4 py-2.5 text-xs font-semibold ${accionColor(p.estadoML)}`}>{accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <InfoNote>Estado y Acción determinados por ML del backend · pH estimado desde días, tamaño y tipo · unidades en kg</InfoNote>
              </div>
            )}

            {/* ── GRÁFICOS ── */}
            {tab === "graficos" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {mlStatus === "ready"
                    ? (<>
                      <MetricCard label="Precisión del modelo" value={accuracy != null ? `${accuracy}%` : "—"} sub="Reportada por backend" valueColor="text-emerald-700" />
                      <MetricCard label="Confianza media" value={avgConf != null ? `${avgConf}%` : "—"} sub="En todos los lotes" valueColor="text-sky-700" />
                      <MetricCard label="En riesgo detectados" value={totalRiesgo} sub="Punto negro + maduro" valueColor="text-red-600" />
                    </>)
                    : [1, 2, 3].map(i => (<div key={i} className="bg-lime-100 rounded-2xl p-4 space-y-2"><Skel className="h-3 w-24" /><Skel className="h-8 w-16" /><Skel className="h-3 w-20" /></div>))}
                </div>
                {chartReady ? (
                  <div className="space-y-4">
                    <div className="grid lg:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-lime-200 p-4">
                        <p className="text-xs font-semibold text-emerald-800 mb-1">Evolución estimada — 7 días</p>
                        <p className="text-[10px] text-gray-400 mb-3">Proyección basada en estado ML actual</p>
                        {mlStatus === "ready"
                          ? <div className="relative h-44"><LineChartCanvas key={`l-${totalRiesgo}-${totalSazon}`} enRiesgo={predictions.filter(p => p.estadoML === "punto_negro" || p.estadoML === "maduro").reduce((s, p) => s + (p.cant ?? 0), 0)} enSazon={predictions.filter(p => p.estadoML === "sazon").reduce((s, p) => s + (p.cant ?? 0), 0)} /></div>
                          : <ChartSkeleton height="h-44" />}
                      </div>
                      <div className="rounded-2xl border border-lime-200 p-4">
                        <p className="text-xs font-semibold text-emerald-800 mb-3">Distribución por estado — kg (ML)</p>
                        {mlStatus === "ready"
                          ? <div className="relative h-44"><DoughnutChartCanvas key={`d-${doughnutData.join("-")}`} data={doughnutData} /></div>
                          : <ChartSkeleton height="h-44" />}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-lime-200 p-4">
                      <p className="text-xs font-semibold text-emerald-800 mb-3">Kg en riesgo por proveedor (ML)</p>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Resumen por lote — datos clave</p>
                <div className="rounded-2xl border border-lime-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-emerald-900 text-lime-50">
                      <tr><th className="px-4 py-3 font-semibold text-left">Producto</th><th className="px-4 py-3 font-semibold text-left">Proveedor</th><th className="px-4 py-3 font-semibold text-left">Kg</th><th className="px-4 py-3 font-semibold text-left">Días</th><th className="px-4 py-3 font-semibold text-left">pH est.</th><th className="px-4 py-3 font-semibold text-left">Estado ML</th><th className="px-4 py-3 font-semibold text-left">Confianza</th><th className="px-4 py-3 font-semibold text-left">Acción</th></tr>
                    </thead>
                    <tbody>
                      {predictions.map((p, i) => (
                        <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                          <td className="px-4 py-2.5 font-medium text-xs">{p.producto}</td>
                          <td className="px-4 py-2.5 text-xs text-emerald-600">{p.proveedor}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-emerald-800">{p.cant} kg</td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(p.diasAlmacen)}`}>{p.diasAlmacen}d</td>
                          <td className="px-4 py-2.5"><PhBadge ph={p.phEstimado ?? estimatePh(p.diasAlmacen ?? 0, p.tamano, p.tipo)} /></td>
                          <td className="px-4 py-2.5"><Badge estado={p.estadoML} /></td>
                          <td className="px-4 py-2.5"><ConfidencePill value={p.confianza} /></td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${accionColor(p.estadoML)}`}>{accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}</td>
                        </tr>
                      ))}
                      {mlStatus === "training" && [1, 2, 3].map(i => (
                        <tr key={i} className="border-t border-lime-100">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(j => <td key={j} className="px-4 py-2.5"><Skel className="h-4 w-full" /></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <InfoNote>Días calculados en tiempo real desde fecha de ingreso · pH desde backend o estimado · Estado y Acción por ML</InfoNote>

                {mlStatus === "ready" && PROVEEDORES.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Calificación por proveedor (ML)</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {PROVEEDORES.map(pv => (
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Alertas generadas por el modelo — actuales</p>
                    <div className="rounded-2xl border border-lime-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-emerald-900 text-lime-50">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold text-left">Producto</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Proveedor</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Kg</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Días</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Estado ML</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Acción recomendada</th>
                            <th className="px-4 py-2.5 font-semibold text-left">Confianza</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...predictions].sort((a, b) => ESTADO_LABELS.indexOf(b.estadoML) - ESTADO_LABELS.indexOf(a.estadoML)).map((p, i) => (
                            <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                              <td className="px-4 py-2.5 font-medium text-xs">{p.producto}</td>
                              <td className="px-4 py-2.5 text-xs text-emerald-600">{p.proveedor}</td>
                              <td className="px-4 py-2.5 text-xs font-semibold text-emerald-800">{p.cant} kg</td>
                              <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(p.diasAlmacen)}`}>{p.diasAlmacen}d</td>
                              <td className="px-4 py-2.5"><Badge estado={p.estadoML} /></td>
                              <td className={`px-4 py-2.5 text-xs font-semibold ${accionColor(p.estadoML)}`}>{accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}</td>
                              <td className="px-4 py-2.5"><ConfidencePill value={p.confianza} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {historialFuente.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Línea de tiempo — eventos registrados</p>
                    <div className="relative pl-5 border-l-2 border-lime-200 space-y-5">
                      {historialFuente.map((ev, i) => (
                        <div key={i} className="relative pl-3">
                          <DotTimeline color={ev.color} />
                          <p className="text-sm font-medium text-emerald-900">{ev.nombre}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{ev.detalle}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ev.color === "rojo" ? "bg-red-100 text-red-700" : ev.color === "amarillo" ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700"}`}>{ev.fecha}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón re-entrenar */}
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