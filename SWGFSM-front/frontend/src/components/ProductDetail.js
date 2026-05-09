// src/components/ProductDetail.js — inventario desde API; palta por bucket: kg verde/sazón/maduro ↔ POST ventas + madurez

import React, { useState, useEffect } from "react";
import {
  stockDisponibleKg,
  productoTieneStockPorMadurez,
  kilosStockPorMadurez,
  MEASURE_CARRITO_BUCKETS,
  clampKgPorMadurezUi,
  totalKgBuckets,
  formatoKgCarritoBuckets,
} from "../utils/tiendaProducto";

/** Un campo kg (0 permitido; confirma con Enter o blur). */
const TiendaBucketKgField = ({ value, maxKg, label, ariaLabel, onCommit }) => {
  const v = Math.max(0, Math.floor(Number(value) || 0));
  const maxOk = Math.max(0, Math.floor(Number(maxKg) || 0));
  const [draft, setDraft] = useState(String(v));
  useEffect(() => {
    setDraft(String(Math.max(0, Math.floor(Number(value) || 0))));
  }, [value]);
  const commit = () => {
    let n = Math.floor(Number(String(draft).replace(/\D/g, "")) || 0);
    if (!Number.isFinite(n) || n < 0) n = 0;
    n = Math.min(n, maxOk);
    setDraft(String(n));
    onCommit(n);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className="text-[10px] text-amber-800 font-medium tabular-nums">máx. {maxOk} kg</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Menos ${label}`}
          onClick={() => onCommit(Math.max(0, v - 1))}
          className="w-9 h-9 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel || label}
          value={draft}
          onChange={(e) => {
            const t = e.target.value.replace(/\D/g, "").slice(0, 8);
            setDraft(t);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          className="flex-1 min-w-0 text-center font-semibold border border-gray-300 rounded-xl py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
        />
        <button
          type="button"
          aria-label={`Más ${label}`}
          onClick={() => onCommit(Math.min(maxOk, v + 1))}
          disabled={v >= maxOk}
          className="w-9 h-9 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
};

const ProductDetail = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [kgBuckets, setKgBuckets] = useState(() => formatoKgCarritoBuckets());

  const precioPorKilo = Number(product.precioVenta ?? product.precio ?? 0);
  const stockKg = stockDisponibleKg(product);
  const porMadurez = kilosStockPorMadurez(product);
  const desgloseMadurez = productoTieneStockPorMadurez(product);

  const imgsFicha = (() => {
    const extra = Array.isArray(product.imagenesFichaExtra) ? product.imagenesFichaExtra : [];
    const list = [product.imagen, ...extra].filter(Boolean);
    const out = [];
    const seen = new Set();
    for (const u of list) {
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
    return out;
  })();

  const titulo = (() => {
    const nombre = String(product?.nombre || "").trim();
    const tipo = String(product?.tipo || "").trim();
    if (!tipo) return nombre || "Producto";
    if (nombre.toLowerCase().includes(tipo.toLowerCase())) return nombre || "Producto";
    return `${nombre || "Producto"} ${tipo}`;
  })();
  const descripcion =
    product.detalle || product.descripcion || product.description || "";
  const subtitulo =
    product.tipo && String(product.tipo).trim()
      ? `${product.tipo} · ${product.unidadMedida || "kg"}`
      : `Palta fresca · ${product.unidadMedida || "kg"}`;

  useEffect(() => {
    setQuantity(1);
    setKgBuckets(formatoKgCarritoBuckets());
  }, [product?._id]);

  // Evita que el scroll afecte a la página de fondo mientras el modal está abierto
  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  useEffect(() => {
    if (!desgloseMadurez) {
      setQuantity((q) => Math.min(q, Math.max(1, stockKg)));
    } else {
      setKgBuckets((prev) => clampKgPorMadurezUi(product, prev));
    }
  }, [stockKg, desgloseMadurez, product, porMadurez.maduro, porMadurez.verde, porMadurez.sazon]);

  const kgClamped = desgloseMadurez ? clampKgPorMadurezUi(product, kgBuckets) : null;
  const totalKgCarrito = desgloseMadurez && kgClamped ? totalKgBuckets(kgClamped) : quantity;

  const measure = "1kg";
  const totalPrice = precioPorKilo * totalKgCarrito;

  const setBucket = (campo, n) => {
    setKgBuckets((prev) => clampKgPorMadurezUi(product, { ...prev, [campo]: n }));
  };

  const handleAdd = () => {
    if (stockKg < 1) {
      alert("No hay stock disponible de este producto.");
      return;
    }

    if (desgloseMadurez) {
      const clamped = clampKgPorMadurezUi(product, kgBuckets);
      const tot = totalKgBuckets(clamped);
      if (tot < 1) {
        alert("Indica al menos 1 kg en total (verde, sazón o maduro).");
        return;
      }
      onAddToCart(product, tot, MEASURE_CARRITO_BUCKETS, {
        precioLinea: precioPorKilo,
        precioUnitario: precioPorKilo,
        cantidadKg: tot,
        kgPorMadurez: clamped,
      });
      onClose();
      return;
    }

    if (quantity > stockKg) {
      alert(`Stock insuficiente. Disponible: ${stockKg} kg.`);
      return;
    }
    onAddToCart(product, quantity, measure, {
      precioLinea: precioPorKilo,
      precioUnitario: precioPorKilo,
      cantidadKg: quantity,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
      onWheelCapture={(e) => e.stopPropagation()}
      onTouchMoveCapture={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-500 flex items-center justify-center text-xl shadow-md"
          >
            &times;
          </button>

          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 bg-gradient-to-br from-lime-50 to-emerald-50 p-6 md:p-8 flex flex-col items-center justify-center md:rounded-l-3xl gap-4">
              <div
                className={`grid gap-4 w-full max-w-sm mx-auto ${imgsFicha.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {imgsFicha.map((src, i) => {
                  const nt = `${product?.nombre || ""} ${product?.tipo || ""}`.toLowerCase();
                  const esHass = nt.includes("hass");
                  const esFuerte = nt.includes("fuerte");
                  let sub = null;
                  let subText = null;
                  if (imgsFicha.length > 1 && esHass) {
                    sub = i === 0 ? "Verde" : "Madura";
                    subText =
                      sub === "Verde" ? "Palta Hass verde" : "Palta Hass madura";
                  } else if (imgsFicha.length > 1 && esFuerte) {
                    sub = i === 0 ? "Detalle" : "Mostrador";
                    subText =
                      sub === "Detalle"
                        ? "Palta Fuerte · vista principal"
                        : "Palta Fuerte · mostrador";
                  }
                  return (
                    <div key={src} className="flex flex-col items-center text-center">
                      <img
                        src={src}
                        alt={subText ? `${titulo} — ${subText}` : titulo}
                        className="w-full max-h-52 object-contain rounded-2xl bg-white/60 p-3 shadow-inner"
                      />
                      {subText && (
                        <span className="mt-2 text-xs font-semibold text-emerald-800">
                          {subText}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="md:w-1/2 p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Total vendible: {stockKg} kg
                </span>
                {product.estado === "ACTIVO" && (
                  <span className="text-xs font-semibold text-gray-600">Disponible</span>
                )}
              </div>

              {desgloseMadurez ? (
                <div className="mb-4 rounded-xl border border-emerald-100 overflow-hidden bg-white/80">
                  <p className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wide px-3 py-2 bg-emerald-50/90 border-b border-emerald-100">
                    Clasificación disponible
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50/80">
                        <th className="px-3 py-2 font-semibold">Estado</th>
                        <th className="px-3 py-2 font-semibold text-right w-24">Kg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-3 py-2 text-gray-800">Palta madura</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900 tabular-nums">
                          {porMadurez.maduro}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-gray-800">Palta verde</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900 tabular-nums">
                          {porMadurez.verde}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-gray-800">Sazón (en punto)</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900 tabular-nums">
                          {porMadurez.sazon}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-50/50 text-emerald-900 text-xs font-bold">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {porMadurez.maduro + porMadurez.verde + porMadurez.sazon}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : stockKg > 0 ? (
                <p className="mb-4 text-xs text-gray-600 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                  Inventario en una sola categoría (legacy):{" "}
                  <span className="font-semibold text-gray-900">{stockKg} kg</span> — stock semanal en catálogo.
                </p>
              ) : (
                <p className="mb-4 text-xs text-amber-800 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2">
                  Sin stock registrado para este producto.
                </p>
              )}

              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-wide">
                {titulo}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{subtitulo}</p>

              {descripcion && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 leading-relaxed">{descripcion}</p>
                </div>
              )}

              <div className="mt-6">
                <span className="text-3xl font-bold text-emerald-700">
                  S/ {precioPorKilo.toFixed(2)}
                </span>
                <span className="text-sm text-gray-400 ml-1">/kg</span>
              </div>

              {desgloseMadurez ? (
                <div className="mt-6 space-y-4">
                  <p className="text-sm font-semibold text-gray-800">
                    Cantidad por madurez (kg)
                  </p>
                  <p className="text-xs text-gray-500 -mt-2">
                    Indica cuántos kilos de cada estado quieres.
                  </p>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 space-y-5">
                    <TiendaBucketKgField
                      label="Verde"
                      value={kgClamped.verde}
                      maxKg={porMadurez.verde}
                      onCommit={(n) => setBucket("verde", n)}
                    />
                    <TiendaBucketKgField
                      label="Sazón (en punto)"
                      value={kgClamped.sazon}
                      maxKg={porMadurez.sazon}
                      onCommit={(n) => setBucket("sazon", n)}
                    />
                    <TiendaBucketKgField
                      label="Maduro"
                      value={kgClamped.maduro}
                      maxKg={porMadurez.maduro}
                      onCommit={(n) => setBucket("maduro", n)}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    Total seleccionado:{" "}
                    <span className="font-semibold text-emerald-800 tabular-nums">
                      {totalKgBuckets(kgClamped)} kg
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cantidad (kg)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg"
                    >
                      -
                    </button>
                    <span className="text-xl font-semibold text-gray-800 w-12 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(stockKg, q + 1))}
                      disabled={quantity >= stockKg}
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total a pagar</span>
                  <span className="text-xl font-bold text-emerald-700">
                    S/ {totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={stockKg < 1 || (desgloseMadurez && totalKgBuckets(kgClamped) < 1)}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-full transition-all duration-300 shadow-md"
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
