// src/components/ProductCard.js - VERSIÓN CON INFORMACIÓN COMPLETA

import React from "react";

const ProductCard = ({ name, unit, price, image, description, temporada, nutrition, onView }) => {
  return (
    <div className="flex-shrink-0 w-72 bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group">
      {/* Badge de temporada */}
      {temporada && (
        <div className="absolute z-10 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
          Temporada
        </div>
      )}
      
      {/* Imagen */}
      <div className="h-48 bg-gradient-to-br from-lime-50 to-emerald-50 flex items-center justify-center p-4">
        <img src={image} alt={name} className="h-36 object-contain group-hover:scale-105 transition-transform duration-500" />
      </div>
      
      {/* Información */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-800 uppercase tracking-wide">{name}</h3>
        <p className="text-xs text-gray-400 mt-1">{unit}</p>
        
        {/* Descripción */}
        {description && (
          <p className="text-xs text-gray-500 mt-3 line-clamp-2">{description}</p>
        )}
        
        {/* Información nutricional (si existe) */}
        {nutrition && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-600 mb-1">Información nutricional</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs font-bold text-emerald-600">{nutrition.calories || "—"}</p>
                <p className="text-[10px] text-gray-400">Calorías</p>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-600">{nutrition.fat || "—"}</p>
                <p className="text-[10px] text-gray-400">Grasas</p>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-600">{nutrition.protein || "—"}</p>
                <p className="text-[10px] text-gray-400">Proteínas</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Precio y botón */}
        <div className="flex items-center justify-between mt-4">
          <div>
            <span className="text-2xl font-bold text-emerald-700">S/ {price.toFixed(2)}</span>
            <span className="text-xs text-gray-400 ml-1">/{unit}</span>
          </div>
          <button
            onClick={onView}
            className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-300 transform hover:scale-105"
          >
            Ver producto
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;