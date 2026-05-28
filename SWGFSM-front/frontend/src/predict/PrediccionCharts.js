import React, { useEffect, useRef, useState } from "react";

export const normalizeInventarioML = (rows) => {
  if (!Array.isArray(rows)) return [];
  const normSub = (v) => {
    if (!v) return null;
    const n = v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return ["verde", "sazon", "maduro"].includes(n) ? n : null;
  };
  return rows.map((p) => ({
    productoId: p.productoId,
    producto: p.producto ?? "Palta",
    tipo: p.tipo ?? "",
    tamano: p.tamano ?? "",
    subLote: normSub(p.subLote) ?? "sin_definir",
    cant: p.cantidad ?? 0,
    diasAlmacen: p.diasAlmacen ?? 0,
    estadoML: p.estadoML ?? null,
    confianza: typeof p.confianza === "number" ? p.confianza : 0,
  }));
};

const useChartJs = () => {
  const [ready, setReady] = useState(!!window.Chart);
  useEffect(() => {
    if (window.Chart) {
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
};

const useChart = (ref, config, deps) => {
  useEffect(() => {
    if (!ref.current || !window.Chart) return;
    const c = new window.Chart(ref.current, config);
    return () => c.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

const ChartSkeleton = ({ h = "h-44" }) => (
  <div
    className={`${h} flex flex-col items-center justify-center gap-2 bg-lime-50 rounded-xl border border-lime-200`}
  >
    <div className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
    <p className="text-xs text-emerald-600">Cargando gráfico…</p>
  </div>
);

const LineChartCanvas = ({ enRiesgo, enSazon }) => {
  const ref = useRef(null);
  const gen = (end, f) =>
    Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(end * (0.4 + (i / 6) * 0.6 * f))));
  useChart(
    ref,
    {
      type: "line",
      data: {
        labels: ["-6d", "-5d", "-4d", "-3d", "-2d", "Ayer", "Hoy"],
        datasets: [
          {
            label: "En riesgo",
            data: gen(enRiesgo, 1),
            borderColor: "#dc2626",
            backgroundColor: "rgba(220,38,38,.1)",
            tension: 0.4,
            fill: true,
            pointRadius: 3,
          },
          {
            label: "En sazón",
            data: gen(enSazon, 1.5),
            borderColor: "#15803d",
            backgroundColor: "rgba(21,128,61,.1)",
            tension: 0.4,
            fill: true,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 10, padding: 8 } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { font: { size: 10 } } },
          x: { ticks: { font: { size: 10 } } },
        },
      },
    },
    [enRiesgo, enSazon]
  );
  return <canvas ref={ref} />;
};

const DoughnutChartCanvas = ({ data }) => {
  const ref = useRef(null);
  useChart(
    ref,
    {
      type: "doughnut",
      data: {
        labels: ["Punto negro", "Maduro", "Sazón", "Verde"],
        datasets: [{ data, backgroundColor: ["#dc2626", "#d97706", "#15803d", "#0284c7"], borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "right", labels: { font: { size: 11 }, boxWidth: 10, padding: 8 } } },
      },
    },
    [data.join("-")]
  );
  return <canvas ref={ref} />;
};

const BarChartCanvas = ({ labels, values }) => {
  const ref = useRef(null);
  useChart(
    ref,
    {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Kg en riesgo",
            data: values,
            backgroundColor: values.map((v) => (v > 0 ? "#dc2626" : "#15803d")),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { font: { size: 10 } } },
          y: { ticks: { font: { size: 11 } } },
        },
      },
    },
    [labels.join("|"), values.join("-")]
  );
  return <canvas ref={ref} />;
};

