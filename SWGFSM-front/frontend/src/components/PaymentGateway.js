// src/components/PaymentGateway.js

import React, { useState } from "react";

const PaymentGateway = ({ total, onSuccess, onCancel, onMethodSelect }) => {
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const totalSinIGV = total;

  const handleMethodChange = (method) => {
    setPaymentMethod(method);
    if (onMethodSelect) {
      onMethodSelect(method);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    // Validar tarjeta si es el método seleccionado
    if (paymentMethod === "card") {
      if (!cardNumber || !cardExpiry || !cardCvv) {
        alert("Completa todos los datos de la tarjeta");
        return;
      }
    }
    
    setIsProcessing(true);

    // Simulación de procesamiento de pago
    setTimeout(() => {
      setIsProcessing(false);
      alert(`Pago de S/ ${totalSinIGV.toFixed(2)} procesado exitosamente.`);
      onSuccess();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-emerald-900">Pasarela de Pago</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">
            &times;
          </button>
        </div>

        <div className="mb-4 p-4 bg-lime-50 rounded-xl">
          <p className="text-sm text-gray-500">Total a pagar</p>
          <p className="text-2xl font-bold text-emerald-900">S/ {totalSinIGV.toFixed(2)}</p>
          <p className="text-xs text-gray-400">Sin IGV incluido</p>
        </div>

        <form onSubmit={handlePayment}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleMethodChange("efectivo")}
                className={`py-2 rounded-xl text-sm font-semibold transition ${
                  paymentMethod === "efectivo"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => handleMethodChange("yape")}
                className={`py-2 rounded-xl text-sm font-semibold transition ${
                  paymentMethod === "yape"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Yape
              </button>
              <button
                type="button"
                onClick={() => handleMethodChange("plin")}
                className={`py-2 rounded-xl text-sm font-semibold transition ${
                  paymentMethod === "plin"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Plin
              </button>
              <button
                type="button"
                onClick={() => handleMethodChange("transferencia")}
                className={`py-2 rounded-xl text-sm font-semibold transition ${
                  paymentMethod === "transferencia"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Transferencia
              </button>
              <button
                type="button"
                onClick={() => handleMethodChange("tarjeta")}
                className={`py-2 rounded-xl text-sm font-semibold transition ${
                  paymentMethod === "tarjeta"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Tarjeta
              </button>
            </div>
          </div>

          {paymentMethod === "tarjeta" && (
            <>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Número de tarjeta
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha expiración
                  </label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {(paymentMethod === "yape" || paymentMethod === "plin") && (
            <div className="mb-4 p-3 bg-blue-50 rounded-xl text-center">
              <p className="text-sm text-gray-600">
                Paga al número: <strong>966 142 980</strong>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Referencia: Tu correo electrónico
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Después de pagar, confirma el pedido
              </p>
            </div>
          )}

          {paymentMethod === "transferencia" && (
            <div className="mb-4 p-3 bg-purple-50 rounded-xl text-center">
              <p className="text-sm text-gray-600">
                Banco: <strong>BCP</strong>
              </p>
              <p className="text-sm text-gray-600">
                Cuenta: <strong>123-456-7890</strong>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Envía el comprobante por WhatsApp al 966 142 980
              </p>
            </div>
          )}

          {paymentMethod === "efectivo" && (
            <div className="mb-4 p-3 bg-green-50 rounded-xl text-center">
              <p className="text-sm text-gray-600">
                Pagas en efectivo al momento de la entrega
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded-full border border-gray-300 text-gray-600 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 py-2 rounded-full bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
            >
              {isProcessing ? "Procesando..." : `Pagar S/ ${totalSinIGV.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentGateway;