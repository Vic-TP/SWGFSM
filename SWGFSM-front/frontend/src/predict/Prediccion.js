import React, { useState, useEffect, useCallback } from "react";
import PrediccionChartsPanel from "./PrediccionCharts";

// ═══════════════════════════════════════════════════════════════════════════════
//  UMBRALES — espejo exacto del trainer.js
// ═══════════════════════════════════════════════════════════════════════════════
const TIPO_THRESHOLDS = {
  fuerte: { verde: 3.0, sazon: 4.5, maduro: 6.0  },
  hass:   { verde: 4.0, sazon: 6.5, maduro: 9.0  },
  hall:   { verde: 5.0, sazon: 7.5, maduro: 10.5 },
};
const TAMANO_MAP_NUM = { Pequeño: 0, pequeño: 0, Mediano: 1, mediano: 1, Grande: 2, grande: 2, "": 1 };
const TIPO_MAP_CANON = {
  Exportación: "fuerte", exportacion: "fuerte", exportación: "fuerte", Fuerte: "fuerte", fuerte: "fuerte",
  Local: "hass", local: "hass", Hass: "hass", hass: "hass",
  Orgánico: "hall", organico: "hall", orgánico: "hall", Hall: "hall", hall: "hall",
};
const tipoCanonFE  = (tipo = "") => TIPO_MAP_CANON[tipo] ?? TIPO_MAP_CANON[tipo?.toLowerCase()] ?? "hass";
const getThresholdsFE = (tipo) => TIPO_THRESHOLDS[tipoCanonFE(tipo)] ?? TIPO_THRESHOLDS.hass;
const estimatePh = (dias, tamano, tipo) => {
  const t = getThresholdsFE(tipo);
  const tamOff = [0.1, 0.0, -0.05][TAMANO_MAP_NUM[tamano] ?? 1] ?? 0;
  const tasa = 3.3 / (t.maduro + 2);
  return Math.max(4.5, parseFloat((7.8 - dias * tasa + tamOff).toFixed(2)));
};


// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const ESTADO_LABELS = ["verde", "sazon", "maduro", "punto_negro"];
const ACCIONES_MAP = ["En proceso", "Almacenar", "Vender hoy", "Venta urgente"];
const ESTADO_CONFIG = {
  maduro: { label: "Maduro", bg: "bg-yellow-100", text: "text-yellow-800" },
  punto_negro: { label: "Punto negro", bg: "bg-red-100", text: "text-red-800" },
  sazon: { label: "Sazón", bg: "bg-emerald-100", text: "text-emerald-800" },
  verde: { label: "Verde", bg: "bg-sky-100", text: "text-sky-800" },
};
const SUB_LOTE_CONFIG = {
  verde:       { label: "Verde",  bg: "bg-sky-50",     text: "text-sky-700",     icon: "🟢" },
  sazon:       { label: "Sazón",  bg: "bg-emerald-50", text: "text-emerald-700", icon: "🟡" },
  maduro:      { label: "Maduro", bg: "bg-yellow-50",  text: "text-yellow-700",  icon: "🟠" },
  sin_definir: { label: "—",      bg: "bg-gray-50",    text: "text-gray-500",    icon: "⚪" },
};
import { API_URL_PREDICCION } from "../config/api";

const API = API_URL_PREDICCION;

const getAuthToken = () => {
  return sessionStorage.getItem("auth_token");
};

