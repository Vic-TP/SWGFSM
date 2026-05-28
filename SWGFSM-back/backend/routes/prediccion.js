const express    = require("express");
const router     = express.Router();
const PrediccionML = require("../models/PrediccionML");
const {
  entrenarModelo,
  predecirYGuardar,
  modeloListo,
  getAccuracy,
  getThresholds,
} = require("../ml/trainer");

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/prediccion/inventario
//  Devuelve todas las predicciones activas (una por sub-lote de producto)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/inventario", async (req, res) => {
  try {
    const datos = await PrediccionML.find()
      .sort({ estadoML: -1, fecha: -1 }) // punto_negro primero
      .limit(300)
      .lean();

    res.json({ ok: true, data: datos });
  } catch (err) {
    console.error("[API] /inventario error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/prediccion/resumen
//  Métricas agregadas para el dashboard
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/resumen", async (req, res) => {
  try {
    const datos = await PrediccionML.find().lean();

    if (!datos.length) {
      return res.json({ ok: true, data: null });
    }

    // ── Totales de kg por sub-lote físico ────────────────────────────────────
    const totalKg     = datos.reduce((s, p) => s + (p.cantidad ?? 0), 0);
    const totalVerde  = datos.filter(p => p.subLote === "verde")
                             .reduce((s, p) => s + (p.cantidad ?? 0), 0);
    const totalSazon  = datos.filter(p => p.subLote === "sazon")
                             .reduce((s, p) => s + (p.cantidad ?? 0), 0);
    const totalMaduro = datos.filter(p => p.subLote === "maduro")
                             .reduce((s, p) => s + (p.cantidad ?? 0), 0);

    // ── Sub-lotes en riesgo / sazón por estado ML ────────────────────────────
    const totalRiesgo = datos.filter(
      p => p.estadoML === "punto_negro" || p.estadoML === "maduro"
    ).length;
    const totalSazonML = datos.filter(p => p.estadoML === "sazon").length;

    // ── Días promedio de almacén ─────────────────────────────────────────────
    const diasProm = datos.length
      ? (datos.reduce((s, p) => s + (p.diasAlmacen ?? 0), 0) / datos.length).toFixed(1)
      : "0";

    // ── Confianza media ──────────────────────────────────────────────────────
    const avgConf = datos.length
      ? Math.round(
          (datos.reduce((s, p) => s + (p.confianza ?? 0), 0) / datos.length) * 100
        )
      : null;

    // ── Accuracy del modelo ──────────────────────────────────────────────────
    const accuracy = getAccuracy() ??
      datos.find(p => typeof p.accuracy === "number")?.accuracy ?? null;

    // ── Distribución de kg por estado ML ────────────────────────────────────
    const kgPorEstado = ["verde", "sazon", "maduro", "punto_negro"].reduce((acc, est) => {
      acc[est] = datos
        .filter(p => p.estadoML === est)
        .reduce((s, p) => s + (p.cantidad ?? 0), 0);
      return acc;
    }, {});

    res.json({
      ok: true,
      data: {
        totalKg,
        totalVerde,
        totalSazon,
        totalMaduro,
        totalRiesgo,
        totalSazonML,
        diasProm,
        avgConf,
        accuracy,
        kgPorEstado,
        modeloActivo: modeloListo(),
      },
    });
  } catch (err) {
    console.error("[API] /resumen error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/prediccion/historial
//  Últimas 100 predicciones ordenadas por fecha desc (para la línea de tiempo)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/historial", async (req, res) => {
  try {
    const historial = await PrediccionML.find()
      .sort({ fecha: -1 })
      .limit(100)
      .lean();

    res.json({ ok: true, data: historial });
  } catch (err) {
    console.error("[API] /historial error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/prediccion/thresholds/:tipo
//  Devuelve los umbrales de maduración para una variedad
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/thresholds/:tipo", (req, res) => {
  try {
    const thresholds = getThresholds(req.params.tipo);
    res.json({ ok: true, data: thresholds });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/prediccion/reentrenar
//  Dispara re-entrenamiento del modelo (asíncrono)
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/reentrenar", async (req, res) => {
  try {
    // Respuesta inmediata; el entrenamiento sigue en background
    res.json({ ok: true, message: "Re-entrenamiento iniciado (~30 s)" });
    await entrenarModelo();
  } catch (err) {
    console.error("[API] /reentrenar error:", err);
    // No enviamos otro res porque ya fue enviado arriba
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/prediccion/actualizar
//  Fuerza una nueva ronda de predicciones sin re-entrenar
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/actualizar", async (req, res) => {
  try {
    if (!modeloListo()) {
      return res.status(400).json({
        ok: false,
        error: "El modelo aún no ha sido entrenado",
      });
    }
    const resultados = await predecirYGuardar();
    res.json({ ok: true, data: resultados, total: resultados?.length ?? 0 });
  } catch (err) {
    console.error("[API] /actualizar error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;