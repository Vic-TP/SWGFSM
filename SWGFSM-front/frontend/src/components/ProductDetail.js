// src/components/ProductDetail.js - VERSIÓN CON SELECTOR 1KG / 1/2KG

import React, { useState } from "react";

const ProductDetail = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedMeasure, setSelectedMeasure] = useState("1kg");

  // Precio base del producto (por kilo)
  const precioPorKilo = product.precio;

  // Calcular precio según la medida seleccionada
  const getPrice = () => {
    if (selectedMeasure === "1/2kg") {
      return precioPorKilo / 2;
    }
    return precioPorKilo;
  };

  const price = getPrice();
  const totalPrice = price * quantity;

  const handleAdd = () => {
    onAddToCart(
      { 
        ...product, 
        precio: price,
        unidad: selectedMeasure 
      }, 
      quantity, 
      selectedMeasure
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="relative">
          {/* Botón cerrar */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-500 flex items-center justify-center text-xl shadow-md"
          >
            &times;
          </button>
          
          <div className="flex flex-col md:flex-row">
            {/* Imagen */}
            <div className="md:w-1/2 bg-gradient-to-br from-lime-50 to-emerald-50 p-8 flex items-center justify-center rounded-l-3xl">
              <img src={product.imagen} alt={product.nombre} className="w-64 h-64 object-contain" />
            </div>
            
            {/* Información */}
            <div className="md:w-1/2 p-6 md:p-8">
              {/* Badge temporada */}
              {product.temporada && (
                <span className="inline-block bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                  Producto de temporada
                </span>
              )}
              
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 uppercase tracking-wide">
                {product.nombre}
              </h2>
              <p className="text-sm text-gray-400 mt-1">Palta fresca</p>
              
              {/* Descripción */}
              {product.description && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
                </div>
              )}
              
              {/* Información nutricional */}
              {product.nutrition && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Información nutricional</p>
                  <p className="text-xs text-gray-400 mb-2">Porción: {product.nutrition.porcion || "100 g"}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs font-bold text-emerald-600">{product.nutrition.calories || "—"}</p>
                      <p className="text-[10px] text-gray-400">Calorías</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-600">{product.nutrition.fat || "—"}</p>
                      <p className="text-[10px] text-gray-400">Grasas</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-600">{product.nutrition.protein || "—"}</p>
                      <p className="text-[10px] text-gray-400">Proteínas</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Selector de unidad (1kg / 1/2 kg) */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Seleccionar cantidad
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedMeasure("1kg")}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                      selectedMeasure === "1kg"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    1 kg
                  </button>
                  <button
                    onClick={() => setSelectedMeasure("1/2kg")}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                      selectedMeasure === "1/2kg"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    1/2 kg
                  </button>
                </div>
              </div>
              
              {/* Precio dinámico */}
              <div className="mt-4">
                <span className="text-3xl font-bold text-emerald-700">S/ {price.toFixed(2)}</span>
                <span className="text-sm text-gray-400 ml-1">/{selectedMeasure}</span>
                {selectedMeasure === "1/2kg" && (
                  <p className="text-xs text-gray-400 mt-1">
                    Precio por kilo: S/ {precioPorKilo.toFixed(2)}
                  </p>
                )}
              </div>
              
              {/* Selector de cantidad (unidades) */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cantidad (unidades)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg"
                  >
                    -
                  </button>
                  <span className="text-xl font-semibold text-gray-800 w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Total */}
              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total a pagar</span>
                  <span className="text-xl font-bold text-emerald-700">S/ {totalPrice.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Botón agregar */}
              <button
                onClick={handleAdd}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-md"
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