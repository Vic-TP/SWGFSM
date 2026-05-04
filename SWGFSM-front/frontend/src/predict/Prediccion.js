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
  return Math.max(4.5, parseFloat((7.8 - dias * 0.22 + tamOff + tipOff).toFixed(2)));
};

const INVENTARIO_DEMO = [
  { fecha: "2026-04-28", proveedor: "Proveedor A", puesto: "A1", producto: "Palta Hass",     tipo: "Exportación", tamano: "Grande",  detalle: "Lote premium",        cant: 50, precio: 2.5, pago: "Contado" },
  { fecha: "2026-04-25", proveedor: "Proveedor B", puesto: "B2", producto: "Palta Fuerte",   tipo: "Local",       tamano: "Mediano", detalle: "Lote regular",        cant: 30, precio: 1.8, pago: "Crédito" },
  { fecha: "2026-04-24", proveedor: "Proveedor C", puesto: "C1", producto: "Palta Criolla",  tipo: "Orgánico",    tamano: "Pequeño", detalle: "Certificado org.",    cant: 20, precio: 3.2, pago: "Contado" },
  { fecha: "2026-04-23", proveedor: "Proveedor A", puesto: "A2", producto: "Palta Bacon",    tipo: "Exportación", tamano: "Grande",  detalle: "Calibre 22",          cant: 45, precio: 2.1, pago: "Contado" },
  { fecha: "2026-04-22", proveedor: "Proveedor D", puesto: "D1", producto: "Palta Ettinger", tipo: "Exportación", tamano: "Grande",  detalle: "Exportación directa", cant: 35, precio: 2.8, pago: "Crédito" },
];

const PRODUCTOS_CATALOGO = [
  { nombre: "Palta Hass",     categoria: "Frutas", unidad: "kg", pCompra: 2.5, pVenta: 4.2, stockMin: 20, stockSem: 50 },
  { nombre: "Palta Fuerte",   categoria: "Frutas", unidad: "kg", pCompra: 1.8, pVenta: 3.1, stockMin: 15, stockSem: 30 },
  { nombre: "Palta Criolla",  categoria: "Frutas", unidad: "kg", pCompra: 3.2, pVenta: 5.0, stockMin: 10, stockSem: 20 },
  { nombre: "Palta Bacon",    categoria: "Frutas", unidad: "kg", pCompra: 2.1, pVenta: 3.8, stockMin: 25, stockSem: 45 },
  { nombre: "Palta Ettinger", categoria: "Frutas", unidad: "kg", pCompra: 2.8, pVenta: 4.5, stockMin: 20, stockSem: 35 },
];

const HISTORIAL_DEMO = [
  { color: "rojo",     nombre: "Palta Fuerte — Punto negro detectado",  detalle: "30 unidades · Proveedor B · Mediano · Local",      fecha: "Hoy 14:30"   },
  { color: "amarillo", nombre: "Palta Hass — Estado maduro",            detalle: "50 unidades · Proveedor A · Grande · Exportación", fecha: "Hoy 09:15"   },
  { color: "verde",    nombre: "Palta Criolla — Alcanzó sazón",         detalle: "20 unidades · Proveedor C · Pequeño · Orgánico",   fecha: "Ayer 16:00"  },
  { color: "verde",    nombre: "Palta Bacon — Ingreso a almacén",       detalle: "45 unidades · Proveedor A · Grande · Exportación", fecha: "12/04 10:00" },
  { color: "rojo",     nombre: "Lote anterior Fuerte — Perdido",        detalle: "15 unidades descartadas por sobremaduro",          fecha: "11/04 08:00" },
  { color: "verde",    nombre: "Palta Ettinger — Ingreso a almacén",    detalle: "35 unidades · Proveedor D · Grande · Exportación", fecha: "10/04 11:30" },
];

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

// ── Training data densa con ruido y ejemplos de frontera ──────────────────────
const buildTrainingData = () => {
  const features = []; const labels = [];
  const jitter = (v, mag = 0.05) => v + (Math.random() - 0.5) * mag;
  const add = (diasArr, phArr, tamArr, tipArr, label, n) => {
    for (let i = 0; i < n; i++) {
      const d = diasArr[i % diasArr.length], ph = phArr[i % phArr.length];
      const ta = tamArr[i % tamArr.length],  ti = tipArr[i % tipArr.length];
      features.push([jitter(d,0.15), jitter(ph,0.04), ta, ti, jitter(d/14,0.01)]);
      labels.push(label);
    }
  };
  add([0,0,1,1,2,2,3,3],       [7.9,7.8,7.7,7.6,7.5,7.4,7.3,7.8],[0,1,2],[0,1,2], 0, 80);
  add([3,4,4,5,5,6,6,3.5],     [7.2,7.1,7.0,6.9,6.8,6.9,7.0,7.1],[0,1,2],[0,1,2], 1, 80);
  add([6,7,7,8,8,9,6.5,8.5],   [6.7,6.5,6.3,6.1,6.0,6.4,6.6,6.2],[0,1,2],[0,1,2], 2, 80);
  add([9,10,10,11,12,13,9.5,11.5],[5.8,5.5,5.3,5.1,4.9,4.7,5.6,5.0],[0,1,2],[0,1,2], 3, 80);
  add([2.9,3.0,3.1],[7.35,7.3,7.25],[1],[0], 0, 12);
  add([5.9,6.0,6.1],[6.85,6.8,6.75],[1],[1], 1, 12);
  add([8.9,9.0,9.1],[6.05,6.0,5.95],[1],[2], 2, 12);
  return { features, labels };
};

