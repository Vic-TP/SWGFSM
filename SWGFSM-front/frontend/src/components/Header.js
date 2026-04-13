// src/components/Header.js
import React from "react";
import logoPaltasInterior from "../assets/logopaltasinterior.png";

const Header = ({ onCartClick, cartCount, client }) => {
  const handleLoginClick = () => {
    if (client) {
      window.location.href = "/cliente/perfil";
    } else {
      window.location.href = "/login";
    }
  };

  const handleAdminClick = () => {
    window.location.href = "/login";
  };

  return (
    <header className="bg-lime-300 py-5 px-8 flex items-center justify-between shadow-md">
      {/* Logo / Título */}
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-emerald-900 leading-tight tracking-wide">
          FRUTERIA SEÑOR DE
          <br />
          MURUHUAY
        </h1>
      </div>

      {/* Acciones */}
      <div className="flex flex-col items-end gap-3">
        {/* Fila de botones agrupados */}
        <div className="flex items-center bg-white/60 backdrop-blur rounded-2xl shadow-md px-3 py-2 gap-2">

          {/* Botón cliente / perfil */}
          <button
            onClick={handleLoginClick}
            className="flex items-center gap-2 bg-lime-100 border border-lime-300 text-emerald-900 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-lime-200 transition"
          >
            <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
              {client ? client.nombre?.charAt(0)?.toUpperCase() : "U"}
            </span>
            <span className="max-w-[130px] truncate">
              {client ? client.nombre : "Iniciar sesión"}
            </span>
          </button>

          {/* Separador */}
          <div className="w-px h-6 bg-lime-300" />

          {/* Botón Admin */}
          <button
            onClick={handleAdminClick}
            className="text-xs font-semibold text-emerald-800 px-3 py-2 rounded-xl hover:bg-lime-100 transition"
          >
            Acceso trabajador
          </button>

          {/* Separador */}
          <div className="w-px h-6 bg-lime-300" />

          {/* Botón Carrito */}
          <button
            onClick={onCartClick}
            className="relative flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-lime-50 font-semibold px-4 py-2 rounded-xl shadow-sm transition text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 21h6" />
            </svg>
            <span>Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Logo imagen */}
        <img
          src={logoPaltasInterior}
          alt="Interior N°15"
          className="w-64 h-auto rounded-2xl shadow-lg object-cover"
        />
      </div>
    </header>
  );
};

export default Header;