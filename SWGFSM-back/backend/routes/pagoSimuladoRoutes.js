// backend/routes/pagoSimuladoRoutes.js
// Registro de pagos simulados (sin Mercado Pago ni cobro real). Pensado para tesis / QA.

const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const METODOS = ["efectivo", "yape", "plin", "transferencia", "tarjeta"];

router.post("/", (req, res) => {
  try {
    const method = String(req.body.method || "").toLowerCase().trim();
    const total = Number(req.body.total);
    const declineTest = req.body.declineTest === true;

    if (!METODOS.includes(method)) {
      return res.status(400).json({ ok: false, message: "Método de pago no válido para el simulador." });
    }
    if (!Number.isFinite(total) || total < 0) {
      return res.status(400).json({ ok: false, message: "Total inválido." });
    }

    if (method === "tarjeta" && declineTest) {
      console.log("[pago-simulado] Rechazo de prueba (declineTest)", { total });
      return res.status(200).json({
        ok: false,
        code: "INSUFFICIENT_FUNDS",
        message: "Simulación: el banco rechazó el cargo (prueba de rechazo activada).",
      });
    }

    const operationId = `SIM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const serverAt = new Date().toISOString();

    console.log("[pago-simulado] Aprobado (sin cargo real)", { operationId, method, total, serverAt });

    return res.status(200).json({
      ok: true,
      operationId,
      message: `Pago simulado de S/ ${total.toFixed(2)} registrado en el servidor (no es un cobro real).`,
      serverAt,
    });
  } catch (err) {
    console.error("[pago-simulado]", err);
    return res.status(500).json({ ok: false, message: "Error interno en el simulador de pagos." });
  }
});

module.exports = router;