const buildModel = (tf) => {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape:[5], units:64, activation:"relu", kernelInitializer:"glorotUniform" }));
  model.add(tf.layers.dropout({ rate:0.1 }));
  model.add(tf.layers.dense({ units:32, activation:"relu" }));
  model.add(tf.layers.dropout({ rate:0.1 }));
  model.add(tf.layers.dense({ units:16, activation:"relu" }));
  model.add(tf.layers.dense({ units:8,  activation:"relu" }));
  model.add(tf.layers.dense({ units:4,  activation:"softmax" }));
  model.compile({ optimizer: tf.train.adam(0.003), loss:"categoricalCrossentropy", metrics:["accuracy"] });
  return model;
};

const trainModel = async (tf, model, onEpoch) => {
  const { features, labels } = buildTrainingData();
  const xs = tf.tensor2d(features), ysRaw = tf.tensor1d(labels,"int32"), ys = tf.oneHot(ysRaw,4).toFloat();
  const mean = xs.mean(0), std = xs.sub(mean).square().mean(0).sqrt().add(1e-8);
  const xsNorm = xs.sub(mean).div(std);
  await model.fit(xsNorm, ys, {
    epochs:220, batchSize:32, shuffle:true, validationSplit:0.15,
    callbacks:{ onEpochEnd:(epoch,logs) => { if(epoch%20===0) onEpoch(epoch,logs); } },
  });
  xs.dispose(); ysRaw.dispose(); ys.dispose(); xsNorm.dispose();
  return { mean, std };
};

const predictSingle = (tf, model, normParams, dias, tamano, tipo) => {
  const ph = estimatePh(dias, tamano, tipo), diasNorm = dias/14;
  const { mean, std } = normParams;
  const input = tf.tensor2d([[dias, ph, TAMANO_MAP[tamano]??1, TIPO_MAP[tipo]??0, diasNorm]]);
  const inputNorm = input.sub(mean).div(std);
  const probs = model.predict(inputNorm), probsArr = Array.from(probs.dataSync());
  const classIdx = probsArr.indexOf(Math.max(...probsArr));
  input.dispose(); inputNorm.dispose(); probs.dispose();
  return { estado: ESTADO_LABELS[classIdx], confianza: probsArr[classIdx], probs: probsArr, ph };
};

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

const Badge = ({ estado }) => { const cfg = ESTADO_CONFIG[estado]??{label:estado,bg:"bg-gray-100",text:"text-gray-700"}; return <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>; };
const ConfidencePill = ({ value }) => { const pct=Math.round(value*100),color=pct>=90?"bg-emerald-100 text-emerald-800":pct>=75?"bg-yellow-100 text-yellow-800":"bg-red-100 text-red-800"; return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{pct}%</span>; };
const PhBadge = ({ ph }) => <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 font-mono">{ph}</span>;
const CalBadge = ({ cal }) => { const map={Excelente:"bg-emerald-100 text-emerald-800",Bueno:"bg-sky-100 text-sky-800",Regular:"bg-yellow-100 text-yellow-800"}; return <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${map[cal]??"bg-gray-100 text-gray-700"}`}>{cal}</span>; };
const DotTimeline = ({ color }) => { const map={rojo:"bg-red-500",amarillo:"bg-yellow-500",verde:"bg-emerald-500"}; return <span className={`absolute -left-[9px] top-1 w-3 h-3 rounded-full border-2 border-lime-50 ${map[color]}`} />; };
const HBar = ({ label, value, max, color }) => (
  <div className="flex items-center gap-3 text-xs">
    <span className="w-24 text-right text-emerald-700 shrink-0">{label}</span>
    <div className="flex-1 h-4 bg-lime-100 rounded overflow-hidden"><div className={`h-full ${color} flex items-center pl-2 text-white font-semibold text-[10px]`} style={{width:`${Math.max((value/Math.max(max,1))*100,4)}%`}}>{value}</div></div>
    <span className="w-8 text-emerald-600">{Math.round((value/Math.max(max,1))*100)}%</span>
  </div>
);
const ProgressBar = ({ value, max, color }) => <div className="h-1.5 bg-lime-100 rounded-full overflow-hidden mt-1"><div className={`h-full rounded-full ${color}`} style={{width:`${Math.min((value/Math.max(max,1))*100,100)}%`}} /></div>;
const MetricCard = ({ label, value, sub, valueColor="text-emerald-900" }) => (
  <div className="bg-lime-100 rounded-2xl p-4"><p className="text-xs text-emerald-700 mb-1">{label}</p><p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>{sub&&<p className="text-[11px] text-emerald-600 mt-1">{sub}</p>}</div>
);
const Skel = ({ className }) => <div className={`bg-lime-200 animate-pulse rounded-lg ${className}`} />;
const ChartSkeleton = ({ height="h-44" }) => (
  <div className={`${height} flex flex-col items-center justify-center gap-2 bg-lime-50 rounded-xl border border-lime-200`}>
    <div className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
    <p className="text-xs text-emerald-600">Entrenando modelo…</p>
  </div>
);
const InfoNote = ({ children }) => <p className="text-xs text-emerald-600 mt-2 px-3 py-2 bg-lime-50 rounded-lg border border-lime-200">{children}</p>;
const ConfBar = ({ value }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-lime-100 rounded-full overflow-hidden w-16"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${Math.round(value*100)}%`}} /></div>
    <span className="text-xs text-gray-500">{Math.round(value*100)}%</span>
  </div>
);

