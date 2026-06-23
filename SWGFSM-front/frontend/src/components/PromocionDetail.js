import React, { useState, useEffect } from "react";
import {
  promocionEstaActiva,
  precioPackPromocion,
  nombrePackPromocion,
  descripcionPackPromocion,
  variedadPackPromocion,
  kgMaduraPackPromocion,
  kilosStockPorMadurez,
  roundKg,
} from "../utils/tiendaProducto";

const PromocionDetail = ({ promocion, productoStock, imagenPromo, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);

  const precioPack = precioPackPromocion(promocion);
  const nombrePack = nombrePackPromocion(promocion);
  const descripcion =
    descripcionPackPromocion(promocion) ||
    "Selección especial en presentación familiar. Ideal para compartir en casa.";
  const kgPorPack = kgMaduraPackPromocion(promocion);
  const kgPorPackLabel = roundKg(kgPorPack);
  const totalKgSeleccion = roundKg(kgPorPack * quantity);
  const stockMaduro = productoStock ? kilosStockPorMadurez(productoStock).maduro : 0;
  const maxPacks = kgPorPack > 0 ? Math.floor(stockMaduro / kgPorPack) : 0;
  const promoOk = promocionEstaActiva(promocion);

  const variedad = variedadPackPromocion(promocion);
  const titulo = variedad ? `PALTA ${variedad.toUpperCase()}` : "PROMOCIÓN";

  useEffect(() => {
    setQuantity(1);
  }, [promocion?._id]);

  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, []);

  const handleAdd = () => {
    if (!promoOk) {
      alert("Esta promoción no está disponible en este momento.");
      return;
    }
    if (!productoStock?._id) {
      alert("No hay producto en catálogo para esta variedad (stock por kg).");
      return;
    }
    if (maxPacks < 1) {
      alert(`No hay suficiente palta madura para esta promoción (se requieren ${kgPorPack} kg por pack).`);
      return;
    }
    if (quantity > maxPacks) {
      alert(`Solo hay stock para ${maxPacks} pack(s).`);
      return;
    }
    onAddToCart(promocion, productoStock, {
      esPromocion: true,
      precioLinea: precioPack,
      precioUnitario: precioPack,
      nombrePromocion: nombrePack,
      promocionKgMadura: kgPorPack,
      promocionId: promocion._id,
      productoId: productoStock._id,
      cantidadPacks: quantity,
      imagenPromo,
    });
    onClose();
  };

  const imgSrc = imagenPromo;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
      onWheelCapture={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-500 flex items-center justify-center text-xl shadow-md"
          >
            &times;
          </button>

          <div className="flex flex-col md:flex-row">
            <div className="md:w-2/5 bg-gradient-to-br from-amber-50 to-lime-100 p-8 flex items-center justify-center md:rounded-l-3xl">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={nombrePack}
                  className="w-full max-h-64 object-contain drop-shadow-lg"
                />
              ) : (
                <div className="text-center text-amber-900/60 text-sm">Sin imagen</div>
              )}
            </div>

            <div className="md:w-3/5 p-6 md:p-8">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-white bg-[#006241] px-3 py-1 rounded-full mb-3">
                Promoción
              </span>

              <h2 className="text-2xl md:text-3xl font-bold text-[#1e3932] tracking-tight">
                {nombrePack}
              </h2>
              <p className="mt-1 text-lg font-semibold text-[#006241] uppercase">{titulo}</p>
              {variedad && (
                <p className="mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Variedad: {variedad}
                </p>
              )}

              <p className="mt-4 text-sm text-gray-600 leading-relaxed">{descripcion}</p>

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <div>
                  <span className="text-3xl font-bold text-[#006241]">
                    S/ {precioPack.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">/ pack</span>
                  <p className="mt-1 text-sm font-semibold text-gray-600">
                    {kgPorPackLabel} kg de palta madura por pack
                  </p>
                </div>
              </div>

              {promoOk ? (
                <>
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cantidad de packs
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg"
                      >
                        −
                      </button>
                      <span className="text-xl font-semibold text-gray-800 w-12 text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxPacks, q + 1))}
                        disabled={quantity >= maxPacks}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>Total kg (maduro)</span>
                      <span className="font-semibold tabular-nums">{totalKgSeleccion} kg</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                      <span className="text-sm text-gray-500">Total promoción</span>
                      <span className="text-xl font-bold text-[#006241]">
                        S/ {(precioPack * quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={maxPacks < 1 || !productoStock}
                    className="w-full mt-6 bg-[#006241] hover:bg-[#004d33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-full transition-all duration-300 shadow-md"
                  >
                    Agregar promoción al carrito
                  </button>
                </>
              ) : (
                <p className="mt-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  Esta promoción no está activa.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromocionDetail;
