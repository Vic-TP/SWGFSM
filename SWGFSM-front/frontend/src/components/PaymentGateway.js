// src/components/PaymentGateway.js
// Simulador de checkout estilo PSP (p. ej. Mercado Pago). No procesa pagos reales.
// Cuando Mercado Pago valide tu RUC, sustituye runSimulatedPayment por Checkout Pro / Bricks según la doc oficial.

import React, { useMemo, useState } from "react";

/** Solo dígitos, máx. 19 (UnionPay); en simulador usamos 16. */
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

/** Formato visual 0000 0000 0000 0000 */
const formatPanDisplay = (digits) =>
  onlyDigits(digits)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();

/** Algoritmo de Luhn (validación de número de tarjeta). */
const luhnOk = (digits) => {
  const d = onlyDigits(digits);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

const parseExpiry = (raw) => {
  const t = String(raw || "").trim();
  const m = t.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  return { month, yy };
};

const expiryNotPast = (raw) => {
  const p = parseExpiry(raw);
  if (!p) return false;
  const now = new Date();
  const yFull = 2000 + p.yy;
  if (yFull > now.getFullYear() + 50 || yFull < now.getFullYear() - 20) return false;
  const last = new Date(yFull, p.month, 0, 23, 59, 59);
  return last >= new Date(now.getFullYear(), now.getMonth(), 1);
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const apiBase = () => String(process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

/**
 * Registra el intento de pago simulado en el backend (`POST /api/pago-simulado`).
 * La validación de tarjeta (Luhn, titular, etc.) se hace en el cliente antes de llamar aquí.
 * Con Mercado Pago real, este fetch se sustituye por la API del PSP.
 */
async function runSimulatedPayment({ method, total, declineTest }) {
  await delay(600 + Math.random() * 500);
  const url = `${apiBase()}/api/pago-simulado`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        total: Number(total),
        declineTest: Boolean(declineTest),
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return {
        ok: false,
        code: "SERVER",
        message: data.message || `Error del servidor (${r.status}).`,
      };
    }
    if (!data.ok) {
      return {
        ok: false,
        code: data.code || "DECLINED",
        message: data.message || "Pago rechazado.",
      };
    }
    return {
      ok: true,
      operationId: data.operationId,
      message: data.message || `Pago simulado de S/ ${Number(total).toFixed(2)} autorizado.`,
      serverAt: data.serverAt,
    };
  } catch {
    return {
      ok: false,
      code: "BACKEND_UNAVAILABLE",
      message:
        "No se pudo conectar con el servidor. Comprueba que el backend esté en ejecución (por ejemplo en el puerto 5000).",
    };
  }
}

const PaymentGateway = ({ total, onSuccess, onCancel, onMethodSelect }) => {
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [phase, setPhase] = useState("form"); // form | processing | result
  const [result, setResult] = useState(null);
  const [fieldError, setFieldError] = useState("");
  const busy = phase === "processing";

  const totalNum = Number(total) || 0;

  const cardDigits = useMemo(() => onlyDigits(cardNumber), [cardNumber]);

  const handleMethodChange = (method) => {
    setPaymentMethod(method);
    setFieldError("");
    if (onMethodSelect) onMethodSelect(method);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setFieldError("");

    if (paymentMethod === "tarjeta") {
      if (cardDigits.length < 13) {
        setFieldError("Ingresa un número de tarjeta completo.");
        return;
      }
      if (!luhnOk(cardDigits)) {
        setFieldError("Número de tarjeta inválido. Revisa los dígitos.");
        return;
      }
      if (!parseExpiry(cardExpiry)) {
        setFieldError("Fecha de vencimiento inválida (usa MM/AA).");
        return;
      }
      if (!expiryNotPast(cardExpiry)) {
        setFieldError("La tarjeta está vencida.");
        return;
      }
      const cv = onlyDigits(cardCvv);
      if (cv.length < 3 || cv.length > 4) {
        setFieldError("CVV inválido (3 o 4 dígitos).");
        return;
      }
      if (!String(cardHolder || "").trim()) {
        setFieldError("Nombre del titular obligatorio.");
        return;
      }
    }

    setPhase("processing");
    try {
      const declineTest = paymentMethod === "tarjeta" && onlyDigits(cardCvv) === "999";
      const res = await runSimulatedPayment({
        method: paymentMethod,
        total: totalNum,
        declineTest,
      });
      setResult(res);
      setPhase("result");
    } catch {
      setResult({
        ok: false,
        code: "NETWORK",
        message: "Error inesperado al procesar. Intenta de nuevo.",
      });
      setPhase("result");
    }
  };

  const finishSuccessAndClose = async () => {
    try {
      if (typeof onSuccess === "function") await Promise.resolve(onSuccess());
    } finally {
      onCancel();
    }
  };

  const resetToForm = () => {
    setPhase("form");
    setResult(null);
    setFieldError("");
  };

  const mpBlue = "#009ee3";

  if (phase === "result" && result) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
        <div
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          role="dialog"
          aria-labelledby="sim-result-title"
        >
          <div
            className="px-5 py-4 text-white"
            style={{ background: result.ok ? "linear-gradient(90deg,#059669,#047857)" : "linear-gradient(90deg,#dc2626,#b91c1c)" }}
          >
            <h2 id="sim-result-title" className="text-lg font-bold">
              {result.ok ? "Pago aprobado" : "No se pudo completar el pago"}
            </h2>
            <p className="mt-1 text-sm text-white/90">Modo simulador — no se ha cobrado dinero real.</p>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-700">{result.message}</p>
            {result.ok && result.operationId && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <span className="text-gray-500">ID de operación (generado en servidor)</span>
                <p className="mt-1 font-mono font-semibold text-gray-900 break-all">{result.operationId}</p>
                {result.serverAt && (
                  <p className="mt-2 text-xs text-gray-500">
                    Marca de tiempo servidor: <span className="font-mono">{result.serverAt}</span>
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              {!result.ok && (
                <button
                  type="button"
                  onClick={resetToForm}
                  className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Intentar de nuevo
                </button>
              )}
              {result.ok ? (
                <button
                  type="button"
                  onClick={finishSuccessAndClose}
                  className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Cerrar y registrar pedido
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:order-first"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Cabecera estilo PSP */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 text-white" style={{ backgroundColor: mpBlue }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/85">Checkout simulado</p>
            <h2 className="text-xl font-bold leading-tight">Pagar compra</h2>
            <p className="mt-1 max-w-[320px] text-xs text-white/90">
              Modo de prueba: no se realiza ningún cobro real; sirve para completar tu pedido de demostración.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-lg leading-none text-white hover:bg-white/25 disabled:opacity-40"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="border-b border-gray-100 bg-amber-50 px-5 py-2 text-center text-xs font-medium text-amber-900">
          Simulador: ningún cargo real. Tu pedido se confirma solo al terminar los pasos en pantalla.
        </div>

        <form onSubmit={handlePayment} className="p-5 sm:p-6">
          <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total a pagar</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">S/ {totalNum.toFixed(2)}</p>
            <p className="mt-1 text-xs text-gray-500">Sin IGV incluido (según tu política actual).</p>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-gray-800">¿Cómo quieres pagar?</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "efectivo", label: "Efectivo" },
                { id: "yape", label: "Yape" },
                { id: "plin", label: "Plin" },
                { id: "transferencia", label: "Transferencia" },
                { id: "tarjeta", label: "Tarjeta" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMethodChange(m.id)}
                  disabled={busy}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    paymentMethod === m.id
                      ? "bg-gray-900 text-white shadow"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  } disabled:opacity-50`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "tarjeta" && (
            <div className="mb-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-block h-4 w-4 rounded border border-gray-300" aria-hidden />
                Pago con tarjeta de prueba (no se guarda el número completo).
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Titular de la tarjeta</label>
                <input
                  type="text"
                  autoComplete="cc-name"
                  placeholder="Como figura en la tarjeta"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Número de tarjeta</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="0000 0000 0000 0000"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm tracking-wide outline-none ring-emerald-500/30 focus:ring-2"
                  value={formatPanDisplay(cardNumber)}
                  onChange={(e) => setCardNumber(formatPanDisplay(e.target.value))}
                />
                <p className="mt-1 text-[11px] leading-snug text-gray-500">
                  Prueba: número válido Luhn (p. ej. <span className="font-mono">4242 4242 4242 4242</span>) y CVV distinto
                  de <span className="font-mono">999</span> para aprobar. CVV <span className="font-mono">999</span> simula
                  rechazo del banco.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Vencimiento</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/AA"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm outline-none ring-emerald-500/30 focus:ring-2"
                    value={cardExpiry}
                    onChange={(e) => {
                      let v = onlyDigits(e.target.value).slice(0, 4);
                      if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                      setCardExpiry(v);
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">CVV</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="•••"
                    maxLength={4}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm outline-none ring-emerald-500/30 focus:ring-2"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(onlyDigits(e.target.value).slice(0, 4))}
                  />
                </div>
              </div>
            </div>
          )}

          {(paymentMethod === "yape" || paymentMethod === "plin") && (
            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center text-sm text-gray-700">
              <p>
                Paga al número: <strong>966 142 980</strong>
              </p>
              <p className="mt-1 text-xs text-gray-500">Referencia: tu correo. Luego confirma el pedido aquí (simulación).</p>
            </div>
          )}

          {paymentMethod === "transferencia" && (
            <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-center text-sm text-gray-700">
              <p>
                Banco: <strong>BCP</strong> — Cuenta: <strong>123-456-7890</strong>
              </p>
              <p className="mt-1 text-xs text-gray-500">Envía el comprobante por WhatsApp al 966 142 980</p>
            </div>
          )}

          {paymentMethod === "efectivo" && (
            <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center text-sm text-gray-700">
              Pagarás en efectivo al momento de la entrega. Esta pantalla solo registra la intención de pago (simulador).
            </div>
          )}

          {fieldError && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{fieldError}</div>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{ backgroundColor: busy ? "#94a3b8" : mpBlue }}
              className="flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:cursor-not-allowed"
            >
              {busy ? "Procesando…" : `Pagar S/ ${totalNum.toFixed(2)}`}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default PaymentGateway;
