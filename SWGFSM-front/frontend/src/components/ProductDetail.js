// src/components/ProductDetail.js
import React, { useState } from "react";

const ProductDetail = ({ product, onClose, onAddToCart }) => {
  const [measure, setMeasure] = useState("1 KG");
  const [quantity, setQuantity] = useState(1);

  const handleAddToCartClick = () => {
    onAddToCart(product, quantity, measure);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
      <div className="bg-white max-w-5xl w-full mx-4 rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh]">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl leading-none text-gray-400 hover:text-gray-600"
        >
          &times;
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Imagen */}
          <div className="md:w-1/2 bg-emerald-50 flex items-center justify-center p-8">
            <img
              src={product.image}
              alt={product.name}
              className="max-h-80 object-contain"
            />
          </div>

          {/* Info */}
          <div className="md:w-1/2 p-8 flex flex-col overflow-y-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-emerald-900 uppercase text-center md:text-left">
              {product.name}
            </h2>

            <p className="text-2xl font-bold text-emerald-600 mt-2 text-center md:text-left">
              S/ {product.price.toFixed(2)}
            </p>

            <p className="text-sm text-gray-600 mt-4 text-justify">
              {product.description}
            </p>

            {/* Medidas */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                Medida
              </h3>
              <div className="mt-3 flex gap-3">
                {["240GR", "1 KG"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMeasure(m)}
                    className={`px-5 py-2 rounded-full border text-sm ${
                      measure === m
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad + botón carrito */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center border rounded-full px-4 py-2">
                <button
                  className="text-lg px-1"
                  onClick={() => setQuantity((q) => (q > 1 ? q - 1 : q))}
                >
                  -
                </button>
                <span className="mx-3 w-6 text-center">{quantity}</span>
                <button
                  className="text-lg px-1"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCartClick}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full py-3 text-sm uppercase tracking-wide"
              >
                AGREGAR AL CARRITO
              </button>
            </div>

            {/* Valor nutricional (igual que antes) */}
            {product.nutrition && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Valor nutricional (por {product.nutrition.porcion})
                </h3>
                <div className="grid grid-cols-2 gap-y-1 text-sm mt-2">
                  <span className="text-gray-500">Calorías</span>
                  <span className="font-medium text-gray-800">
                    {product.nutrition.calories}
                  </span>

                  <span className="text-gray-500">Grasas</span>
                  <span className="font-medium text-gray-800">
                    {product.nutrition.fat}
                  </span>

                  <span className="text-gray-500">Carbohidratos</span>
                  <span className="font-medium text-gray-800">
                    {product.nutrition.carbs}
                  </span>

                  <span className="text-gray-500">Proteína</span>
                  <span className="font-medium text-gray-800">
                    {product.nutrition.protein}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center py-2 border-t">
          (Imagen referencial)
        </p>
      </div>
    </div>
  );
};

export default ProductDetail;