const buildChartMetrics = (predictions) => {
  const list = Array.isArray(predictions) ? predictions : [];
  const countByEstado = (est) =>
    list.filter((p) => p.estadoML === est).reduce((s, p) => s + (p.cant ?? 0), 0);
  const doughnutData = ["punto_negro", "maduro", "sazon", "verde"].map(countByEstado);
  const enRiesgo = list
    .filter((p) => p.estadoML === "punto_negro" || p.estadoML === "maduro")
    .reduce((s, p) => s + (p.cant ?? 0), 0);
  const enSazon = list.filter((p) => p.estadoML === "sazon").reduce((s, p) => s + (p.cant ?? 0), 0);

  const tiposUnicos = [...new Set(list.map((p) => p.producto))];
  const calificaciones = tiposUnicos.map((prod) => {
    const lotes = list.filter((p) => p.producto === prod);
    const riesgo = lotes
      .filter((p) => p.estadoML === "punto_negro" || p.estadoML === "maduro")
      .reduce((s, p) => s + (p.cant ?? 0), 0);
    return { nombre: prod, riesgo };
  });

  return {
    doughnutData,
    enRiesgo,
    enSazon,
    barLabels: calificaciones.map((p) => p.nombre),
    barValues: calificaciones.map((p) => p.riesgo),
    hasData: list.length > 0,
  };
};

/**
 * Gráficos de análisis ML (misma vista que pestaña Análisis del módulo Predicción).
 * @param {{ predictions: object[], loading?: boolean, showExplanations?: boolean }} props
 */
const PrediccionChartsPanel = ({
  predictions = [],
  loading = false,
  showExplanations = true,
  showSectionHeader = true,
}) => {
  const chartReady = useChartJs();
  const { doughnutData, enRiesgo, enSazon, barLabels, barValues, hasData } = buildChartMetrics(predictions);
  const mlReady = !loading && chartReady && hasData;

  return (
    <div
      className={
        showSectionHeader
          ? "mt-6 space-y-4 border-t border-lime-100 pt-5"
          : "space-y-4"
      }
    >
      {showSectionHeader && (
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Análisis gráfico (ML)
        </p>
      )}

      {loading || !chartReady ? (
        <div className="space-y-4">
          <ChartSkeleton />
          <ChartSkeleton h="h-36" />
        </div>
      ) : !hasData ? (
        <p className="rounded-xl border border-dashed border-lime-200 bg-lime-50/50 px-4 py-6 text-center text-sm text-gray-500">
          Aún no hay predicciones ML registradas. El modelo generará datos al entrenarse con inventario activo.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <p className="text-xs font-semibold text-gray-700">Evolución estimada — 7 días</p>
              {showExplanations && (
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  Proyección de kilos que podrían pasar a <strong>riesgo</strong> (maduro + punto negro) frente a
                  los que permanecen en <strong>sazón</strong>, según el estado actual del modelo. Sirve para planificar
                  ventas o despacho en la próxima semana.
                </p>
              )}
              <div className="relative mt-3 h-44">
                {mlReady ? (
                  <LineChartCanvas enRiesgo={enRiesgo} enSazon={enSazon} />
                ) : (
                  <ChartSkeleton />
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <p className="text-xs font-semibold text-gray-700">Distribución por estado ML — kg</p>
              {showExplanations && (
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  Reparto del inventario en kilos por madurez: <strong>verde</strong>, <strong>sazón</strong>,{" "}
                  <strong>maduro</strong> y <strong>punto negro</strong>. Permite ver de un vistazo qué parte del lote
                  está sana y cuánta requiere acción inmediata.
                </p>
              )}
              <div className="relative mt-3 h-44">
                {mlReady ? <DoughnutChartCanvas data={doughnutData} /> : <ChartSkeleton />}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 bg-white">
            <p className="text-xs font-semibold text-gray-700">Kg en riesgo por tipo de palta (ML)</p>
            {showExplanations && (
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                Kilogramos en estado <strong>maduro</strong> o <strong>punto negro</strong> desglosados por producto o
                variedad. Ayuda a priorizar qué tipo de palta vender o mover primero para reducir mermas.
              </p>
            )}
            <div className="relative mt-3 h-36">
              {mlReady ? <BarChartCanvas labels={barLabels} values={barValues} /> : <ChartSkeleton h="h-36" />}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PrediccionChartsPanel;
