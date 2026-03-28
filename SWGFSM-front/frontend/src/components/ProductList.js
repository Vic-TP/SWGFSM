// src/components/ProductList.js
import React, { useRef } from "react";
import ProductCard from "./ProductCard";

import paltaFuerte from "../assets/palta-fuerte.png";
import paltaHass from "../assets/palta-hass.png";
import paltaNaval from "../assets/palta-naval.png";
import paltaSelva from "../assets/palta-selva.png";

// ----- Productos -----
export const PRODUCTS = [
  {
    id: 1,
    name: "PALTA FUERTE",
    unit: "POR KILO",
    price: 10.0,
    image: paltaFuerte,
    description: "Palta cremosa, ideal para jugos y ensaladas.",
    nutrition: {
      porcion: "100 g",
      calories: "160 kcal",
      fat: "15 g",
      carbs: "9 g",
      protein: "2 g",
    },
  },
  {
    id: 2,
    name: "PALTA HASS",
    unit: "POR KILO",
    price: 9.0,
    image: paltaHass,
    description: "Pulpa cremosa, perfecta para guacamole.",
    nutrition: {
      porcion: "100 g",
      calories: "167 kcal",
      fat: "15 g",
      carbs: "8.5 g",
      protein: "2 g",
    },
  },
  {
    id: 3,
    name: "PALTA VILLACAMPA",
    unit: "POR KILO",
    price: 9.5,
    image: paltaFuerte,
    description: "Textura suave, perfecta para tus ensaladas.",
    nutrition: {
      porcion: "100 g",
      calories: "155 kcal",
      fat: "14 g",
      carbs: "8 g",
      protein: "2 g",
    },
  },
  {
    id: 4,
    name: "PALTA NAVAL",
    unit: "POR KILO",
    price: 9.5,
    image: paltaNaval,
    description: "Cremosa y ligera, baja en grasas.",
    nutrition: {
      porcion: "100 g",
      calories: "150 kcal",
      fat: "13 g",
      carbs: "8 g",
      protein: "2 g",
    },
  },
  {
    id: 5,
    name: "PALTA DE LA SELVA",
    unit: "POR KILO",
    price: 6.0,
    image: paltaSelva,
    description: "Producto orgánico, bajo en grasas.",
    nutrition: {
      porcion: "100 g",
      calories: "140 kcal",
      fat: "12 g",
      carbs: "7 g",
      protein: "2 g",
    },
  },
];

const ProductList = ({ onViewProduct }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction * amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="flex-1 bg-emerald-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-emerald-900 text-center mb-10 tracking-wide">
          Nuestros productos
        </h2>

        <div className="relative flex items-center gap-4">
          {/* Flecha izquierda */}
          <button
            onClick={() => scroll(-1)}
            className="hidden md:flex h-10 w-10 rounded-full bg-white shadow-md items-center justify-center text-2xl font-bold text-emerald-700 hover:bg-emerald-100 transition"
          >
            ‹
          </button>

          {/* Carrusel */}
          <div
            ref={scrollRef}
            className="flex overflow-x-auto space-x-6 pb-4 snap-x snap-mandatory"
          >
            {PRODUCTS.map((product) => (
              <div key={product.id} className="snap-start">
                <ProductCard
                  name={product.name}
                  unit={product.unit}
                  price={product.price}
                  image={product.image}
                  description={product.description}
                  onView={() => onViewProduct(product)}
                />
              </div>
            ))}
          </div>

          {/* Flecha derecha */}
          <button
            onClick={() => scroll(1)}
            className="hidden md:flex h-10 w-10 rounded-full bg-white shadow-md items-center justify-center text-2xl font-bold text-emerald-700 hover:bg-emerald-100 transition"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductList;