const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HOOK
// ═══════════════════════════════════════════════════════════════════════════════
const useInventarioML = () => {
  const [data, setData] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [historialDB, setHistorialDB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, resRes, histRes] = await Promise.all([
        fetchWithAuth(`${API}/inventario`).then((r) => r.json()),
        fetchWithAuth(`${API}/resumen`).then((r) => r.json()),
        fetchWithAuth(`${API}/historial`).then((r) => r.json()),
      ]);
      if (invRes.ok) {
        const normSub = v => {
          if (!v) return null;
          const n = v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
          return ["verde","sazon","maduro"].includes(n) ? n : null;
        };
        setData(invRes.data.map(p => ({
          _id:         p._id,
          productoId:  p.productoId,
          fecha:       p.fecha ? new Date(p.fecha).toISOString().split("T")[0] : "—",
          proveedor:   p.proveedor ?? p.categoriaId ?? "—",
          producto:    p.producto ?? "Palta",
          tipo:        p.tipo    ?? "",
          tamano:      p.tamano  ?? "",
          subLote:     normSub(p.subLote) ?? "sin_definir",
          cant:        p.cantidad    ?? 0,
          stockSemanal:p.stockSemanal ?? 0,
          diasAlmacen: p.diasAlmacen ?? 0,
          phEstimado:  p.phEstimado  ?? null,
          estadoML:    p.estadoML    ?? null,
          confianza:   typeof p.confianza === "number" ? p.confianza : 0,
          probs:       Array.isArray(p.probs) ? p.probs : [],
          accion:      p.accion  ?? "—",
          accuracy:    typeof p.accuracy === "number" ? p.accuracy : null,
        })));
      }
      if (resRes.ok) setResumen(resRes.data);
      if (histRes.ok) setHistorialDB(histRes.data);
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [cargar]);

  return { data, resumen, historialDB, loading, error, recargar: cargar };
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SONIDO
// ═══════════════════════════════════════════════════════════════════════════════
const playAlertSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (t, f=880) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, ctx.currentTime+t);
      g.gain.linearRampToValueAtTime(0.35, ctx.currentTime+t+0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+t+0.35);
      o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+0.36);
    };
    beep(0,880); beep(0.4,880); beep(0.8,1100);
  } catch(e) {}
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MODAL ALERTA
// ═══════════════════════════════════════════════════════════════════════════════
const AlertModal = ({ predictions, onDismiss }) => {
  const criticos = predictions.filter(
    (p) => p.estadoML === "punto_negro" || p.estadoML === "maduro",
  );
  if (!criticos.length) return null;
  const hayPN = criticos.some(p => p.estadoML === "punto_negro");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:"rgba(0,0,0,0.5)"}}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-200 flex flex-col" style={{maxHeight:"80vh"}}>
        <div className={`px-5 py-4 flex items-start gap-3 flex-shrink-0 rounded-t-2xl ${hayPN?"bg-red-50":"bg-yellow-50"}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${hayPN?"bg-red-100":"bg-yellow-100"}`}>
            <span className="text-lg">{hayPN?"⚠️":"🟡"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${hayPN?"text-red-800":"text-yellow-800"}`}>
              {hayPN ? "¡Paltas en punto negro detectadas!" : "Paltas maduras — acción requerida"}
            </p>
            <p className={`text-xs mt-0.5 ${hayPN?"text-red-500":"text-yellow-600"}`}>
              {criticos.length} lote{criticos.length>1?"s":""} crítico{criticos.length>1?"s":""} · actúa de inmediato
            </p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${hayPN?"bg-red-100 text-red-700":"bg-yellow-100 text-yellow-700"}`}>{criticos.length}</span>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
          {criticos.map((p,i) => (
            <div key={i} className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${p.estadoML==="punto_negro"?"bg-red-50 border-red-100":"bg-yellow-50 border-yellow-100"}`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{p.producto}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {p.tipo && <span>{p.tipo}</span>}
                  {p.tamano && <span> · {p.tamano}</span>}
                  <span> · {p.cant} kg</span>
                  {p.subLote && p.subLote !== "sin_definir" && <span> · lote {SUB_LOTE_CONFIG[p.subLote]?.label ?? p.subLote}</span>}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.estadoML==="punto_negro"?"bg-red-100 text-red-700":"bg-yellow-100 text-yellow-700"}`}>
                  {ESTADO_CONFIG[p.estadoML].label}
                </span>
                <p className={`text-[11px] font-semibold mt-0.5 ${p.estadoML==="punto_negro"?"text-red-600":"text-yellow-600"}`}>
                  ⚠ {ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}
                </p>
              </div>
            </div>
          ))}
        </div>
        {criticos.length > 3 && <p className="text-center text-[10px] text-gray-400 pb-1 flex-shrink-0">↓ desliza para ver más</p>}
        <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-gray-100">
          <button onClick={onDismiss} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition">
            Entendido — gestionar ahora
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════════
const Badge = ({ estado }) => {
  const c = ESTADO_CONFIG[estado] ?? { label: estado, bg:"bg-gray-100", text:"text-gray-700" };
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>{c.label}</span>;
};
const PhBadge = ({ ph }) => (
  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 font-mono">{ph}</span>
);
const ConfidencePill = ({ value }) => {
  if (typeof value !== "number") return <span className="text-xs text-gray-400">—</span>;
  const pct = Math.round(value * 100);
  const c = pct >= 90 ? "text-emerald-700" : pct >= 75 ? "text-yellow-700" : "text-red-600";
  return <span className={`text-xs font-semibold ${c}`}>{pct}%</span>;
};
const CalBadge = ({ cal }) => {
  const m = { Excelente:"bg-emerald-100 text-emerald-800", Bueno:"bg-sky-100 text-sky-800", Regular:"bg-yellow-100 text-yellow-800" };
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${m[cal]??"bg-gray-100 text-gray-700"}`}>{cal}</span>;
};
const Skel = ({ className }) => <div className={`bg-lime-200 animate-pulse rounded ${className}`} />;
const ChartSkeleton = ({ h="h-44" }) => (
  <div className={`${h} flex flex-col items-center justify-center gap-2 bg-lime-50 rounded-xl border border-lime-200`}>
    <div className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
    <p className="text-xs text-emerald-600">Cargando…</p>
  </div>
);
const DotTimeline = ({ color }) => {
  const m = { rojo:"bg-red-500", amarillo:"bg-yellow-500", verde:"bg-emerald-500" };
  return <span className={`absolute -left-[9px] top-1 w-3 h-3 rounded-full border-2 border-white ${m[color]}`} />;
};
const ProgressBar = ({ value, max, color }) => (
  <div className="h-1.5 bg-lime-100 rounded-full overflow-hidden mt-1">
    <div className={`h-full rounded-full ${color}`} style={{width:`${Math.min((value/Math.max(max,1))*100,100)}%`}} />
  </div>
);
const diasColor    = d => d >= 7 ? "text-red-600" : d >= 5 ? "text-yellow-600" : "text-emerald-600";
const accionColor  = e => (e==="punto_negro"||e==="maduro") ? "text-red-600" : "text-emerald-700";
const accionPrefix = e => (e==="punto_negro"||e==="maduro") ? "⚠ " : "✓ ";

// ═══════════════════════════════════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  {id:"resumen",    label:"Resumen"},
  {id:"productos",  label:"Productos"},
  {id:"graficos",   label:"Análisis"},
  {id:"inventario", label:"Inventario"},
  {id:"historial",  label:"Historial"},
];

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL  
// ═══════════════════════════════════════════════════════════════════════════════
const Prediccion = () => {
  const [tab,            setTab]            = useState("resumen");
  const [filtro,         setFiltro]         = useState("todos");
  const [showAlert,      setShowAlert]      = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const { data:inventarioDB, resumen, historialDB, loading:dbLoading, error:dbError, recargar } = useInventarioML();
  
  const predictions = inventarioDB;
  const mlStatus    = dbLoading ? "training" : dbError ? "error" : "ready"

  const ORDEN_TIPOS_DISPLAY = ["Fuerte", "Hall", "Hass"];
  const predsPorTipo = ORDEN_TIPOS_DISPLAY.reduce((acc, tipo) => {
    const lotes = predictions.filter(p =>
      p.tipo?.toLowerCase() === tipo.toLowerCase()
    );
    if (lotes.length) acc.push({ tipo, lotes });
    return acc;
  }, []);

  const [tiposAbiertos, setTiposAbiertos] = useState({});
  const toggleTipo = (tipo) =>
    setTiposAbiertos(prev => ({ ...prev, [tipo]: !prev[tipo] }));
  const isTipoAbierto = (tipo) => tiposAbiertos[tipo] === true;

  const reentrenarBackend = useCallback(async () => {
    try { await fetchWithAuth(`${API}/reentrenar`,{method:"POST"}); setTimeout(()=>recargar(),30000); }
    catch(e){ console.error(e); }
  }, [recargar]);

  // ── métricas ─────────────────────────────────────────────────────────────────
  const totalKg     = resumen?.totalKg     ?? predictions.reduce((s,p)=>s+(p.cant??0),0);
  const totalRiesgo = resumen?.totalRiesgo ?? predictions.filter(p=>p.estadoML==="punto_negro"||p.estadoML==="maduro").length;
  const totalSazon  = resumen?.totalSazonML?? predictions.filter(p=>p.estadoML==="sazon").length;
  const diasProm    = resumen?.diasProm    ?? (predictions.length ? (predictions.reduce((s,p)=>s+(p.diasAlmacen??0),0)/predictions.length).toFixed(1) : "—");
  const avgConf     = resumen?.avgConf     ?? (predictions.length ? Math.round((predictions.reduce((s,p)=>s+(p.confianza??0),0)/predictions.length)*100) : null);
  const _accRaw     = resumen?.accuracy    ?? predictions.find(p=>typeof p.accuracy==="number"&&p.accuracy>0)?.accuracy ?? null;
  const accuracy    = typeof _accRaw === "number" ? _accRaw : null;

  const countByEstado = est => predictions.filter(p=>p.estadoML===est).reduce((s,p)=>s+(p.cant??0),0);

  const productosAgrupados = Object.values(
    predictions.reduce((acc,p)=>{
      const k = p.productoId ?? p.producto;
      if(!acc[k]) acc[k]={nombre:p.producto, sublotes:[]};
      acc[k].sublotes.push(p);
      return acc;
    },{})
  );
  const productosFiltrados = productosAgrupados.filter(prod=>{
    if(filtro==="riesgo") return prod.sublotes.some(sl=>sl.estadoML==="punto_negro"||sl.estadoML==="maduro");
    if(filtro==="sazon")  return prod.sublotes.some(sl=>sl.estadoML==="sazon");
    return true;
  });

  const historialFuente = (historialDB.length>0?historialDB:predictions).map(p=>({
    color:     p.estadoML==="punto_negro"?"rojo":p.estadoML==="maduro"?"amarillo":"verde",
    nombre:    `${p.producto??""} (${SUB_LOTE_CONFIG[p.subLote]?.label??p.subLote??""}) — ${ESTADO_CONFIG[p.estadoML]?.label??p.estadoML}`,
    detalle:   `${p.cant??0} kg · ${p.proveedor??"—"} · ${p.tamano??""} · ${p.tipo??""}`,
    fecha:     new Date(p.fecha).toLocaleString("es-PE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}),
  }));

  const tiposUnicos    = [...new Set(predictions.map(p=>p.producto))];
  const CALIFICACIONES = tiposUnicos.map(prod=>{
    const lotes  = predictions.filter(p=>p.producto===prod);
    const total  = lotes.reduce((s,p)=>s+(p.cant??0),0);
    const riesgo = lotes.filter(p=>p.estadoML==="punto_negro"||p.estadoML==="maduro").reduce((s,p)=>s+(p.cant??0),0);
    const cal    = mlStatus!=="ready" ? null : riesgo===0 ? "Excelente" : riesgo<total*0.3 ? "Bueno" : "Regular";
    return {nombre:prod,unidades:total,riesgo,cal};
  });

  useEffect(()=>{
    if(mlStatus!=="ready"||alertDismissed) return;
    if(predictions.some(p=>p.estadoML==="punto_negro"||p.estadoML==="maduro")){ setShowAlert(true); playAlertSound(); }
  },[mlStatus,predictions,alertDismissed]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {showAlert && <AlertModal predictions={predictions} onDismiss={()=>{setShowAlert(false);setAlertDismissed(true);}} />}

      <section className="flex-1 p-4 lg:p-6">
        <div className="bg-white rounded-2xl shadow shadow-gray-200 border border-gray-100 overflow-hidden">

          {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Madurez de paltas
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Actualizado: {new Date().toLocaleDateString("es-PE")} · Lote actual: {totalKg} kg
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {mlStatus === "training" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                  <span className="w-3 h-3 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"/>
                  Cargando datos…
                </span>
              )}
              {mlStatus === "ready" && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-lime-100 text-emerald-800 border border-lime-200">
                  ML activo{accuracy!=null?` · ${accuracy}% precisión`:""}
                  {avgConf!=null?` · ${avgConf}% conf. media`:""}
                </span>
              )}
              {mlStatus === "error" && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Error al cargar</span>
              )}
              {mlStatus === "ready" && totalRiesgo > 0 && (
                <button onClick={()=>{setShowAlert(true);playAlertSound();setAlertDismissed(false);}}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition animate-pulse">
                  ⚠ {totalRiesgo} lote{totalRiesgo>1?"s":""} en riesgo — ver alerta
                </button>
              )}
              <button onClick={recargar} disabled={dbLoading}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition ${dbLoading?"bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed":"bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                ↺ Actualizar
              </button>
            </div>
          </div>

          {/* ══ TABS ════════════════════════════════════════════════════════════ */}
          <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/50">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${tab===t.id?"border-emerald-700 text-emerald-900 bg-white":"border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/60"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* ══ RESUMEN ═════════════════════════════════════════════════════ */}
            {tab === "resumen" && (
              <div className="space-y-6">
                {/* ... (Tus métricas se quedan igual) ... */}

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Tabla predicciones */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Predicciones ML — Lotes actuales</p>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm table-fixed"> {/* 1. AÑADIMOS table-fixed */}
                        <thead>
                          <tr className="bg-emerald-900 text-lime-50">
                            {/* 2. ANCHOS FIJOS (Suman 100%) */}
                            <th className="w-[40%] px-4 py-2.5 font-semibold text-left text-xs">Producto / Sub-lote</th>
                            <th className="w-[15%] px-4 py-2.5 font-semibold text-left text-xs">Días</th>
                            <th className="w-[20%] px-4 py-2.5 font-semibold text-left text-xs">Estado ML</th>
                            <th className="w-[10%] px-4 py-2.5 font-semibold text-left text-xs">Confianza</th>
                            <th className="w-[15%] px-4 py-2.5 font-semibold text-left text-xs">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mlStatus === "training" && [1, 2, 3].map(i => (
                            <tr key={i} className="border-t border-gray-100">
                              {[1, 2, 3, 4, 5].map(j => <td key={j} className="px-4 py-2.5"><Skel className="h-4 w-full" /></td>)}
                            </tr>
                          ))}
                          
                          {mlStatus === "ready" && predsPorTipo.map(({ tipo, lotes }) => {
                            const tieneRiesgo = lotes.some(l => l.estadoML === "punto_negro" || l.estadoML === "maduro");
                            const totalTipo = lotes.reduce((s, l) => s + (l.cant ?? 0), 0);
                            const abierto = isTipoAbierto(tipo);
                            
                            // 3. COLSPAN DINÁMICO
                            const totalColumnas = 5; 

                            return (
                              <React.Fragment key={tipo}>
                                <tr
                                  className="border-t border-gray-200 bg-gray-50 cursor-pointer hover:bg-lime-50 select-none"
                                  onClick={() => toggleTipo(tipo)}
                                >
                                  <td className="px-4 py-2.5" colSpan={totalColumnas}>
                                    <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-4">
                                      <span className="text-gray-400 text-[20px] w-5">{abierto ? "▾" : "▸"}</span>
                                      <span className="text-xs font-bold text-gray-800 whitespace-nowrap">Palta {tipo}</span>
                                      <span className="text-[11px] text-gray-500">
                                        {lotes.length} sub-lote{lotes.length !== 1 ? "s" : ""} · 
                                        <span className="font-semibold text-gray-700 ml-1">{totalTipo.toLocaleString("es-PE")} kg</span>
                                      </span>
                                      {tieneRiesgo && (
                                        <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded whitespace-nowrap">
                                          ⚠ Atención
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                
                                {abierto && [...lotes]
                                  .sort((a, b) => ESTADO_LABELS.indexOf(a.estadoML) - ESTADO_LABELS.indexOf(b.estadoML))
                                  .map((p, i) => (
                                    <tr key={i} className={`border-t border-gray-100 hover:bg-lime-50 ${p.estadoML === "punto_negro" ? "bg-red-50/30" : p.estadoML === "maduro" ? "bg-yellow-50/30" : ""}`}>
                                      <td className="px-4 py-2 pl-8 truncate"><span className="text-[11px] text-gray-600">{p.cant} kg {p.tamano ? `· ${p.tamano}` : ""}</span></td>
                                      <td className={`px-4 py-2 text-xs font-semibold ${diasColor(p.diasAlmacen)}`}>{p.diasAlmacen}d</td>
                                      <td className="px-4 py-2"><Badge estado={p.estadoML} /></td>
                                      <td className="px-4 py-2"><ConfidencePill value={p.confianza} /></td>
                                      <td className={`px-4 py-2 text-xs font-semibold truncate ${accionColor(p.estadoML)}`}>
                                        {accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}
                                      </td>
                                    </tr>
                                  ))
                                }
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 px-1">Estado y acción calculados por el modelo ML del backend</p>
                  </div>

                  {/* Distribución + Vida útil */}
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Distribución de KG por estado</p>
                      {mlStatus==="ready" ? (
                        <div className="space-y-2">
                          {["punto_negro","maduro","sazon","verde"].map((est,i)=>{
                            const colors=["bg-red-500","bg-yellow-500","bg-emerald-500","bg-sky-400"];
                            const lbls  =["Punto negro","Maduro","Sazón","Verde"];
                            const kg    = countByEstado(est);
                            const pct   = totalKg>0?Math.round((kg/totalKg)*100):0;
                            return(
                              <div key={est} className="flex items-center gap-3 text-xs">
                              {/* Etiqueta fija */}
                              <span className="w-20 text-right text-gray-600 shrink-0">{lbls[i]}</span>
                              {/* Contenedor de la barra y texto */}
                              <div className="flex-1 flex items-center gap-2">
                                {/* La barra */}
                                <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                                  <div 
                                    className={`h-full ${colors[i]}`} 
                                    style={{ width: `${Math.max(pct, 5)}%` }} 
                                  />
                                </div>
                                {/* El texto de KG siempre afuera, a la derecha de la barra */}
                                <span className="w-20 text-left font-semibold text-gray-700 text-[11px] shrink-0">
                                  {kg > 0 ? `${kg.toLocaleString("es-PE")} kg` : "0 kg"}
                                </span>
                              </div>
                              {/* Porcentaje final */}
                              <span className="w-8 text-right text-gray-500 font-medium shrink-0">{pct}%</span>
                            </div>
                            );
                          })}
                        </div>
                      ) : <div className="space-y-2">{[1,2,3,4].map(i=><Skel key={i} className="h-4 w-full"/>)}</div>}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Vida útil por lote (días desde ingreso)</p>
                      <div className="space-y-2.5">
                        {predictions.slice(0,5).map((item,idx)=>{
                          const dias    = item.diasAlmacen??0;
                          const ph      = item.phEstimado??estimatePh(dias,item.tamano,item.tipo);
                          const color   = dias>=7?"bg-red-400":dias>=5?"bg-yellow-400":"bg-emerald-400";
                          const maxDias = (getThresholdsFE(item.tipo)?.maduro??9)+3;
                          return(
                            <div key={idx}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-gray-700 font-medium">{item.producto}</span>
                                <span className={diasColor(dias)}>{dias}d · pH {ph}</span>
                              </div>
                              <ProgressBar value={dias} max={maxDias} color={color}/>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ PRODUCTOS ═══════════════════════════════════════════════════ */}
            {tab === "productos" && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap items-center justify-between">
                  <div className="flex gap-2">
                    {[{id:"todos",label:"Todos"},{id:"riesgo",label:"En riesgo"},{id:"sazon",label:"En sazón"}].map(f=>(
                      <button key={f.id} onClick={()=>mlStatus==="ready"&&setFiltro(f.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${filtro===f.id&&mlStatus==="ready"?"bg-emerald-700 text-white border-emerald-700":mlStatus!=="ready"?"border-gray-200 text-gray-300 cursor-not-allowed":"border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{productosFiltrados.length} producto{productosFiltrados.length!==1?"s":""} · {predictions.length} sub-lotes</p>
                </div>

                {/* Tabla de productos agrupados por variedad */}
                {mlStatus === "ready" ? (
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-emerald-900 text-lime-50">
                          <th className="px-4 py-2.5 font-semibold text-left text-xs">Nombre</th>
                          <th className="px-4 py-2.5 font-semibold text-left text-xs">Kg</th>
                          <th className="px-4 py-2.5 font-semibold text-left text-xs">Días</th>
                          <th className="px-4 py-2.5 font-semibold text-left text-xs">pH est.</th>
                          <th className="px-4 py-2.5 font-semibold text-left text-xs">Estado ML</th>
                          <th className="px-4 py-2.5 font-semibold text-left text-xs">Confianza</th>
                          <th className="px-4 py-2.5 font-semibold text-left text-xs">Acción recomendada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosFiltrados.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-gray-400">Sin productos en este estado</td></tr>
                        ) : (
                          productosFiltrados.flatMap((prod,pi) =>
                            [...prod.sublotes]
                              .sort((a,b)=>["verde","sazon","maduro"].indexOf(a.subLote)-["verde","sazon","maduro"].indexOf(b.subLote))
                              .map((sl,si)=>{
                                const ph = sl.phEstimado??estimatePh(sl.diasAlmacen??0,sl.tamano,sl.tipo);
                                const isFirst = si===0;
                                return(
                                  <tr key={`${pi}-${si}`} className={`border-t border-gray-100 hover:bg-lime-50 ${sl.estadoML==="punto_negro"?"bg-red-50/40":sl.estadoML==="maduro"?"bg-yellow-50/30":""}`}>
                                    <td className="px-4 py-2.5">
                                      {isFirst && <p className="font-semibold text-xs text-gray-800">{prod.nombre}</p>}
                                      <p className="text-[11px] text-gray-400">
                                        {sl.proveedor && sl.proveedor!=="—" ? sl.proveedor : (sl.tipo||"—")}
                                        {sl.tamano ? ` · ${sl.tamano}` : ""}
                                        {" · "}<span className={`font-medium ${SUB_LOTE_CONFIG[sl.subLote]?.text??"text-gray-500"}`}>{SUB_LOTE_CONFIG[sl.subLote]?.icon} {SUB_LOTE_CONFIG[sl.subLote]?.label}</span>
                                      </p>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{sl.cant} kg</td>
                                    <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(sl.diasAlmacen??0)}`}>{sl.diasAlmacen??0}d</td>
                                    <td className="px-4 py-2.5"><PhBadge ph={ph}/></td>
                                    <td className="px-4 py-2.5"><Badge estado={sl.estadoML}/></td>
                                    <td className="px-4 py-2.5"><ConfidencePill value={sl.confianza}/></td>
                                    <td className={`px-4 py-2.5 text-xs font-semibold ${accionColor(sl.estadoML)}`}>
                                      {accionPrefix(sl.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(sl.estadoML)]}
                                    </td>
                                  </tr>
                                );
                              })
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-2">{[1,2,3].map(i=><Skel key={i} className="h-12 w-full rounded-xl"/>)}</div>
                )}
                <p className="text-[11px] text-gray-400">Estado y Acción determinados por ML del backend · pH estimado desde días, tamaño y tipo · unidades en kg</p>
              </div>
            )}

            {/* ══ ANÁLISIS ════════════════════════════════════════════════════ */}
            {tab === "graficos" && (
              <div className="space-y-6">
                {/* Métricas del modelo — precisión siempre visible */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Precisión: card especial con barra */}
                  <div className="bg-lime-50 rounded-xl border border-lime-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Precisión del modelo</p>
                    {accuracy != null ? (
                      <>
                        <div className="flex items-end gap-2">
                          <p className="text-3xl font-bold text-emerald-700">{accuracy}%</p>
                          <div className="mb-1 flex-1 h-2 bg-lime-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{width:`${accuracy}%`}}/>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {accuracy>=90?"Excelente · test set":accuracy>=80?"Bueno · test set":"Mejorable · re-entrenar"}
                        </p>
                      </>
                    ) : mlStatus==="ready" ? (
                      <>
                        <p className="text-3xl font-bold text-gray-300">—</p>
                        <p className="text-xs text-gray-400 mt-1">Sin dato disponible aún</p>
                      </>
                    ) : (
                      <><Skel className="h-9 w-20 mt-1"/><Skel className="h-3 w-28 mt-2"/></>
                    )}
                  </div>
                  <div className="bg-lime-50 rounded-xl border border-lime-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Confianza media</p>
                    {mlStatus==="ready" ? (
                      <><p className="text-3xl font-bold text-sky-700">{avgConf!=null?`${avgConf}%`:"—"}</p><p className="text-xs text-gray-400 mt-1">En todos los sub-lotes</p></>
                    ) : <><Skel className="h-9 w-20 mt-1"/><Skel className="h-3 w-28 mt-2"/></>}
                  </div>
                  <div className="bg-lime-50 rounded-xl border border-lime-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Sub-lotes en riesgo</p>
                    {mlStatus==="ready" ? (
                      <><p className="text-3xl font-bold text-red-600">{totalRiesgo}</p><p className="text-xs text-gray-400 mt-1">Punto negro + maduro</p></>
                    ) : <><Skel className="h-9 w-20 mt-1"/><Skel className="h-3 w-28 mt-2"/></>}
                  </div>
                </div>

                {/* Distribución por estado ML */}
                {mlStatus==="ready" && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {est:"verde",      label:"Verde",       icon:"🟢",bg:"bg-sky-50",    border:"border-sky-100",    text:"text-sky-800",    sub:"En proceso"},
                      {est:"sazon",      label:"Sazón",       icon:"🟡",bg:"bg-emerald-50",border:"border-emerald-100",text:"text-emerald-800",sub:"Listo pronto"},
                      {est:"maduro",     label:"Maduro",      icon:"🟠",bg:"bg-yellow-50", border:"border-yellow-100", text:"text-yellow-800", sub:"Vender hoy"},
                      {est:"punto_negro",label:"Punto negro", icon:"🔴",bg:"bg-red-50",    border:"border-red-100",    text:"text-red-800",    sub:"Venta urgente"},
                    ].map(({est,label,icon,bg,border,text,sub})=>{
                      const kg=countByEstado(est);
                      return(
                        <div key={est} className={`${bg} rounded-xl p-4 border ${border}`}>
                          <p className={`text-xs ${text} mb-1`}>{icon} {label}</p>
                          <p className={`text-2xl font-bold ${text}`}>{kg} kg</p>
                          <p className={`text-[11px] mt-1 ${text} opacity-70`}>{sub}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <PrediccionChartsPanel
                  predictions={predictions}
                  loading={mlStatus !== "ready"}
                  showExplanations={false}
                  showSectionHeader={false}
                />
              </div>
            )}

            {/* ══ INVENTARIO ══════════════════════════════════════════════════ */}
            {tab === "inventario" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Detalle por sub-lote · predicciones ML</p>

                <div className="rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-900 text-lime-50">
                        <th className="px-4 py-2.5 font-semibold text-left text-xs">Producto</th>
                        <th className="px-4 py-2.5 font-semibold text-left text-xs">Tipo / Tam.</th>
                        <th className="px-4 py-2.5 font-semibold text-left text-xs">Sub-lote</th>
                        <th className="px-4 py-2.5 font-semibold text-left text-xs">Kg</th>
                        <th className="px-4 py-2.5 font-semibold text-left text-xs">Días ref.</th>
                        <th className="px-4 py-2.5 font-semibold text-left text-xs">pH est.</th>
                        <th className="px-4 py-2.5 font-semibold text-left text-xs">Estado ML</th>
                        <th className="px-4 py-2.5 font-semibold text-left text-xs">Confianza</th>
                        <th className="px-4 py-2.5 font-semibold text-left text-xs">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map((p,i)=>(
                        <tr key={i} className={`border-t border-gray-100 hover:bg-lime-50 ${p.estadoML==="punto_negro"?"bg-red-50/30":p.estadoML==="maduro"?"bg-yellow-50/30":""}`}>
                          <td className="px-4 py-2 text-xs font-medium text-gray-800">{p.producto}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{p.tipo||"—"}{p.tamano?` / ${p.tamano}`:""}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${SUB_LOTE_CONFIG[p.subLote]?.bg} ${SUB_LOTE_CONFIG[p.subLote]?.text}`}>
                              {SUB_LOTE_CONFIG[p.subLote]?.icon} {SUB_LOTE_CONFIG[p.subLote]?.label}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs font-semibold text-gray-700">{p.cant} kg</td>
                          <td className={`px-4 py-2 text-xs font-semibold ${diasColor(p.diasAlmacen)}`}>{p.diasAlmacen}d</td>
                          <td className="px-4 py-2"><PhBadge ph={p.phEstimado??estimatePh(p.diasAlmacen??0,p.tamano,p.tipo)}/></td>
                          <td className="px-4 py-2"><Badge estado={p.estadoML}/></td>
                          <td className="px-4 py-2"><ConfidencePill value={p.confianza}/></td>
                          <td className={`px-4 py-2 text-xs font-semibold ${accionColor(p.estadoML)}`}>
                            {accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}
                          </td>
                        </tr>
                      ))}
                      {mlStatus==="training" && [1,2,3].map(i=>(
                        <tr key={i} className="border-t border-gray-100">
                          {[1,2,3,4,5,6,7,8,9].map(j=><td key={j} className="px-4 py-2"><Skel className="h-4 w-full"/></td>)}
                        </tr>
                      ))}
                      {mlStatus === "training" &&
                        [1, 2, 3].map((i) => (
                          <tr key={i} className="border-t border-lime-100">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                              <td key={j} className="px-4 py-2.5">
                                <Skel className="h-4 w-full" />
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-gray-400">"Días ref." = punto medio del rango por variedad · Todo el stock entra como verde · Estado predicho por el modelo ML</p>

                {mlStatus==="ready" && CALIFICACIONES.length>0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Calificación por tipo de palta (ML)</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {CALIFICACIONES.map(pv=>(
                        <div key={pv.nombre} className="rounded-xl border border-gray-200 p-4 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-sm text-gray-800">{pv.nombre}</p>
                            {pv.cal && <CalBadge cal={pv.cal}/>}
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{pv.unidades} kg total</span>
                            <span className={pv.riesgo>0?"text-red-600 font-semibold":"text-emerald-600"}>{pv.riesgo} kg riesgo</span>
                          </div>
                          <ProgressBar value={pv.riesgo} max={pv.unidades||1} color={pv.riesgo>0?"bg-red-400":"bg-emerald-400"}/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ HISTORIAL ═══════════════════════════════════════════════════ */}
            {tab === "historial" && (
              <div className="space-y-5">
                {mlStatus==="ready" && predictions.length>0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Estado actual — ordenado por urgencia</p>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-emerald-900 text-lime-50">
                            <th className="px-4 py-2.5 font-semibold text-left text-xs">Producto</th>
                            <th className="px-4 py-2.5 font-semibold text-left text-xs">Sub-lote</th>
                            <th className="px-4 py-2.5 font-semibold text-left text-xs">Kg</th>
                            <th className="px-4 py-2.5 font-semibold text-left text-xs">Estado ML</th>
                            <th className="px-4 py-2.5 font-semibold text-left text-xs">Acción recomendada</th>
                            <th className="px-4 py-2.5 font-semibold text-left text-xs">Confianza</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...predictions].sort((a,b)=>ESTADO_LABELS.indexOf(b.estadoML)-ESTADO_LABELS.indexOf(a.estadoML)).map((p,i)=>(
                            <tr key={i} className={`border-t border-gray-100 hover:bg-lime-50 ${p.estadoML==="punto_negro"?"bg-red-50/30":""}`}>
                              <td className="px-4 py-2 text-xs font-medium text-gray-800">{p.producto}</td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${SUB_LOTE_CONFIG[p.subLote]?.bg} ${SUB_LOTE_CONFIG[p.subLote]?.text}`}>
                                  {SUB_LOTE_CONFIG[p.subLote]?.icon} {SUB_LOTE_CONFIG[p.subLote]?.label}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-xs font-semibold text-gray-700">{p.cant} kg</td>
                              <td className="px-4 py-2"><Badge estado={p.estadoML}/></td>
                              <td className={`px-4 py-2 text-xs font-semibold ${accionColor(p.estadoML)}`}>
                                {accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}
                              </td>
                              <td className="px-4 py-2"><ConfidencePill value={p.confianza}/></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {historialFuente.length>0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Línea de tiempo — eventos registrados</p>
                    <div className="relative pl-5 border-l-2 border-gray-200 space-y-4">
                      {historialFuente.map((ev,i)=>(
                        <div key={i} className="relative pl-3">
                          <DotTimeline color={ev.color}/>
                          <p className="text-sm font-medium text-gray-800">{ev.nombre}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{ev.detalle}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ev.color==="rojo"?"bg-red-100 text-red-700":ev.color==="amarillo"?"bg-yellow-100 text-yellow-700":"bg-emerald-100 text-emerald-700"}`}>
                            {ev.fecha}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <button onClick={reentrenarBackend} disabled={dbLoading}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${dbLoading?"bg-gray-100 text-gray-400 cursor-not-allowed":"bg-emerald-700 text-white hover:bg-emerald-800"}`}>
                    {dbLoading?"Procesando…":"Re-entrenar modelo"}
                  </button>
                  <p className="text-xs text-gray-400">Tarda ~30 s · los resultados se recargan automáticamente</p>
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
