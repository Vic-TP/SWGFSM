// src/components/PaymentGateway.js
// Integración real con Mercado Pago Checkout API.
// Para tarjeta: usamos mp.createCardToken() (sin cardForm, evitamos conflictos de contexto).
// Yape: integración real con Mercado Pago — mp.yape({ otp, phoneNumber }).
// Plin, Efectivo y Transferencia: flujo simulado (sin PSP).
//
// Variables de entorno necesarias en el frontend (.env):
//   REACT_APP_MP_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//
// El ACCESS_TOKEN de MP va SOLO en el backend (.env del servidor).

import React, { useEffect, useRef, useState, useMemo } from "react";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { apiCall, getCurrentUser } from "../utils/apiCall";
import {
  horariosEntregaDisponibles,
  validarEntregaAgendada,
  primeraFechaEntregaDisponible,
  formatFechaLarga,
} from "../utils/entregaHorario";
import CalendarioEntrega from "./CalendarioEntrega";

// ---------------------------------------------------------------------------
// Helper: pago simulado (efectivo, Plin, transferencia)
// ---------------------------------------------------------------------------

async function runSimulatedPayment({ method, total, deliveryPayload }) {
  try {
    const data = await apiCall("/pagos/pago-simulado", {
      method: "POST",
      redirectOn401: false,
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
      simulated: true,
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
  const [fechaEntrega, setFechaEntrega] = useState(primeraFechaEntregaDisponible);
  const horariosDisponibles = useMemo(
    () => horariosEntregaDisponibles(fechaEntrega),
    [fechaEntrega],
  );
  const [horarioEntrega, setHorarioEntrega] = useState("");

  // ── Método de pago ───────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

  // ── Estado general ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState("form"); // form | processing | result
  const [result, setResult] = useState(null);
  const [fieldError, setFieldError] = useState("");

  // ── Mercado Pago ─────────────────────────────────────────────────────────
  const [sdkReady, setSdkReady] = useState(false);
  const mpRef = useRef(null);

  // ── Tarjeta: campos del formulario ─────────────────────────────────────────
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardEmail, setCardEmail] = useState("");
  const [cardDocType, setCardDocType] = useState("DNI");
  const [cardDocNum, setCardDocNum] = useState("");
  const [issuerId, setIssuerId] = useState("");
  const [cardIssuers, setCardIssuers] = useState([]);

  // ── Yape ───────────────────────────────────────────────────────────────────
  const [yapePhone, setYapePhone] = useState("");
  const [yapeOtp, setYapeOtp] = useState("");

  const mpPublicKey = process.env.REACT_APP_MP_PUBLIC_KEY;
  const mpEnabled = Boolean(mpPublicKey && sdkReady);

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
        const data = await apiCall("/entrega/config", {
          method: "GET",
          redirectOn401: false,
        });
        if (!data) throw new Error("config");
        if (!cancelled) {
          setEntregaConfig(data);
          const list = data?.estacionesMetropolitano || [];
          if (list.length > 0) setEstacionId(String(list[0]._id));
        }
      } catch {
        if (!cancelled)
          setEntregaConfig({
            tienda: {
              direccion: "AV. CAQUETA 800 INT. 15 TREBOL DE CAQUETA",
            },
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

  useEffect(() => {
    if (!horariosDisponibles.length) {
      setHorarioEntrega("");
      return;
    }
    if (!horariosDisponibles.some((h) => h.value === horarioEntrega)) {
      setHorarioEntrega(horariosDisponibles[0].value);
    }
  }, [horariosDisponibles, horarioEntrega]);

  // ── Inicializa Mercado Pago (UNA VEZ) ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const publicKey = process.env.REACT_APP_MP_PUBLIC_KEY;
      if (!publicKey) {
        if (!cancelled) {
          setFieldError(
            "Mercado Pago no está configurado (falta REACT_APP_MP_PUBLIC_KEY en frontend/.env). Efectivo sigue disponible.",
          );
        }
        return;
      }
      try {
        await loadMercadoPago();
        if (cancelled) return;
        mpRef.current = new window.MercadoPago(publicKey, {
          locale: "es-PE",
        });
        if (!cancelled) setSdkReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error("Error al cargar Mercado Pago SDK:", err);
          setFieldError("Error al cargar Mercado Pago. Recarga la página.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Helpers de entrega ───────────────────────────────────────────────────
  const estaciones = entregaConfig?.estacionesMetropolitano || [];
  const estacionSel = estaciones.find(
    (e) => String(e._id) === String(estacionId),
  );

  const buildDeliveryPayload = () => ({
    ...(() => {
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
          entregaConfig?.tienda?.direccion ||
          "AV. CAQUETA 800 INT. 15 TREBOL DE CAQUETA",
      };
    })(),
    fechaEntrega,
    horarioEntrega,
  });

  const validarFormularioEntrega = () => {
    if (tipoEntrega === "metropolitano") {
      if (!estaciones.length) {
        setFieldError("No hay estaciones Metropolitano disponibles. Elige recojo en tienda.");
        return false;
      }
      if (!estacionId) {
        setFieldError("Selecciona la estación del Metropolitano.");
        return false;
      }
    }
    const valAgenda = validarEntregaAgendada(fechaEntrega, horarioEntrega);
    if (!valAgenda.ok) {
      setFieldError(valAgenda.message);
      return false;
    }
    if (!horariosDisponibles.length) {
      setFieldError(
        "No hay horarios disponibles hoy. Elige otra fecha (lun–sáb, 6:00 a.m.–4:00 p.m.).",
      );
      return false;
    }
    return true;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleMethodChange = (method) => {
    if ((method === "tarjeta" || method === "yape") && !mpEnabled) {
      setFieldError(
        "Tarjeta y Yape requieren Mercado Pago configurado. Usa efectivo o contacta al administrador.",
      );
      return;
    }
    setPaymentMethod(method);
    setFieldError("");
    if (onMethodSelect) onMethodSelect(method);
  };

  // ── Obtener bancos emisores según BIN (proxy vía backend con access token) ──
  useEffect(() => {
    const raw = cardNumber.replace(/\s/g, "");
    if (raw.length < 6) { setCardIssuers([]); return; }
    const bin = raw.slice(0, 6);
    const pm = detectCardNetwork(raw);
    let cancelled = false;
    (async () => {
      try {
        const data = await apiCall(
          `/pagos/issuers?payment_method_id=${pm}&bin=${bin}`,
          { method: "GET", redirectOn401: false },
        );
        if (cancelled || !Array.isArray(data)) return;
        setCardIssuers(data);
        if (data.length === 1) setIssuerId(String(data[0].id));
      } catch {
        if (!cancelled) setCardIssuers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [cardNumber]);

  // ── Tarjeta: crear token y procesar pago ────────────────────────────────
  const handleCardPayment = async () => {
    const mp = mpRef.current;
    if (!mp) {
      setFieldError("Mercado Pago no está disponible. Recarga la página.");
      return;
    }

    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim() || !cardName.trim() || !cardEmail.trim() || !cardDocNum.trim()) {
      setFieldError("Completa todos los campos de la tarjeta.");
      return;
    }

    const [month, year] = cardExpiry.split("/").map((s) => s.trim());
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      setFieldError("Formato de vencimiento inválido (MM/AA).");
      return;
    }

    setPhase("processing");
    setFieldError("");

    try {
      const cardToken = await mp.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardExpirationMonth: month,
        cardExpirationYear: "20" + year,
        securityCode: cardCvv,
        cardholderName: cardName,
        identificationType: cardDocType,
        identificationNumber: cardDocNum,
      });

      if (!cardToken?.id) {
        setResult({ ok: false, message: "No se pudo generar el token de la tarjeta." });
        setPhase("result");
        return;
      }

      const data = await apiCall("/pagos/create_preference", {
        method: "POST",
        redirectOn401: false,
        body: JSON.stringify({
          token: cardToken.id,
          issuer_id: issuerId || undefined,
          payment_method_id: detectCardNetwork(cardNumber),
          transaction_amount: totalNum,
          installments: 1,
          description: "Compra en Frutería",
          payer: {
            email: cardEmail,
            identification: {
              type: cardDocType,
              number: cardDocNum,
            },
          },
        }),
      });

      if (!data) {
        setResult({ ok: false, message: "Error al conectar con el servidor." });
      } else if (data.status === "approved") {
        setResult({
          ok: true,
          operationId: String(data.id),
          message: `Pago de S/ ${totalNum.toFixed(2)} aprobado correctamente.`,
          mpStatus: data.status,
          mpDetail: data.status_detail,
        });
      } else if (data.status === "pending" || data.status === "in_process") {
        setResult({
          ok: false,
          message: "El pago está en proceso. Recibirás una notificación cuando se confirme.",
        });
      } else {
        setResult({
          ok: false,
          message: data.message || "El pago fue rechazado. Intenta con otra tarjeta o método de pago.",
        });
      }
    } catch (err) {
      console.error("Error al procesar tarjeta:", err);
      setResult({
        ok: false,
        message: err.message || "Error al procesar el pago con tarjeta.",
      });
    } finally {
      setPhase("result");
    }
  };

  // ── Yape: generar token con phone+OTP y crear pago ──────────────────────
  const handleYapePayment = async () => {
    if (tipoEntrega === "metropolitano" && !estacionId) {
      setFieldError("Selecciona la estación del Metropolitano.");
      return;
    }

    const phone = yapePhone.trim();
    const otp = yapeOtp.trim();

    if (!phone || phone.length < 9) {
      setFieldError("Ingresa un número de teléfono válido (mín. 9 dígitos).");
      return;
    }
    if (!otp || otp.length !== 6) {
      setFieldError("El código OTP debe tener 6 dígitos.");
      return;
    }

    const user = getCurrentUser();
    const email = user?.correo || user?.email || "";

    if (!email) {
      setFieldError("Necesitamos tu correo electrónico para procesar el pago.");
      return;
    }

    setPhase("processing");
    setFieldError("");

    try {
      const mp = mpRef.current;
      if (!mp) {
        setResult({ ok: false, message: "Mercado Pago no está disponible. Recarga la página." });
        setPhase("result");
        return;
      }

      const yape = mp.yape({ otp, phoneNumber: phone });
      const tokenResponse = await yape.create();

      if (!tokenResponse?.id) {
        setResult({ ok: false, message: "No se pudo generar el token Yape. Verifica tu OTP." });
        setPhase("result");
        return;
      }

      const data = await apiCall("/pagos/create_yape", {
        method: "POST",
        redirectOn401: false,
        body: JSON.stringify({
          token: tokenResponse.id,
          transaction_amount: totalNum,
          description: "Compra en Frutería",
          payer: { email },
        }),
      });

      if (data?.status === "approved") {
        setResult({
          ok: true,
          operationId: String(data.id),
          message: `Pago Yape de S/ ${totalNum.toFixed(2)} aprobado correctamente.`,
          mpStatus: data.status,
          mpDetail: data.status_detail,
        });
      } else if (data?.status === "pending" || data?.status === "in_process") {
        setResult({
          ok: false,
          message: "El pago Yape está en proceso. Recibirás una notificación cuando se confirme.",
        });
      } else {
        setResult({
          ok: false,
          message: data?.message || "El pago Yape fue rechazado. Intenta de nuevo.",
        });
      }
    } catch (err) {
      setResult({
        ok: false,
        message: err.message || "Error al procesar el pago Yape.",
      });
    } finally {
      setPhase("result");
    }
  };

  // ── Submit del formulario ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError("");

    if (!validarFormularioEntrega()) return;

    if (tipoEntrega === "metropolitano") {
      if (!estaciones.length) {
        setFieldError("No hay estaciones Metropolitano disponibles. Elige recojo en tienda.");
        return;
      }
      if (!estacionId) {
        setFieldError("Selecciona la estación del Metropolitano.");
        return;
      }
    }

    if (paymentMethod === "yape") {
      if (!mpEnabled) {
        setFieldError("Yape no está disponible. Configura Mercado Pago o usa efectivo.");
        return;
      }
      await handleYapePayment();
    } else if (paymentMethod === "tarjeta") {
      if (!mpEnabled) {
        setFieldError("Tarjeta no está disponible. Configura Mercado Pago o usa efectivo.");
        return;
      }
      await handleCardPayment();
    } else {
      setPhase("processing");
      const res = await runSimulatedPayment({
        method: paymentMethod,
        total: totalNum,
        deliveryPayload: buildDeliveryPayload(),
      });
      setResult(res);
      setPhase("result");
    }
  };

  const finishSuccessAndClose = async () => {
    try {
      if (typeof onSuccess === "function")
        await Promise.resolve(
          onSuccess({
            ...buildDeliveryPayload(),
            metodoPago: paymentMethod,
          }),
        );
    } finally {
      onCancel();
    }
  };

  const handleClose = () => {
    setYapePhone("");
    setYapeOtp("");
    setIssuerId("");
    setCardIssuers([]);
    onCancel();
  };

  const resetToForm = () => {
    setPhase("form");
    setResult(null);
    setYapePhone("");
    setYapeOtp("");
    setIssuerId("");
    setCardIssuers([]);
    setFieldError("");
  };

  // ── Helpers de formato ─────────────────────────────────────────────────
  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const detectCardNetwork = (num) => {
    const n = num.replace(/\s/g, "");
    if (n.startsWith("4")) return "visa";
    if (n.startsWith("5")) return "master";
    if (n.startsWith("3")) return "amex";
    return "visa";
  };

  const isTarjeta = paymentMethod === "tarjeta";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
      <div className={`w-full ${phase === "result" ? "max-w-md" : "max-w-lg"} overflow-hidden rounded-2xl bg-white shadow-2xl`}>

        {/* ── Vista: resultado ── */}
        {phase === "result" && result && (
          <div role="dialog" aria-labelledby="mp-result-title">
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
              {result.ok && !result.simulated && (
                <p className="mt-1 text-sm text-white/90">Procesado con Mercado Pago</p>
              )}
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700">{result.message}</p>

              {result.ok && result.operationId && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                  <span className="text-gray-500">ID de operación</span>
                  <p className="mt-1 font-mono font-semibold text-gray-900 break-all">{result.operationId}</p>
                  {result.mpDetail && (
                    <p className="mt-1 text-xs text-gray-500">Detalle: <span className="font-mono">{result.mpDetail}</span></p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                {!result.ok && (
                  <button type="button" onClick={resetToForm}
                    className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
                    Intentar de nuevo
                  </button>
                )}
                {result.ok ? (
                  <button type="button" onClick={finishSuccessAndClose}
                    className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
                    Cerrar y registrar pedido
                  </button>
                ) : (
                  <button type="button" onClick={handleClose}
                    className="flex-1 rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:order-first">
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Formulario y Cabecera ── */}
        <div className={phase === "result" ? "hidden" : ""}>
          <div className="flex items-start justify-between gap-3 px-5 py-4 text-white" style={{ backgroundColor: brandDark }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Mercado Pago</p>
              <h2 className="text-xl font-bold leading-tight">Pagar compra</h2>
            </div>
            <button type="button" onClick={handleClose} disabled={busy}
              className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-lg leading-none text-white hover:bg-white/25 disabled:opacity-40" aria-label="Cerrar">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto max-h-[80vh]">

            <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total a pagar</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">S/ {totalNum.toFixed(2)}</p>
            </div>

            {/* Entrega */}
            <div className="mb-5 rounded-2xl border border-[#d4e9e2] bg-[#eef7f3]/60 p-4">
              <label className="mb-3 block text-sm font-semibold text-[#1e3932]">¿Cómo quieres recibir tu pedido?</label>
              {entregaLoading ? (
                <p className="text-sm text-gray-500">Cargando opciones de entrega…</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" disabled={busy} onClick={() => setTipoEntrega("tienda")}
                      className={`flex-1 rounded-2xl border-2 px-4 py-3 text-left text-sm transition ${tipoEntrega === "tienda" ? "border-[#006241] bg-white shadow-sm" : "border-gray-200 bg-white/80 hover:border-[#006241]/40"}`}>
                      <span className="block font-bold text-[#1e3932]">Recojo en tienda</span>
                      <span className="mt-1 block text-xs text-gray-600 leading-snug">{entregaConfig?.tienda?.direccion || "AV. CAQUETA 800 INT. 15 TREBOL DE CAQUETA"}</span>
                    </button>
                    <button type="button" disabled={busy || estaciones.length === 0} onClick={() => setTipoEntrega("metropolitano")}
                      className={`flex-1 rounded-2xl border-2 px-4 py-3 text-left text-sm transition disabled:opacity-50 ${tipoEntrega === "metropolitano" ? "border-[#006241] bg-white shadow-sm" : "border-gray-200 bg-white/80 hover:border-[#006241]/40"}`}>
                      <span className="block font-bold text-[#1e3932]">Entrega Metropolitano</span>
                      <span className="mt-1 block text-xs text-gray-600 leading-snug">Solo en estaciones habilitadas</span>
                    </button>
                  </div>

                  {tipoEntrega === "metropolitano" && estaciones.length > 0 && (
                    <div className="mt-4">
                      <label htmlFor="estacion-metro" className="mb-1 block text-xs font-semibold text-[#1e3932]">Estación de entrega</label>
                      <select id="estacion-metro" value={estacionId} onChange={(e) => setEstacionId(e.target.value)} disabled={busy}
                        className="w-full rounded-xl border border-[#d4e9e2] bg-white px-3 py-2.5 text-sm text-[#1e3932] focus:outline-none focus:ring-2 focus:ring-[#006241]/35">
                        {estaciones.map((e) => (
                          <option key={e._id} value={e._id}>{e.nombre} — {e.linea}</option>
                        ))}
                      </select>
                      {estacionSel?.referencia && (
                        <p className="mt-2 text-xs text-gray-600"><span className="font-semibold text-[#006241]">Punto de encuentro:</span> {estacionSel.referencia}</p>
                      )}
                    </div>
                  )}

                  {tipoEntrega === "metropolitano" && estaciones.length === 0 && (
                    <p className="mt-3 text-xs text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      Por ahora no hay estaciones Metropolitano activas. Elige recojo en tienda.
                    </p>
                  )}

                  <div className="mt-4 rounded-xl border border-[#d4e9e2] bg-white/90 p-3">
                    <p className="mb-2 text-xs font-semibold text-[#1e3932]">
                      Fecha y horario de entrega
                    </p>
                    <p className="mb-3 text-[11px] text-gray-600 leading-snug">
                      De lunes a sábado, de 6:00 a.m. a 4:00 p.m. (domingos no disponibles)
                    </p>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-medium text-gray-600">Fecha</p>
                        <CalendarioEntrega
                          value={fechaEntrega}
                          onChange={setFechaEntrega}
                          disabled={busy}
                        />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-gray-600">Horario</p>
                        {horariosDisponibles.length === 0 ? (
                          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-800">
                            No hay horarios para esta fecha. Elige otro día en el calendario.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {horariosDisponibles.map((h) => (
                              <button
                                key={h.value}
                                type="button"
                                disabled={busy}
                                onClick={() => setHorarioEntrega(h.value)}
                                className={`rounded-xl border-2 px-2 py-2.5 text-xs font-semibold transition ${
                                  horarioEntrega === h.value
                                    ? "border-[#006241] bg-[#006241] text-white shadow-sm"
                                    : "border-gray-200 bg-white text-gray-700 hover:border-[#006241]/40"
                                }`}
                              >
                                {h.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {fechaEntrega && horarioEntrega && (
                          <p className="mt-3 rounded-lg bg-[#eef7f3] px-3 py-2 text-xs text-[#1e3932]">
                            <span className="font-semibold">Programado:</span>{" "}
                            {formatFechaLarga(fechaEntrega)}, {horariosDisponibles.find((x) => x.value === horarioEntrega)?.label || horarioEntrega}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Selector de método de pago */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-800">¿Cómo quieres pagar?</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "efectivo", label: "Efectivo", needsMp: false },
                  { id: "yape", label: "Yape", needsMp: true },
                  { id: "tarjeta", label: "Tarjeta", needsMp: true },
                ].map((m) => (
                  <button key={m.id} type="button" onClick={() => handleMethodChange(m.id)}
                    disabled={busy || (m.needsMp && !mpEnabled)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${paymentMethod === m.id ? "bg-gray-900 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} disabled:opacity-50`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tarjeta: formulario manual → createCardToken ── */}
            {isTarjeta && (
              <div className="mb-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                {!sdkReady && (
                  <p className="text-xs text-gray-400 animate-pulse">Cargando Mercado Pago…</p>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Número de tarjeta</label>
                  <input type="text" inputMode="numeric" value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456" maxLength={19} disabled={busy}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Vencimiento</label>
                    <input type="text" inputMode="numeric" value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/AA" maxLength={5} disabled={busy}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">CVV</label>
                    <input type="text" inputMode="numeric" value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123" maxLength={4} disabled={busy}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Titular de la tarjeta</label>
                  <input type="text" value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Como figura en la tarjeta" disabled={busy}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Correo electrónico</label>
                  <input type="email" value={cardEmail}
                    onChange={(e) => setCardEmail(e.target.value)}
                    placeholder="Para el comprobante" disabled={busy}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Tipo de documento</label>
                    <select value={cardDocType} onChange={(e) => setCardDocType(e.target.value)} disabled={busy}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2">
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné de Extranjería</option>
                      <option value="RUC">RUC</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">N° de documento</label>
                    <input type="text" inputMode="numeric" value={cardDocNum}
                      onChange={(e) => setCardDocNum(e.target.value.replace(/\D/g, "").slice(0, 15))}
                      placeholder="Número" disabled={busy}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Banco emisor</label>
                    <select value={issuerId} onChange={(e) => setIssuerId(e.target.value)} disabled={busy}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2">
                      <option value="">{cardIssuers.length ? "Seleccionar banco" : "Ingrese número de tarjeta"}</option>
                      {cardIssuers.map((i) => (
                        <option key={i.id} value={String(i.id)}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 leading-snug">
                  🔒 Tus datos de tarjeta son cifrados por Mercado Pago y nunca pasan por nuestros servidores.
                </p>
              </div>
            )}

            {/* ── Yape ── */}
            {paymentMethod === "yape" && (
              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">
                <p className="mb-3 text-center">Paga con Yape ingresando tu número y el código OTP de la app.</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Número de celular</label>
                    <input type="tel" inputMode="numeric" value={yapePhone}
                      onChange={(e) => setYapePhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="999 888 777" maxLength={9} disabled={busy}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Código OTP (de la app Yape)</label>
                    <input type="text" inputMode="numeric" value={yapeOtp}
                      onChange={(e) => setYapeOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456" maxLength={6} disabled={busy}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:ring-2" />
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <strong>Datos de prueba:</strong> Teléfono <strong>111111111</strong>, OTP <strong>123456</strong>
                </div>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Tu correo: <strong>{(getCurrentUser()?.correo || getCurrentUser()?.email || "—")}</strong>
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

            {fieldError && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{fieldError}</div>
            )}

            <div className="mt-2 flex gap-3">
              <button type="button" onClick={handleClose} disabled={busy}
                className="flex-1 rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={busy}
                style={{ backgroundColor: busy ? "#94a3b8" : brandGreen }}
                className="flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:cursor-not-allowed">
                {busy ? "Procesando…" : `Pagar S/ ${totalNum.toFixed(2)}`}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
