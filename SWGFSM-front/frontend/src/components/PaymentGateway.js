// src/components/PaymentGateway.js
// Integración real con Mercado Pago Checkout API via CardForm (MercadoPago.js v2).
// Para tarjeta: el SDK genera un token seguro; el número real NUNCA llega al backend.
// Para efectivo, Yape, Plin y transferencia: flujo simulado propio (sin PSP).
//
// Variables de entorno necesarias en el frontend (.env):
//   REACT_APP_MP_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//
// El ACCESS_TOKEN de MP va SOLO en el backend (.env del servidor).

import React, { useEffect, useRef, useState } from "react";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { apiCall } from "../utils/apiCall"; // ✅ auth JWT centralizado

// ---------------------------------------------------------------------------
// Helper: pago simulado (efectivo, Yape, Plin, transferencia)
// ---------------------------------------------------------------------------

async function runSimulatedPayment({ method, total, deliveryPayload }) {
  try {
    const data = await apiCall("/pagos/pago-simulado", {
      method: "POST",
      body: JSON.stringify({
        method,
        total: Number(total),
        ...deliveryPayload,
      }),
    });

    if (!data || !data.ok) {
      return {
        ok: false,
        code: data?.code || "DECLINED",
        message: data?.message || "Pago rechazado.",
      };
    }

    return {
      ok: true,
      operationId: data.operationId,
      message:
        data.message ||
        `Intención de pago de S/ ${Number(total).toFixed(2)} registrada.`,
      serverAt: data.serverAt,
    };
  } catch (err) {
    return {
      ok: false,
      code: "BACKEND_UNAVAILABLE",
      message: err.message || "No se pudo conectar con el servidor.",
    };
  }
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

const PaymentGateway = ({ total, onSuccess, onCancel, onMethodSelect }) => {
  // ── Entrega ──────────────────────────────────────────────────────────────
  const [tipoEntrega, setTipoEntrega] = useState("tienda");
  const [estacionId, setEstacionId] = useState("");
  const [entregaConfig, setEntregaConfig] = useState(null);
  const [entregaLoading, setEntregaLoading] = useState(true);

  // ── Método de pago ───────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

  // ── Estado general ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState("form"); // form | processing | result
  const [result, setResult] = useState(null);
  const [fieldError, setFieldError] = useState("");

  // ── Mercado Pago CardForm ─────────────────────────────────────────────────
  const [mpReady, setMpReady] = useState(false);
  const cardFormRef = useRef(null);
  const mpInstanceRef = useRef(null);

  const busy = phase === "processing";
  const totalNum = Number(total) || 0;
  const brandGreen = "#006241";
  const brandDark = "#1e3932";

  // ── Carga configuración de entrega ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEntregaLoading(true);
      try {
        // ✅ Usa apiCall en lugar de fetch manual
        const data = await apiCall("/entrega/config", { method: "GET" });
        if (!data) throw new Error("config");
        if (!cancelled) {
          setEntregaConfig(data);
          const list = data?.estacionesMetropolitano || [];
          if (list.length > 0) setEstacionId(String(list[0]._id));
        }
      } catch {
        if (!cancelled)
          setEntregaConfig({
            tienda: { direccion: "Av. Mercado Caqueta N° 800, RIMAC" },
            estacionesMetropolitano: [],
          });
      } finally {
        if (!cancelled) setEntregaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Inicializa CardForm de Mercado Pago cuando se elige "tarjeta" ─────────
  useEffect(() => {
    if (paymentMethod !== "tarjeta") {
      if (cardFormRef.current) {
        try {
          cardFormRef.current.unmount();
        } catch (_) {}
        cardFormRef.current = null;
      }
      setMpReady(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadMercadoPago();
        if (cancelled) return;

        const mp = new window.MercadoPago("TEST-b4f18c1d-92b2-4ed8-b2ed-7d2845d1b581", {
          locale: "es-PE",
        });
        mpInstanceRef.current = mp;

        const cardForm = mp.cardForm({
          amount: String(totalNum.toFixed(2)),
          iframe: true,
          form: {
            id: "mp-form-checkout",
            cardNumber: {
              id: "mp-form-checkout__cardNumber",
              placeholder: "Número de tarjeta",
            },
            expirationDate: {
              id: "mp-form-checkout__expirationDate",
              placeholder: "MM/AA",
            },
            securityCode: {
              id: "mp-form-checkout__securityCode",
              placeholder: "CVV",
            },
            cardholderName: {
              id: "mp-form-checkout__cardholderName",
              placeholder: "Como figura en la tarjeta",
            },
            issuer: {
              id: "mp-form-checkout__issuer",
              placeholder: "Banco emisor",
            },
            installments: {
              id: "mp-form-checkout__installments",
              placeholder: "Cuotas",    
            },
            identificationType: {
              id: "mp-form-checkout__identificationType",
              placeholder: "Tipo de documento",
            },
            identificationNumber: {
              id: "mp-form-checkout__identificationNumber",
              placeholder: "Número de documento",
            },
            cardholderEmail: {
              id: "mp-form-checkout__cardholderEmail",
              placeholder: "Correo electrónico",
            },
          },
          callbacks: {
            onFormMounted: (err) => {
              if (err) {
                console.warn("Error al montar CardForm:", err);
                setFieldError(
                  "No se pudo cargar el formulario de tarjeta. Recarga la página.",
                );
                return;
              }
              if (!cancelled) setMpReady(true);
            },

            onSubmit: async (event) => {
              event.preventDefault();
              if (cancelled) return;
              setFieldError("");
              setPhase("processing");

              const {
                paymentMethodId,
                issuerId,
                cardholderEmail,
                amount,
                token,
                installments,
                identificationNumber,
                identificationType,
              } = cardForm.getCardFormData();

              if (!token) {
                setFieldError(
                  "No se pudo obtener el token de la tarjeta. Verifica los datos e intenta de nuevo.",
                );
                setPhase("form");
                return;
              }

              try {
                // ✅ apiCall ya maneja JWT y parsea JSON — no hay "res", solo "data"
                const data = await apiCall("/pagos/create_preference", {
                  method: "POST",
                  body: JSON.stringify({
                    token,
                    issuer_id: issuerId,
                    payment_method_id: paymentMethodId,
                    transaction_amount: Number(amount),
                    installments: Number(installments),
                    description: "Compra en Frutería",
                    payer: {
                      email: cardholderEmail,
                      identification: {
                        type: identificationType,
                        number: identificationNumber,
                      },
                    },
                    deliveryPayload: buildDeliveryPayload(),
                  }),
                });

                // ✅ Corregido: solo evalúa "data", nunca "res"
                if (!data) {
                  setResult({
                    ok: false,
                    message: "Error al conectar con el servidor.",
                  });
                } else if (data.status === "approved") {
                  setResult({
                    ok: true,
                    operationId: String(data.id),
                    message: `Pago de S/ ${totalNum.toFixed(2)} aprobado correctamente.`,
                    mpStatus: data.status,
                    mpDetail: data.status_detail,
                  });
                } else if (
                  data.status === "pending" ||
                  data.status === "in_process"
                ) {
                  setResult({
                    ok: false,
                    message:
                      "El pago está en proceso. Recibirás una notificación cuando se confirme.",
                  });
                } else {
                  setResult({
                    ok: false,
                    message:
                      data.message ||
                      "El pago fue rechazado. Intenta con otra tarjeta o método de pago.",
                  });
                }
              } catch {
                setResult({
                  ok: false,
                  message:
                    "Error de conexión. Verifica tu red e intenta de nuevo.",
                });
              } finally {
                if (!cancelled) setPhase("result");
              }
            },

            onFetching: () => {
              return () => {};
            },

            onError: (errors) => {
              console.warn("CardForm errors:", errors);
            },
          },
        });

        if (!cancelled) cardFormRef.current = cardForm;
      } catch (err) {
        console.error("Error al inicializar Mercado Pago:", err);
        if (!cancelled)
          setFieldError(
            "Error al cargar el formulario de tarjeta. Recarga la página.",
          );
      }
    })();

    return () => {
      cancelled = true;
      if (cardFormRef.current) {
        try {
          cardFormRef.current.unmount();
        } catch (_) {}
        cardFormRef.current = null;
      }
      setMpReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, totalNum]);

  // ── Helpers de entrega ───────────────────────────────────────────────────
  const estaciones = entregaConfig?.estacionesMetropolitano || [];
  const estacionSel = estaciones.find(
    (e) => String(e._id) === String(estacionId),
  );

  const buildDeliveryPayload = () => {
    if (tipoEntrega === "metropolitano") {
      return {
        tipoEntrega: "METROPOLITANO",
        estacionMetropolitanoId: estacionId,
        estacionMetropolitanoNombre: estacionSel?.nombre,
        estacionMetropolitanoLinea: estacionSel?.linea,
        estacionReferencia: estacionSel?.referencia,
      };
    }
    return {
      tipoEntrega: "TIENDA",
      tiendaDireccion:
        entregaConfig?.tienda?.direccion || "Av. Mercado Caqueta N° 800, RIMAC",
    };
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleMethodChange = (method) => {
    setPaymentMethod(method);
    setFieldError("");
    if (onMethodSelect) onMethodSelect(method);
  };

  const handleNonCardPayment = async (e) => {
    e.preventDefault();
    setFieldError("");

    if (tipoEntrega === "metropolitano") {
      if (!estaciones.length) {
        setFieldError(
          "No hay estaciones Metropolitano disponibles. Elige recojo en tienda.",
        );
        return;
      }
      if (!estacionId) {
        setFieldError(
          "Selecciona la estación del Metropolitano donde recibirás tu pedido.",
        );
        return;
      }
    }

    setPhase("processing");
    const res = await runSimulatedPayment({
      method: paymentMethod,
      total: totalNum,
      deliveryPayload: buildDeliveryPayload(),
    });
    setResult(res);
    setPhase("result");
  };

  const finishSuccessAndClose = async () => {
    try {
      if (typeof onSuccess === "function")
        await Promise.resolve(onSuccess(buildDeliveryPayload()));
    } finally {
      onCancel();
    }
  };

  const resetToForm = () => {
    setPhase("form");
    setResult(null);
    setFieldError("");
  };

  // ── Vista: resultado ─────────────────────────────────────────────────────
  if (phase === "result" && result) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
        <div
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          role="dialog"
          aria-labelledby="mp-result-title"
        >
          <div
            className="px-5 py-4 text-white"
            style={{
              background: result.ok
                ? "linear-gradient(90deg,#059669,#047857)"
                : "linear-gradient(90deg,#dc2626,#b91c1c)",
            }}
          >
            <h2 id="mp-result-title" className="text-lg font-bold">
              {result.ok ? "✓ Pago aprobado" : "Pago no completado"}
            </h2>
            {result.ok && (
              <p className="mt-1 text-sm text-white/90">
                Procesado con Mercado Pago
              </p>
            )}
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-700">{result.message}</p>

            {result.ok && result.operationId && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <span className="text-gray-500">ID de operación</span>
                <p className="mt-1 font-mono font-semibold text-gray-900 break-all">
                  {result.operationId}
                </p>
                {result.mpDetail && (
                  <p className="mt-1 text-xs text-gray-500">
                    Detalle:{" "}
                    <span className="font-mono">{result.mpDetail}</span>
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

  // ── Vista: formulario ────────────────────────────────────────────────────
  const isTarjeta = paymentMethod === "tarjeta";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Cabecera */}
        <div
          className="flex items-start justify-between gap-3 px-5 py-4 text-white"
          style={{ backgroundColor: brandDark }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Mercado Pago
            </p>
            <h2 className="text-xl font-bold leading-tight">Pagar compra</h2>
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

        {/* Formulario */}
        <form
          id={isTarjeta ? "mp-form-checkout" : undefined}
          onSubmit={isTarjeta ? undefined : handleNonCardPayment}
          className="p-5 sm:p-6 overflow-y-auto max-h-[80vh]"
        >
          {/* Total */}
          <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total a pagar
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              S/ {totalNum.toFixed(2)}
            </p>
          </div>

          {/* Entrega */}
          <div className="mb-5 rounded-2xl border border-[#d4e9e2] bg-[#eef7f3]/60 p-4">
            <label className="mb-3 block text-sm font-semibold text-[#1e3932]">
              ¿Cómo quieres recibir tu pedido?
            </label>
            {entregaLoading ? (
              <p className="text-sm text-gray-500">
                Cargando opciones de entrega…
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setTipoEntrega("tienda")}
                    className={`flex-1 rounded-2xl border-2 px-4 py-3 text-left text-sm transition ${
                      tipoEntrega === "tienda"
                        ? "border-[#006241] bg-white shadow-sm"
                        : "border-gray-200 bg-white/80 hover:border-[#006241]/40"
                    }`}
                  >
                    <span className="block font-bold text-[#1e3932]">
                      Recojo en tienda
                    </span>
                    <span className="mt-1 block text-xs text-gray-600 leading-snug">
                      {entregaConfig?.tienda?.direccion ||
                        "Av. Mercado Caqueta N° 800, RIMAC"}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy || estaciones.length === 0}
                    onClick={() => setTipoEntrega("metropolitano")}
                    className={`flex-1 rounded-2xl border-2 px-4 py-3 text-left text-sm transition disabled:opacity-50 ${
                      tipoEntrega === "metropolitano"
                        ? "border-[#006241] bg-white shadow-sm"
                        : "border-gray-200 bg-white/80 hover:border-[#006241]/40"
                    }`}
                  >
                    <span className="block font-bold text-[#1e3932]">
                      Entrega Metropolitano
                    </span>
                    <span className="mt-1 block text-xs text-gray-600 leading-snug">
                      Solo en estaciones habilitadas por la frutería
                    </span>
                  </button>
                </div>

                {tipoEntrega === "metropolitano" && estaciones.length > 0 && (
                  <div className="mt-4">
                    <label
                      htmlFor="estacion-metro"
                      className="mb-1 block text-xs font-semibold text-[#1e3932]"
                    >
                      Estación de entrega
                    </label>
                    <select
                      id="estacion-metro"
                      value={estacionId}
                      onChange={(e) => setEstacionId(e.target.value)}
                      disabled={busy}
                      className="w-full rounded-xl border border-[#d4e9e2] bg-white px-3 py-2.5 text-sm text-[#1e3932] focus:outline-none focus:ring-2 focus:ring-[#006241]/35"
                    >
                      {estaciones.map((e) => (
                        <option key={e._id} value={e._id}>
                          {e.nombre} — {e.linea}
                        </option>
                      ))}
                    </select>
                    {estacionSel?.referencia && (
                      <p className="mt-2 text-xs text-gray-600">
                        <span className="font-semibold text-[#006241]">
                          Punto de encuentro:
                        </span>{" "}
                        {estacionSel.referencia}
                      </p>
                    )}
                  </div>
                )}

                {tipoEntrega === "metropolitano" && estaciones.length === 0 && (
                  <p className="mt-3 text-xs text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    Por ahora no hay estaciones Metropolitano activas. Elige
                    recojo en tienda.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Selector de método de pago */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              ¿Cómo quieres pagar?
            </label>
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

          {/* ── Sección tarjeta: CardForm de MP ── */}
          {isTarjeta && (
            <div className="mb-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              {!mpReady && (
                <p className="text-xs text-gray-400 animate-pulse">
                  Cargando formulario seguro de Mercado Pago…
                </p>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Número de tarjeta
                </label>
                <div
                  id="mp-form-checkout__cardNumber"
                  className="h-11 rounded-xl border border-gray-200 px-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Vencimiento
                  </label>
                  <div
                    id="mp-form-checkout__expirationDate"
                    className="h-11 rounded-xl border border-gray-200 px-3"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    CVV
                  </label>
                  <div
                    id="mp-form-checkout__securityCode"
                    className="h-11 rounded-xl border border-gray-200 px-3"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Titular de la tarjeta
                </label>
                <input
                  type="text"
                  id="mp-form-checkout__cardholderName"
                  autoComplete="cc-name"
                  placeholder="Como figura en la tarjeta"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="mp-form-checkout__cardholderEmail"
                  autoComplete="email"
                  placeholder="Para el comprobante"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Tipo de documento
                  </label>
                  <select
                    id="mp-form-checkout__identificationType"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    N° de documento
                  </label>
                  <input
                    type="text"
                    id="mp-form-checkout__identificationNumber"
                    inputMode="numeric"
                    placeholder="Número"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Banco emisor
                </label>
                <select
                  id="mp-form-checkout__issuer"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Cuotas
                </label>
                <select
                  id="mp-form-checkout__installments"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none"
                />
              </div>

              <p className="text-[11px] text-gray-400 leading-snug">
                🔒 Tus datos de tarjeta son cifrados por Mercado Pago y nunca
                pasan por nuestros servidores.
              </p>
            </div>
          )}

          {/* ── Yape / Plin ── */}
          {(paymentMethod === "yape" || paymentMethod === "plin") && (
            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center text-sm text-gray-700">
              <p>
                Paga al número: <strong>966 142 980</strong>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Referencia: tu correo. Luego confirma el pedido aquí.
              </p>
            </div>
          )}

          {/* ── Transferencia ── */}
          {paymentMethod === "transferencia" && (
            <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-center text-sm text-gray-700">
              <p>
                Banco: <strong>BCP</strong> — Cuenta:{" "}
                <strong>123-456-7890</strong>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Envía el comprobante por WhatsApp al 966 142 980
              </p>
            </div>
          )}

          {/* ── Efectivo ── */}
          {paymentMethod === "efectivo" && (
            <div className="mb-4 rounded-2xl border border-[#d4e9e2] bg-[#eef7f3]/80 p-4 text-center text-sm text-gray-700">
              {tipoEntrega === "metropolitano"
                ? "Pagarás en efectivo al recibir tu pedido en la estación Metropolitano indicada."
                : "Pagarás en efectivo al recoger en tienda."}
            </div>
          )}

          {/* Error de campo */}
          {fieldError && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {fieldError}
            </div>
          )}

          {/* Botones */}
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            {isTarjeta ? (
              <button
                type="submit"
                id="mp-form-checkout__submit"
                disabled={busy || !mpReady}
                style={{
                  backgroundColor: busy || !mpReady ? "#94a3b8" : brandGreen,
                }}
                className="flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:cursor-not-allowed"
              >
                {busy
                  ? "Procesando…"
                  : !mpReady
                    ? "Cargando…"
                    : `Pagar S/ ${totalNum.toFixed(2)}`}
              </button>
            ) : (
              <button
                type="submit"
                disabled={busy}
                style={{ backgroundColor: busy ? "#94a3b8" : brandGreen }}
                className="flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:cursor-not-allowed"
              >
                {busy ? "Procesando…" : `Confirmar S/ ${totalNum.toFixed(2)}`}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentGateway;