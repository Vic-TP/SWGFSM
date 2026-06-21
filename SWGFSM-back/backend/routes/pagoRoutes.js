const express = require("express");
const router = express.Router();
const { MercadoPagoConfig, Payment } = require("mercadopago");

const ACCESS_TOKEN =
  "TEST-102751121663344-061823-0f31fec2633704facf2310a6b624106a-1501664144";

const client = new MercadoPagoConfig({
  accessToken: ACCESS_TOKEN,
});

// Verificar métodos de pago al iniciar
async function logPaymentMethods() {
  try {
    const response = await fetch(
      "https://api.mercadopago.com/v1/payment_methods",
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`, // ← Usa la variable directamente
        },
      },
    );
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error("Error obteniendo métodos de pago:", error);
  }
}
logPaymentMethods();

router.post("/create_preference", async (req, res) => {
  const {
    token,
    issuer_id,
    payment_method_id,
    transaction_amount,
    installments,
    description,
    payer,
  } = req.body;

  // Validación básica
  if (!token || !payment_method_id || !transaction_amount || !payer?.email) {
    return res.status(400).json({
      message:
        "Faltan datos requeridos: token, payment_method_id, transaction_amount o email del pagador.",
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

    res.json(response);
  } catch (error) {
    console.error("═══ ERROR MERCADOPAGO (FULL) ═══");
    console.error("message:", error?.message);
    console.error("status:", error?.status || error?.statusCode);
    console.error("cause:", JSON.stringify(error?.cause, null, 2));
    console.error("error body:", JSON.stringify(error, null, 2));
    console.error("═══════════════════════════════");
    res.status(500).json({
      message: error?.cause?.[0]?.description || error?.message || "Error al procesar el pago.",
      mpError: {
        status: error?.status || error?.statusCode,
        cause: error?.cause,
        message: error?.message,
      },
    });
  }
});

router.post("/pago-simulado", async (req, res) => {
  const { method, total, tipoEntrega, estacionMetropolitanoNombre } = req.body;

  // Acá podés guardar en DB la intención de pago
  // Por ahora devuelve una respuesta simulada exitosa
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
