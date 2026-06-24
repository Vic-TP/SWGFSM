// src/components/CartSidebar.js

import React, { useMemo } from "react";
import { Toaster, toast } from "sonner";
import { descuentosUnicosActivos } from "../utils/descuentoOnline";

const qtyCarrito = (item) => Math.max(0, Math.floor(Number(item?.quantity)) || 0);

const precioLineaCarrito = (item) => {
  const p = Number(item?.price ?? item?.precioUnitario);
  return Number.isFinite(p) ? p : 0;
};

function resumenKgLineaCarrito(item) {
  if (item?.esBuckets && item.kgPorMadurez) {
    const k = item.kgPorMadurez;
    const partes = [];
    if (Math.floor(Number(k.verde) || 0) > 0) partes.push(`Verde ${Math.floor(k.verde)} kg`);
    if (Math.floor(Number(k.sazon) || 0) > 0) partes.push(`Sazón ${Math.floor(k.sazon)} kg`);
    if (Math.floor(Number(k.maduro) || 0) > 0) partes.push(`Maduro ${Math.floor(k.maduro)} kg`);
    if (partes.length) return partes.join(" · ");
  }
  return null;
}

const CartSidebar = ({
  isOpen,
  items,
  onClose,
  onCheckout,
  onRemoveItem,
  subtotal = 0,
  total = 0,
  descuentoAplicado = null,
  codigoDescuentoInput = "",
  onCodigoChange,
  onAplicarCodigo,
  onQuitarCodigo,
  productosCatalogo = [],
}) => {
  const descuentosDisponibles = useMemo(
    () => descuentosUnicosActivos(productosCatalogo),
    [productosCatalogo],
  );

  const descuentoAplicaAlCarrito = (grupo) => {
    for (const producto of grupo.productos || []) {
      const pid = String(producto._id);
      for (const item of items) {
        if (item.esPromocion || item.measure === "pack-promo") continue;
        if (String(item.productoId ?? item.id ?? "") !== pid) continue;
        if (item.esBuckets && item.kgPorMadurez) {
          if (Math.floor(Number(item.kgPorMadurez.maduro) || 0) > 0) return true;
        } else if (String(item.madurez || "").toLowerCase() === "maduro") {
          return true;
        }
      }
    }
    return false;
  };

  const usarCodigo = (codigo) => {
    if (descuentoAplicado?.ok) return;
    onCodigoChange?.(String(codigo || "").trim().toUpperCase());
  };

  if (!isOpen) return null;

  const handlePagarClick = () => {
    const logged = localStorage.getItem("cliente_logueado") === "true";
    if (!logged) {
      toast("Para poder realizar el pago debes iniciar sesión o crear una cuenta.", {
        action: {
          label: "Aceptar",
          onClick: () => (window.location.href = "/login"),
        },
      });
      return;
    }
    onCheckout();
  };

  const sub = Number(subtotal) || 0;
  const tot = Number(total) || 0;
  const desc = descuentoAplicado?.montoDescuento
    ? Number(descuentoAplicado.montoDescuento)
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex">
      <Toaster position="bottom-center" richColors success />
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Tu carrito</h2>
            {items.length > 0 && (
              <p className="text-xs text-gray-400">
                {items.reduce((a, i) => a + qtyCarrito(i), 0)} artículo(s)
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl"
          >
            &times;
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <svg
              className="w-16 h-16 text-gray-200 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 21h6"
              />
            </svg>
            <p className="text-gray-400 text-base font-medium">Tu carrito está vacío</p>
            <p className="text-gray-300 text-sm mt-1">Agrega productos para comenzar</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.productoId || item.id}-${item.measure || "1kg"}-${item.esBuckets ? "b" : item.esPromocion ? "p" : "l"}`}
                  className="flex gap-3 pb-4 border-b"
                >
                  <div className="w-16 h-16 bg-lime-50 rounded-xl flex items-center justify-center">
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-contain" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                    {item.tipo != null &&
                    String(item.tipo).trim() !== "" &&
                    String(item.tipo).trim() !== "—" ? (
                      <p className="text-xs text-amber-900/90 font-medium mt-0.5">
                        Tipo: {String(item.tipo).trim()}
                      </p>
                    ) : null}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(() => {
                        if (item.esPromocion) {
                          const n = Math.max(1, Math.floor(Number(item.quantity)) || 1);
                          const kg = Number(item.promocionKgMadura) || 1;
                          return `${n} pack${n !== 1 ? "s" : ""} · ${kg} kg maduro/pack · ${item.nombrePromocion || "Promoción"}`;
                        }
                        const res = resumenKgLineaCarrito(item);
                        if (res) return res;
                        return item.measure === "1kg" || !item.measure
                          ? `${item.cantidadKg ?? item.quantity} kg`
                          : `${item.measure} × ${item.quantity}`;
                      })()}
                    </p>
                    {typeof onRemoveItem === "function" && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                        title="Eliminar producto"
                      >
                        <span aria-hidden>🗑️</span>
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                  <p className="font-bold text-sm text-emerald-800">
                    S/ {(precioLineaCarrito(item) * qtyCarrito(item)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t px-6 py-5 space-y-4">
              {descuentosDisponibles.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                  <p className="text-xs font-bold text-amber-950 mb-2">
                    Descuentos disponibles
                  </p>
                  <p className="text-[11px] text-amber-900/80 mb-2">
                    Solo palta madura · hasta agotar stock
                  </p>
                  <ul className="space-y-2">
                    {descuentosDisponibles.map((grupo) => {
                      const codigo = grupo.codigo;
                      const pct = grupo.porcentaje;
                      const aplica = descuentoAplicaAlCarrito(grupo);
                      const esActivo =
                        descuentoAplicado?.ok &&
                        String(descuentoAplicado.codigo || "").toUpperCase() === codigo;
                      return (
                        <li key={codigo}>
                          <button
                            type="button"
                            onClick={() => usarCodigo(codigo)}
                            disabled={Boolean(descuentoAplicado?.ok && !esActivo)}
                            className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                              esActivo
                                ? "border-emerald-500 bg-emerald-100"
                                : aplica
                                  ? "border-emerald-300 bg-white hover:bg-emerald-50"
                                  : "border-amber-200 bg-white hover:bg-amber-50/80"
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-sm font-bold text-emerald-900">
                                {codigo}
                              </span>
                              <span className="text-xs font-bold text-amber-900">
                                {pct}% desct.
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-gray-600">
                              Todas las variedades · solo palta madura
                              {aplica ? (
                                <span className="ml-1 font-semibold text-emerald-700">
                                  · Aplica a tu carrito
                                </span>
                              ) : (
                                <span className="ml-1 text-gray-500">
                                  · Agrega palta madura
                                </span>
                              )}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <p className="text-xs font-semibold text-emerald-900 mb-2">
                  Código de descuento
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codigoDescuentoInput}
                    onChange={(e) => onCodigoChange?.(e.target.value.toUpperCase())}
                    placeholder="Ej. PMH15"
                    className="flex-1 rounded-lg border border-emerald-200 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                    disabled={Boolean(descuentoAplicado?.ok)}
                  />
                  {descuentoAplicado?.ok ? (
                    <button
                      type="button"
                      onClick={onQuitarCodigo}
                      className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Quitar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onAplicarCodigo}
                      className="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Aplicar
                    </button>
                  )}
                </div>
                {descuentoAplicado?.ok && (
                  <p className="mt-2 text-xs text-emerald-800">
                    {descuentoAplicado.porcentaje}% en palta madura
                    {descuentoAplicado.tipo ? ` · ${descuentoAplicado.tipo}` : ""} — hasta agotar
                    stock
                  </p>
                )}
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold text-gray-800">S/ {sub.toFixed(2)}</span>
              </div>
              {desc > 0 && (
                <div className="flex justify-between text-sm text-emerald-700">
                  <span>
                    Descuento ({descuentoAplicado?.codigo})
                  </span>
                  <span className="font-semibold">− S/ {desc.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-emerald-900 border-t pt-3">
                <span>Total (sin IGV)</span>
                <span>S/ {tot.toFixed(2)}</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold rounded-full py-2.5 text-sm hover:bg-gray-50"
                >
                  Seguir comprando
                </button>
                <button
                  onClick={handlePagarClick}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-full py-2.5 text-sm"
                >
                  Pagar ahora
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartSidebar;
