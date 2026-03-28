// src/components/ProductCard.js
import React from "react";

const ProductCard = ({ name, unit, price, image, description, onView }) => {
  return (
    <div className="flex-shrink-0 w-64 bg-white rounded-3xl shadow-lg px-6 py-6 flex flex-col items-center">
      <img src={image} alt={name} className="h-40 object-contain mb-4" />

      <h3 className="text-lg font-extrabold text-slate-900 uppercase text-center tracking-wide">
        {name}
      </h3>

      <p className="text-xs text-gray-500 uppercase mt-1 text-center">
        ({unit})
      </p>

      {description && (
        <p className="text-xs text-gray-600 mt-3 text-center leading-snug">
          {description}
        </p>
      )}

      <p className="text-xl font-bold text-slate-900 mt-4">
        S/ {price.toFixed(2)}
      </p>

      <button
        onClick={onView}
        className="mt-4 px-6 py-2 rounded-full bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition"
      >
        Ver producto
      </button>
    </div>
  );
};

export default ProductCard;

