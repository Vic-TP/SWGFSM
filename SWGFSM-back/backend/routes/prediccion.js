const express      = require("express");
const router       = express.Router();
const Inventario   = require("../models/Inventario");
const PrediccionML = require("../models/PrediccionML");
const { predecirYGuardar, modeloListo, entrenarModelo } = require("../ml/trainer");

// ── GET /api/prediccion/inventario ─────────────────────────────────────────────
// Devuelve TODOS los lotes activos del inventario con su última predicción ML
router.get("/inventario", async (req, res) => {
  try {
    // 1. Traer todos los lotes de inventario
    const lotes = await Inventario.find({}).sort({ fecha: -1 });

    if (!lotes.length) {
      return res.json({ ok: true, data: [] });
    }

    // 2. Para cada lote, buscar su predicción más reciente — si no existe, generarla
    const data = await Promise.all(
      lotes.map(async (lote) => {
        let pred = await PrediccionML.findOne({ inventarioId: lote._id })
          .sort({ fecha: -1 });

        // Si no tiene predicción guardada, generar una ahora y guardarla
        if (!pred && modeloListo()) {
          try {
            pred = await predecirYGuardar(lote);
          } catch (e) {
            console.warn(`[prediccion] No se pudo predecir lote ${lote._id}:`, e.message);
          }
        }

        // Calcular días almacenado desde la fecha del lote
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const entrada = new Date(lote.fecha);
        entrada.setHours(0, 0, 0, 0);
        const diasAlmacen = Math.max(
          0,
          Math.floor((today - entrada) / 86400000)
        );

        // Estimación de pH por si no hay predicción guardada
        const estimatePh = (dias, tamano, tipo) => {
          const tamOff =
            tamano === "pequeño" ? 0.1 : tamano === "grande" ? -0.05 : 0.0;
          const tipOff =
            tipo === "Local" ? -0.1 : tipo === "Orgánico" ? 0.15 : 0.0;
          return Math.max(
            4.5,
            parseFloat((7.8 - dias * 0.24 + tamOff + tipOff).toFixed(2))
          );
        };

        const phEstimado =
          pred?.phEstimado ?? estimatePh(diasAlmacen, lote.tamano, lote.tipo);

        // Estado fallback por días si aún no hay predicción (modelo no listo)
        const estadoFallback =
          diasAlmacen >= 7
            ? "punto_negro"
            : diasAlmacen >= 5
            ? "maduro"
            : diasAlmacen >= 3
            ? "sazon"
            : "verde";

        // Confianza fallback: 1.0 si el estado es determinístico por días extremos,
        // menor si está en zona de transición
        const confianzaFallback =
          diasAlmacen >= 10 || diasAlmacen <= 1 ? 0.95
          : diasAlmacen >= 7 ? 0.85
          : diasAlmacen >= 5 ? 0.75
          : 0.70;

        return {
          _id:          lote._id,
          inventarioId: lote,
          fecha:        lote.fecha,
          proveedor:    lote.proveedor,
          producto:
            lote.producto === "Palta"
              ? `Palta ${lote.tipo}`
              : lote.producto,
          tipo:         lote.tipo,
          tamano:       lote.tamano,
          cantidad:     lote.cantidad,
          diasAlmacen,
          phEstimado,
          estadoML:     pred?.estadoML   ?? estadoFallback,
          confianza:    pred?.confianza  ?? confianzaFallback,
          probs:        pred?.probs      ?? [],
          accion:       pred?.accion     ?? null,
        };
      })
    );

    res.json({ ok: true, data });
  } catch (err) {
    console.error("[/inventario]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/prediccion/historial ──────────────────────────────────────────────
// Últimos 30 eventos ordenados por fecha
router.get("/historial", async (req, res) => {
  try {
    const historial = await PrediccionML.find({})
      .sort({ fecha: -1 })
      .limit(30)
      .populate("inventarioId");
    res.json({ ok: true, data: historial });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/prediccion/resumen ────────────────────────────────────────────────
// Métricas para las tarjetas del dashboard
router.get("/resumen", async (req, res) => {
  try {
    // Traer todos los lotes y su última predicción (igual que /inventario)
    const lotes = await Inventario.find({});

    const activos = await Promise.all(
      lotes.map(async (lote) => {
        let pred = await PrediccionML.findOne({ inventarioId: lote._id })
          .sort({ fecha: -1 });

        // Si no tiene predicción y el modelo está listo, generarla
        if (!pred && modeloListo()) {
          try { pred = await predecirYGuardar(lote); } catch (e) { /* ignore */ }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const entrada = new Date(lote.fecha);
        entrada.setHours(0, 0, 0, 0);
        const diasAlmacen = Math.max(
          0,
          Math.floor((today - entrada) / 86400000)
        );

        const estadoFallback =
          diasAlmacen >= 7 ? "punto_negro"
          : diasAlmacen >= 5 ? "maduro"
          : diasAlmacen >= 3 ? "sazon"
          : "verde";

        const confianzaFallback =
          diasAlmacen >= 10 || diasAlmacen <= 1 ? 0.95
          : diasAlmacen >= 7 ? 0.85
          : diasAlmacen >= 5 ? 0.75
          : 0.70;

        return {
          cantidad:    lote.cantidad ?? 0,
          diasAlmacen,
          estadoML:   pred?.estadoML  ?? estadoFallback,
          confianza:  pred?.confianza ?? confianzaFallback,
        };
      })
    );

    const totalKg     = activos.reduce((s, p) => s + p.cantidad, 0);
    const totalRiesgo = activos.filter(
      (p) => p.estadoML === "punto_negro" || p.estadoML === "maduro"
    ).length;
    const totalSazon  = activos.filter((p) => p.estadoML === "sazon").length;
    const diasProm    = activos.length
      ? (
          activos.reduce((s, p) => s + p.diasAlmacen, 0) / activos.length
        ).toFixed(1)
      : "0";
    const avgConf     = activos.length
      ? Math.round(
          (activos.reduce((s, p) => s + p.confianza, 0) / activos.length) * 100
        )
      : null;

    const kgPorEstado = {};
    ["verde", "sazon", "maduro", "punto_negro"].forEach((e) => {
      kgPorEstado[e] = activos
        .filter((p) => p.estadoML === e)
        .reduce((s, p) => s + p.cantidad, 0);
    });

    res.json({
      ok: true,
      data: {
        totalKg,
        totalRiesgo,
        totalSazon,
        diasProm,
        avgConf,
        kgPorEstado,
        total: activos.length,
      },
    });
  } catch (err) {
    console.error("[/resumen]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/prediccion/reentrenar ───────────────────────────────────────────
router.post("/reentrenar", async (req, res) => {
  try {
    entrenarModelo(); // No await — corre en background
    res.json({ ok: true, mensaje: "Entrenamiento iniciado en background" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/prediccion/estado-modelo ────────────────────────────────────────
router.get("/estado-modelo", async (req, res) => {
  res.json({ ok: true, listo: modeloListo() });
});

module.exports = router;