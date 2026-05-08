// src/components/ProductDetail.js — datos de inventario (API); venta por kg entero (igual que Caja / backend)

import React, { useState, useEffect } from "react";
import { stockDisponibleKg } from "../utils/tiendaProducto";

const ProductDetail = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);

  const precioPorKilo = Number(product.precioVenta ?? product.precio ?? 0);
  const stockKg = stockDisponibleKg(product);

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
  }, [product?._id]);

  useEffect(() => {
    setQuantity((q) => Math.min(q, Math.max(1, stockKg)));
  }, [stockKg, product?._id]);

  const measure = "1kg";
  const totalPrice = precioPorKilo * quantity;

  const handleAdd = () => {
    if (stockKg < 1) {
      alert("No hay stock disponible de este producto.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Stock: {stockKg} kg
                </span>
                {product.estado === "ACTIVO" && (
                  <span className="text-xs font-semibold text-gray-600">Disponible</span>
                )}
              </div>

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
                <p className="text-xs text-gray-500 mb-2">
                  Precio por kilogramo (venta al detalle; inventario en kg enteros).
                </p>
                <span className="text-3xl font-bold text-emerald-700">
                  S/ {precioPorKilo.toFixed(2)}
                </span>
                <span className="text-sm text-gray-400 ml-1">/kg</span>
              </div>

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
                disabled={stockKg < 1}
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