const diasColor = (d) => d>=9?"text-red-700":d>=6?"text-yellow-700":"text-emerald-700";
const accionColor = (e) => (e==="punto_negro"||e==="maduro")?"text-red-600":"text-emerald-700";
const accionPrefix= (e) => (e==="punto_negro"||e==="maduro")?"⚠ ":"✓ ";

const TABS = [
  { id:"resumen",    label:"Resumen"    },
  { id:"ml",         label:"Modelo ML"  },
  { id:"productos",  label:"Productos"  },
  { id:"graficos",   label:"Análisis"   },
  { id:"inventario", label:"Inventario" },
  { id:"historial",  label:"Historial"  },
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
  const gen = (end,f) => Array.from({length:7},(_,i)=>Math.max(0,Math.round(end*(0.4+(i/6)*0.6*f))));
  useChart(ref,{type:"line",data:{labels:["-6d","-5d","-4d","-3d","-2d","Ayer","Hoy"],datasets:[
    {label:"En riesgo",data:gen(enRiesgo,1),borderColor:"#dc2626",backgroundColor:"rgba(220,38,38,.1)",tension:.4,fill:true,pointRadius:3},
    {label:"En sazón", data:gen(enSazon,1.5),borderColor:"#15803d",backgroundColor:"rgba(21,128,61,.1)",tension:.4,fill:true,pointRadius:3},
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"top",labels:{font:{size:11},boxWidth:10,padding:8}}},scales:{y:{beginAtZero:true,ticks:{font:{size:10}}},x:{ticks:{font:{size:10}}}}}});
  return <canvas ref={ref} />;
};
const DoughnutChartCanvas = ({ data }) => {
  const ref = useRef(null);
  useChart(ref,{type:"doughnut",data:{labels:["Punto negro","Maduro","Sazón","Verde"],datasets:[{data,backgroundColor:["#dc2626","#d97706","#15803d","#0284c7"],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"right",labels:{font:{size:11},boxWidth:10,padding:8}}}}});
  return <canvas ref={ref} />;
};
const BarChartCanvas = ({ labels, values }) => {
  const ref = useRef(null);
  useChart(ref,{type:"bar",data:{labels,datasets:[{label:"Unidades en riesgo",data:values,backgroundColor:values.map(v=>v>0?"#dc2626":"#15803d"),borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{font:{size:10}}},y:{ticks:{font:{size:11}}}}}});
  return <canvas ref={ref} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
const Prediccion = () => {
  const [tab,    setTab]    = useState("resumen");
  const [filtro, setFiltro] = useState("todos");
  const tfReady    = useTfJs();
  const chartReady = useChartJs();
  const modelRef = useRef(null), normRef = useRef(null);
  const [mlStatus, setMlStatus]       = useState("idle");
  const [trainLogs, setTrainLogs]     = useState([]);
  const [accuracy,  setAccuracy]      = useState(null);
  const [predictions, setPredictions] = useState([]);

  const trainNow = useCallback(async () => {
    if (!tfReady || !window.tf) return;
    const tf = window.tf;
    setMlStatus("training"); setTrainLogs([]);
    try {
      const model = buildModel(tf); modelRef.current = model;
      const normParams = await trainModel(tf, model, (epoch,logs) => {
        setTrainLogs(prev=>[...prev,{epoch,acc:(logs.acc*100).toFixed(1),valAcc:logs.val_acc!=null?(logs.val_acc*100).toFixed(1):null,loss:logs.loss.toFixed(4)}]);
      });
      normRef.current = normParams;
      const VAL = [
        [[1,7.6,2,0,1/14],0],[[2,7.5,0,0,2/14],0],[[3,7.2,1,1,3/14],1],[[5,7.0,2,2,5/14],1],
        [[4,6.9,0,1,4/14],1],[[6,6.7,1,0,6/14],2],[[7,6.4,2,2,7/14],2],[[8,6.1,0,0,8/14],2],
        [[9,5.8,1,1,9/14],3],[[10,5.5,2,0,10/14],3],[[11,5.2,0,2,11/14],3],[[12,4.9,1,0,12/14],3],
        [[0,7.8,2,0,0/14],0],[[6,6.8,0,1,6/14],1],[[8,6.2,2,2,8/14],2],[[13,4.7,1,1,13/14],3],
      ];
      let correct = 0;
      VAL.forEach(([f,trueLabel]) => {
        const inp=tf.tensor2d([f]),inpN=inp.sub(normParams.mean).div(normParams.std),preds=model.predict(inpN);
        const arr=Array.from(preds.dataSync()); if(arr.indexOf(Math.max(...arr))===trueLabel) correct++;
        inp.dispose(); inpN.dispose(); preds.dispose();
      });
      setAccuracy(Math.round((correct/VAL.length)*100));
      const preds = INVENTARIO_DEMO.map(lote => {
        const dias = computeDias(lote.fecha);
        const res  = predictSingle(tf, model, normParams, dias, lote.tamano, lote.tipo);
        return {...lote, diasAlmacen:dias, estadoML:res.estado, confianza:res.confianza, probs:res.probs, phEstimado:res.ph};
      });
      setPredictions(preds); setMlStatus("ready");
    } catch(e) { console.error(e); setMlStatus("error"); }
  }, [tfReady]);

  useEffect(() => {
    if (tfReady && mlStatus==="idle") { const t=setTimeout(trainNow,800); return ()=>clearTimeout(t); }
  }, [tfReady, mlStatus, trainNow]);

  const totalUnidades = INVENTARIO_DEMO.reduce((s,p)=>s+p.cant,0);
  const diasProm      = (INVENTARIO_DEMO.reduce((s,l)=>s+computeDias(l.fecha),0)/INVENTARIO_DEMO.length).toFixed(1);
  const totalRiesgo   = predictions.filter(p=>p.estadoML==="punto_negro"||p.estadoML==="maduro").length;
  const totalSazon    = predictions.filter(p=>p.estadoML==="sazon").length;
  const countByEstado = (est) => predictions.filter(p=>p.estadoML===est).reduce((s,p)=>s+p.cant,0);
  const doughnutData  = ["punto_negro","maduro","sazon","verde"].map(countByEstado);
  const avgConf       = predictions.length ? Math.round((predictions.reduce((s,p)=>s+p.confianza,0)/predictions.length)*100) : null;

  const PROVEEDORES = ["Proveedor A","Proveedor B","Proveedor C","Proveedor D"].map(prov => {
    const lotes=INVENTARIO_DEMO.filter(l=>l.proveedor===prov); if(!lotes.length) return null;
    const predsP=predictions.filter(p=>p.proveedor===prov);
    const riesgo=predsP.filter(p=>p.estadoML==="punto_negro"||p.estadoML==="maduro").reduce((s,p)=>s+p.cant,0);
    const total=lotes.reduce((s,l)=>s+l.cant,0);
    const cal=mlStatus!=="ready"?null:riesgo===0?"Excelente":riesgo<total*0.3?"Bueno":"Regular";
    return {nombre:prov,unidades:total,riesgo,cal};
  }).filter(Boolean);

  const barLabels=PROVEEDORES.map(p=>p.nombre), barValues=PROVEEDORES.map(p=>mlStatus==="ready"?p.riesgo:0);
  const productosConML=PRODUCTOS_CATALOGO.map(prod=>{const pred=predictions.find(p=>p.producto===prod.nombre),lote=INVENTARIO_DEMO.find(l=>l.producto===prod.nombre);return{...prod,pred,lote,diasAlmacen:lote?computeDias(lote.fecha):null};});
  const productosFiltrados=productosConML.filter(p=>{if(filtro==="riesgo")return p.pred?.estadoML==="punto_negro"||p.pred?.estadoML==="maduro";if(filtro==="sazon")return p.pred?.estadoML==="sazon";return true;});

  return (
    <section className="flex-1 p-6 lg:p-8">
      <div className="bg-lime-50 rounded-3xl shadow-lg shadow-lime-900/10 border border-lime-200 overflow-hidden">

        <div className="px-8 pt-6 pb-4 border-b border-lime-200 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-emerald-900">Predicción de madurez — Paltas</h2>
            <p className="text-xs text-emerald-700 mt-0.5">Actualizado: {new Date().toLocaleDateString("es-PE")} · Lote actual: {totalUnidades} unidades</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {mlStatus==="training"&&<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700"><span className="w-3 h-3 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"/>Entrenando modelo…</span>}
            {mlStatus==="ready"&&<span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">ML activo · {accuracy}% precisión · {avgConf}% conf. media</span>}
            {mlStatus==="error"&&<span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Error en modelo</span>}
            {mlStatus==="ready"&&totalRiesgo>0&&<span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">{totalRiesgo} lotes en riesgo</span>}
          </div>
        </div>

        <div className="flex border-b border-lime-200 overflow-x-auto bg-lime-100/60">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${tab===t.id?"border-emerald-700 text-emerald-900 bg-lime-50":"border-transparent text-emerald-700 hover:text-emerald-900 hover:bg-lime-100"}`}>
              {t.id==="ml"&&mlStatus==="training"?"⏳ Modelo ML":t.label}
            </button>
          ))}
        </div>

        <div className="p-6 lg:p-8">

          {tab==="resumen"&&(
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard label="Total unidades" value={totalUnidades} sub="5 variedades activas"/>
                <MetricCard label="Días prom. almacén" value={diasProm} sub="Calculado desde fechas" valueColor="text-yellow-600"/>
                {mlStatus==="ready"?<MetricCard label="Lotes en riesgo" value={totalRiesgo} sub="Detectados por ML" valueColor="text-red-600"/>:<div className="bg-lime-100 rounded-2xl p-4 space-y-2"><p className="text-xs text-emerald-700">Lotes en riesgo</p><Skel className="h-8 w-16"/><Skel className="h-3 w-24"/></div>}
                {mlStatus==="ready"?<MetricCard label="En sazón" value={totalSazon} sub="Listos para venta" valueColor="text-emerald-700"/>:<div className="bg-lime-100 rounded-2xl p-4 space-y-2"><p className="text-xs text-emerald-700">En sazón</p><Skel className="h-8 w-16"/><Skel className="h-3 w-24"/></div>}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Predicciones ML — lotes actuales</p>
                  <div className="rounded-2xl border border-lime-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-emerald-900 text-lime-50"><tr><th className="px-4 py-2.5 font-semibold text-left">Producto</th><th className="px-4 py-2.5 font-semibold text-left">Días</th><th className="px-4 py-2.5 font-semibold text-left">Estado ML</th><th className="px-4 py-2.5 font-semibold text-left">Acción</th></tr></thead>
                      <tbody>
                        {INVENTARIO_DEMO.map((lote,i)=>{const pred=predictions.find(p=>p.producto===lote.producto),dias=computeDias(lote.fecha);return(
                          <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                            <td className="px-4 py-2.5"><p className="font-medium text-xs">{lote.producto}</p><p className="text-[11px] text-emerald-600">{lote.cant} unid · {lote.tipo}</p></td>
                            <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(dias)}`}>{dias}d</td>
                            <td className="px-4 py-2.5">{pred?(<div className="flex flex-col gap-0.5"><Badge estado={pred.estadoML}/><ConfidencePill value={pred.confianza}/></div>):<Skel className="h-5 w-20"/>}</td>
                            <td className={`px-4 py-2.5 text-xs font-semibold ${pred?accionColor(pred.estadoML):""}`}>{pred?`${accionPrefix(pred.estadoML)}${ACCIONES_MAP[ESTADO_LABELS.indexOf(pred.estadoML)]}`:<Skel className="h-4 w-24"/>}</td>
                          </tr>
                        );})}
                      </tbody>
                    </table>
                  </div>
                  <InfoNote>pH estimado internamente · no se requiere medición manual</InfoNote>
                </div>
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Distribución de unidades por estado</p>
                    {mlStatus==="ready"?<div className="space-y-2">{["punto_negro","maduro","sazon","verde"].map((est,i)=>{const colors=["bg-red-500","bg-yellow-500","bg-emerald-600","bg-sky-500"],lbls=["Punto negro","Maduro","Sazón","Verde"];return<HBar key={est} label={lbls[i]} value={countByEstado(est)} max={totalUnidades} color={colors[i]}/>;})}</div>:<div className="space-y-2">{[1,2,3,4].map(i=><Skel key={i} className="h-4 w-full"/>)}</div>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Vida útil por lote (días desde ingreso)</p>
                    <div className="space-y-2.5">
                      {INVENTARIO_DEMO.slice(0,4).map(item=>{const dias=computeDias(item.fecha),color=dias>=9?"bg-red-500":dias>=6?"bg-yellow-500":"bg-emerald-600";return(<div key={item.producto}><div className="flex justify-between text-xs mb-0.5"><span className="text-emerald-800">{item.producto}</span><span className={diasColor(dias)}>{dias}d · pH {estimatePh(dias,item.tamano,item.tipo)}</span></div><ProgressBar value={dias} max={13} color={color}/></div>);})}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab==="ml"&&(
            <div className="space-y-6">
              <div className="rounded-2xl border border-lime-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div><p className="font-semibold text-emerald-900 text-sm">Red neuronal — clasificación de madurez</p><p className="text-xs text-gray-500 mt-0.5">TF.js · 5 features · 4 clases · capas 64-32-16-8-4 · dropout 10% · 220 épocas</p></div>
                  <button onClick={trainNow} disabled={mlStatus==="training"||!tfReady} className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${mlStatus==="training"?"bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed":"bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"}`}>{mlStatus==="training"?"Entrenando…":"Re-entrenar"}</button>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-[11px] mb-4">
                  {[{label:"Entrada",desc:"5 features",color:"bg-sky-100 text-sky-800"},{label:"Capa 1",desc:"64n·ReLU·Drop",color:"bg-purple-100 text-purple-800"},{label:"Capas 2-3",desc:"32-16·ReLU·Drop",color:"bg-purple-100 text-purple-800"},{label:"Capa 4",desc:"8n·ReLU",color:"bg-purple-100 text-purple-800"},{label:"Salida",desc:"4·Softmax",color:"bg-emerald-100 text-emerald-800"}].map((n,i)=>(
                    <div key={i} className={`rounded-xl p-2 ${n.color}`}><p className="font-semibold">{n.label}</p><p className="text-[10px] mt-0.5">{n.desc}</p></div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                  {[["Días en almacén","computeDias(fecha)","Desde campo Fecha"],["pH estimado","estimatePh(d,tam,tip)","Predicción interna"],["Tamaño","tamano","Campo inventario"],["Tipo de venta","tipo","Campo inventario"],["Días normalizado","dias/14","Feature de escala"]].map(([label,field,note])=>(
                    <div key={field} className="bg-lime-50 rounded-lg p-2 border border-lime-200"><p className="text-emerald-700 font-semibold">{label}</p><p className="text-gray-400 mt-0.5 font-mono">{field}</p><p className="text-[10px] text-emerald-500 mt-0.5">{note}</p></div>
                  ))}
                </div>
              </div>
              {(mlStatus==="training"||trainLogs.length>0)&&(
                <div className="rounded-2xl border border-lime-200 bg-white p-4">
                  <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">Log de entrenamiento</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-[11px]">
                    {trainLogs.map((l,i)=>(
                      <div key={i} className="flex gap-4 text-gray-600">
                        <span className="text-emerald-600">Época {String(l.epoch).padStart(3,"0")}</span>
                        <span>Acc: <strong className="text-emerald-800">{l.acc}%</strong></span>
                        {l.valAcc&&<span>Val: <strong className="text-sky-700">{l.valAcc}%</strong></span>}
                        <span>Loss: <strong className="text-red-700">{l.loss}</strong></span>
                      </div>
                    ))}
                    {mlStatus==="training"&&<div className="text-yellow-600 animate-pulse">Entrenando…</div>}
                  </div>
                  {mlStatus==="ready"&&accuracy!==null&&(
                    <div className="mt-2 pt-2 border-t border-lime-200 flex flex-wrap items-center gap-4">
                      <span className="text-xs text-gray-500">Precisión hold-out (16 muestras):</span>
                      <span className="text-sm font-semibold text-emerald-700">{accuracy}%</span>
                      {avgConf!==null&&<><span className="text-xs text-gray-500">Confianza media:</span><span className="text-sm font-semibold text-sky-700">{avgConf}%</span></>}
                    </div>
                  )}
                </div>
              )}
              {mlStatus==="ready"&&predictions.length>0&&(
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Predicciones — inventario actual</p>
                  <div className="rounded-2xl border border-lime-200 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-emerald-900 text-lime-50"><tr><th className="px-4 py-3 font-semibold text-left">Producto</th><th className="px-4 py-3 font-semibold text-left">Fecha ing.</th><th className="px-4 py-3 font-semibold text-left">Días</th><th className="px-4 py-3 font-semibold text-left">pH est.</th><th className="px-4 py-3 font-semibold text-left">Estado ML</th><th className="px-4 py-3 font-semibold text-left">Confianza</th><th className="px-4 py-3 font-semibold text-left">Acción</th></tr></thead>
                      <tbody>{predictions.map((p,i)=>(
                        <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                          <td className="px-4 py-2.5 font-medium text-xs">{p.producto}</td>
                          <td className="px-4 py-2.5 text-xs text-emerald-600">{p.fecha}</td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(p.diasAlmacen)}`}>{p.diasAlmacen}d</td>
                          <td className="px-4 py-2.5"><PhBadge ph={p.phEstimado}/></td>
                          <td className="px-4 py-2.5"><Badge estado={p.estadoML}/></td>
                          <td className="px-4 py-2.5"><ConfBar value={p.confianza}/></td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${accionColor(p.estadoML)}`}>{accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <InfoNote>pH estimado automáticamente — no requiere medición manual</InfoNote>
                </div>
              )}
            </div>
          )}

          {tab==="productos"&&(
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {[{id:"todos",label:"Todos"},{id:"riesgo",label:"En riesgo"},{id:"sazon",label:"En sazón"}].map(f=>(
                  <button key={f.id} onClick={()=>mlStatus==="ready"&&setFiltro(f.id)} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${filtro===f.id&&mlStatus==="ready"?"bg-emerald-700 text-lime-50 border-emerald-700":mlStatus!=="ready"?"border-emerald-100 text-emerald-300 cursor-not-allowed":"border-emerald-200 text-emerald-700 hover:bg-lime-100"}`}>{f.label}</button>
                ))}
              </div>
              <div className="rounded-2xl border border-lime-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-900 text-lime-50"><tr><th className="px-4 py-3 font-semibold text-left">Nombre</th><th className="px-4 py-3 font-semibold text-left">Unidad</th><th className="px-4 py-3 font-semibold text-left">Días</th><th className="px-4 py-3 font-semibold text-left">pH est.</th><th className="px-4 py-3 font-semibold text-left">Estado ML</th><th className="px-4 py-3 font-semibold text-left">Confianza</th><th className="px-4 py-3 font-semibold text-left">Acción recomendada</th></tr></thead>
                  <tbody>{productosFiltrados.map((p,i)=>{const dias=p.diasAlmacen,phE=p.lote?estimatePh(dias??0,p.lote.tamano,p.lote.tipo):null;return(
                    <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                      <td className="px-4 py-2.5 font-medium text-xs">{p.nombre}</td>
                      <td className="px-4 py-2.5 text-xs text-emerald-600">{p.unidad}</td>
                      <td className={`px-4 py-2.5 text-xs font-semibold ${dias!=null?diasColor(dias):"text-gray-400"}`}>{dias!=null?`${dias}d`:"—"}</td>
                      <td className="px-4 py-2.5">{phE?<PhBadge ph={phE}/>:"—"}</td>
                      <td className="px-4 py-2.5">{p.pred?<Badge estado={p.pred.estadoML}/>:<Skel className="h-5 w-20"/>}</td>
                      <td className="px-4 py-2.5">{p.pred?<ConfidencePill value={p.pred.confianza}/>:<Skel className="h-4 w-14"/>}</td>
                      <td className={`px-4 py-2.5 text-xs font-semibold ${p.pred?accionColor(p.pred.estadoML):""}`}>{p.pred?`${accionPrefix(p.pred.estadoML)}${ACCIONES_MAP[ESTADO_LABELS.indexOf(p.pred.estadoML)]}`:<Skel className="h-4 w-24"/>}</td>
                    </tr>
                  );})}</tbody>
                </table>
              </div>
              <InfoNote>Estado y Acción determinados 100% por ML · pH estimado internamente desde días, tamaño y tipo</InfoNote>
            </div>
          )}

          {tab==="graficos"&&(
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {mlStatus==="ready"?(<><MetricCard label="Precisión del modelo" value={`${accuracy}%`} sub="Hold-out 16 muestras" valueColor="text-emerald-700"/><MetricCard label="Confianza media" value={`${avgConf}%`} sub="En todos los lotes" valueColor="text-sky-700"/><MetricCard label="En riesgo detectados" value={totalRiesgo} sub="Punto negro + maduro" valueColor="text-red-600"/></>):[1,2,3].map(i=>(<div key={i} className="bg-lime-100 rounded-2xl p-4 space-y-2"><Skel className="h-3 w-24"/><Skel className="h-8 w-16"/><Skel className="h-3 w-20"/></div>))}
              </div>
              {chartReady?(
                <div className="space-y-4">
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-lime-200 p-4">
                      <p className="text-xs font-semibold text-emerald-800 mb-1">Evolución estimada — 7 días</p>
                      <p className="text-[10px] text-gray-400 mb-3">Proyección basada en estado ML actual</p>
                      {mlStatus==="ready"?<div className="relative h-44"><LineChartCanvas key={`l-${totalRiesgo}-${totalSazon}`} enRiesgo={predictions.filter(p=>p.estadoML==="punto_negro"||p.estadoML==="maduro").reduce((s,p)=>s+p.cant,0)} enSazon={predictions.filter(p=>p.estadoML==="sazon").reduce((s,p)=>s+p.cant,0)}/></div>:<ChartSkeleton height="h-44"/>}
                    </div>
                    <div className="rounded-2xl border border-lime-200 p-4">
                      <p className="text-xs font-semibold text-emerald-800 mb-3">Distribución por estado (ML)</p>
                      {mlStatus==="ready"?<div className="relative h-44"><DoughnutChartCanvas key={`d-${doughnutData.join("-")}`} data={doughnutData}/></div>:<ChartSkeleton height="h-44"/>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-lime-200 p-4">
                    <p className="text-xs font-semibold text-emerald-800 mb-3">Unidades en riesgo por proveedor (ML)</p>
                    {mlStatus==="ready"?<div className="relative h-36"><BarChartCanvas key={`b-${barValues.join("-")}`} labels={barLabels} values={barValues}/></div>:<ChartSkeleton height="h-36"/>}
                  </div>
                </div>
              ):<div className="space-y-4"><ChartSkeleton height="h-44"/><ChartSkeleton height="h-36"/></div>}
            </div>
          )}

          {tab==="inventario"&&(
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Resumen por lote — datos clave</p>
              <div className="rounded-2xl border border-lime-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-900 text-lime-50"><tr><th className="px-4 py-3 font-semibold text-left">Producto</th><th className="px-4 py-3 font-semibold text-left">Proveedor</th><th className="px-4 py-3 font-semibold text-left">Días</th><th className="px-4 py-3 font-semibold text-left">pH est.</th><th className="px-4 py-3 font-semibold text-left">Estado ML</th><th className="px-4 py-3 font-semibold text-left">Confianza</th><th className="px-4 py-3 font-semibold text-left">Acción</th></tr></thead>
                  <tbody>{INVENTARIO_DEMO.map((lote,i)=>{const pred=predictions.find(p=>p.producto===lote.producto),dias=computeDias(lote.fecha);return(
                    <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                      <td className="px-4 py-2.5 font-medium text-xs">{lote.producto}</td>
                      <td className="px-4 py-2.5 text-xs text-emerald-600">{lote.proveedor}</td>
                      <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(dias)}`}>{dias}d</td>
                      <td className="px-4 py-2.5"><PhBadge ph={estimatePh(dias,lote.tamano,lote.tipo)}/></td>
                      <td className="px-4 py-2.5">{pred?<Badge estado={pred.estadoML}/>:<Skel className="h-5 w-20"/>}</td>
                      <td className="px-4 py-2.5">{pred?<ConfidencePill value={pred.confianza}/>:<Skel className="h-4 w-14"/>}</td>
                      <td className={`px-4 py-2.5 text-xs font-semibold ${pred?accionColor(pred.estadoML):""}`}>{pred?`${accionPrefix(pred.estadoML)}${ACCIONES_MAP[ESTADO_LABELS.indexOf(pred.estadoML)]}`:<Skel className="h-4 w-24"/>}</td>
                    </tr>
                  );})}</tbody>
                </table>
              </div>
              <InfoNote>Días calculados en tiempo real desde fecha de ingreso · pH estimado internamente · Estado y Acción por ML</InfoNote>
              {mlStatus==="ready"&&(
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Calificación por proveedor (ML)</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {PROVEEDORES.map(pv=>(
                      <div key={pv.nombre} className="rounded-2xl border border-lime-200 p-4 bg-white space-y-1.5">
                        <p className="font-semibold text-sm text-emerald-900">{pv.nombre}</p>
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Unidades</span><span className="font-medium text-emerald-900">{pv.unidades}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-500">En riesgo</span><span className={`font-medium ${pv.riesgo>0?"text-red-600":"text-emerald-700"}`}>{pv.riesgo}</span></div>
                        <ProgressBar value={pv.riesgo} max={pv.unidades||1} color={pv.riesgo>0?"bg-red-500":"bg-emerald-500"}/>
                        {pv.cal&&<CalBadge cal={pv.cal}/>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab==="historial"&&(
            <div className="space-y-6">
              {mlStatus==="ready"&&predictions.length>0&&(
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Alertas generadas por el modelo — hoy</p>
                  <div className="rounded-2xl border border-lime-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-emerald-900 text-lime-50"><tr><th className="px-4 py-2.5 font-semibold text-left">Producto</th><th className="px-4 py-2.5 font-semibold text-left">Días</th><th className="px-4 py-2.5 font-semibold text-left">Estado ML</th><th className="px-4 py-2.5 font-semibold text-left">Acción recomendada</th><th className="px-4 py-2.5 font-semibold text-left">Confianza</th></tr></thead>
                      <tbody>{[...predictions].sort((a,b)=>ESTADO_LABELS.indexOf(b.estadoML)-ESTADO_LABELS.indexOf(a.estadoML)).map((p,i)=>(
                        <tr key={i} className="border-t border-lime-100 hover:bg-lime-100">
                          <td className="px-4 py-2.5 font-medium text-xs">{p.producto}</td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${diasColor(p.diasAlmacen)}`}>{p.diasAlmacen}d</td>
                          <td className="px-4 py-2.5"><Badge estado={p.estadoML}/></td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${accionColor(p.estadoML)}`}>{accionPrefix(p.estadoML)}{ACCIONES_MAP[ESTADO_LABELS.indexOf(p.estadoML)]}</td>
                          <td className="px-4 py-2.5"><ConfidencePill value={p.confianza}/></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Línea de tiempo — eventos registrados</p>
                <div className="relative pl-5 border-l-2 border-lime-200 space-y-5">
                  {HISTORIAL_DEMO.map((ev,i)=>(
                    <div key={i} className="relative pl-3">
                      <DotTimeline color={ev.color}/>
                      <p className="text-sm font-medium text-emerald-900">{ev.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ev.detalle}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ev.color==="rojo"?"bg-red-100 text-red-700":ev.color==="amarillo"?"bg-yellow-100 text-yellow-700":"bg-emerald-100 text-emerald-700"}`}>{ev.fecha}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">Resumen mensual</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard label="Lotes procesados"  value="18"/>
                  <MetricCard label="Vendidos a tiempo" value="14" valueColor="text-emerald-700"/>
                  <MetricCard label="Con pérdida"       value="2"  valueColor="text-red-600"/>
                  <MetricCard label="En seguimiento"    value="2"  valueColor="text-yellow-600"/>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};

export default Prediccion;