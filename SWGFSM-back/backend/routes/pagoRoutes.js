const express = require("express");
const router = express.Router();
const { MercadoPagoConfig, Payment } = require("mercadopago");

const getMpAccessToken = () =>
  String(
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
      process.env.ACCESS_TOKEN ||
      "",
  ).trim();

const mpAccessToken = getMpAccessToken();
const mpConfigured = mpAccessToken.length > 0;

const client = mpConfigured
  ? new MercadoPagoConfig({ accessToken: mpAccessToken })
  : null;

if (!mpConfigured) {
  console.warn(
    "[pagos] Mercado Pago sin configurar. Agrega MERCADOPAGO_ACCESS_TOKEN o ACCESS_TOKEN en backend/.env",
  );
}

const requireMpConfigured = (_req, res, next) => {
  if (!mpConfigured || !client) {
    return res.status(503).json({
      message:
        "Mercado Pago no está configurado en el servidor. Contacta al administrador.",
    });
  }
  next();
};

router.post("/create_preference", requireMpConfigured, async (req, res) => {
  const {
    token,
    issuer_id,
    payment_method_id,
    transaction_amount,
    installments,
    description,
    payer,
  } = req.body;

  if (!token || !transaction_amount || !payer?.email) {
    return res.status(400).json({
      message:
        "Faltan datos requeridos: token, transaction_amount o email del pagador.",
    });
  }

  const payment = new Payment(client);

  try {
    const response = await payment.create({
      body: {
        token,
        issuer_id,
        payment_method_id,
        transaction_amount: Number(transaction_amount),
        installments: Number(installments) || 1,
        description: description || "Compra en Frutería",
        payer: {
          email: payer.email,
          identification: {
            type: payer.identification?.type,
            number: payer.identification?.number,
          },
        },
      },
    });

    res.json({
      id: response.id,
      status: response.status,
      status_detail: response.status_detail,
    });
  } catch (error) {
    console.error("═══ ERROR MERCADOPAGO (FULL) ═══");
    console.error("message:", error?.message);
    console.error("status:", error?.status || error?.statusCode);
    console.error("cause:", JSON.stringify(error?.cause, null, 2));
    res.status(500).json({
      message:
        error?.cause?.[0]?.description ||
        error?.message ||
        "Error al procesar el pago.",
      mpError: {
        status: error?.status || error?.statusCode,
        cause: error?.cause,
        message: error?.message,
      },
    });
  }
});

router.get("/issuers", requireMpConfigured, async (req, res) => {
  const { payment_method_id, bin } = req.query;
  if (!payment_method_id || !bin || bin.length < 6) {
    return res
      .status(400)
      .json({ message: "Faltan payment_method_id o bin (mín. 6 dígitos)." });
  }
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payment_methods/card_issuers?payment_method_id=${payment_method_id}&bin=${bin}`,
      { headers: { Authorization: `Bearer ${mpAccessToken}` } },
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error al obtener issuers:", error);
    res.status(500).json({ message: "Error al obtener bancos emisores." });
  }
});

router.post("/create_yape", requireMpConfigured, async (req, res) => {
  const { token, transaction_amount, description, payer } = req.body;

  if (!token || !transaction_amount || !payer?.email) {
    return res.status(400).json({
      message:
        "Faltan datos requeridos: token, transaction_amount y email del pagador.",
    });
  }

  const payment = new Payment(client);

  try {
    const response = await payment.create({
      body: {
        token,
        transaction_amount: Number(transaction_amount),
        description: description || "Compra en Frutería",
        payment_method_id: "yape",
        installments: 1,
        payer: {
          email: payer.email,
        },
      },
    });

    res.json({
      id: response.id,
      status: response.status,
      status_detail: response.status_detail,
    });
  } catch (error) {
    console.error("═══ ERROR YAPE ═══", error);
    res.status(500).json({
      message:
        error?.cause?.[0]?.description ||
        error?.message ||
        "Error al procesar el pago Yape.",
    });
  }
});

router.post("/yape_status", requireMpConfigured, async (req, res) => {
  const { payment_id } = req.body;

  if (!payment_id) {
    return res.status(400).json({ message: "Falta payment_id." });
  }

  const payment = new Payment(client);

  try {
    const response = await payment.get({ id: payment_id });
    res.json({
      id: response.id,
      status: response.status,
      status_detail: response.status_detail,
    });
  } catch (error) {
    console.error("═══ ERROR YAPE STATUS ═══", error);
    res.status(500).json({
      message:
        error?.cause?.[0]?.description ||
        error?.message ||
        "Error al consultar el pago.",
    });
  }
});

router.post("/pago-simulado", async (req, res) => {
  const { method, total, tipoEntrega, estacionMetropolitanoNombre } = req.body;

  try {
    const operationId = `SIM-${Date.now()}`;
    res.json({
      ok: true,
      operationId,
      message: `Pedido registrado. Pagarás S/ ${Number(total).toFixed(2)} con ${method} al ${
        tipoEntrega === "METROPOLITANO"
          ? `recibir en estación ${estacionMetropolitanoNombre}`
          : "recoger en tienda"
      }.`,
      serverAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Error al registrar el pago." });
  }
});

module.exports = router;
