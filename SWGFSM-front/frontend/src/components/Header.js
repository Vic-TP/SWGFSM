// src/components/Header.js
import React from "react";
import logoPaltasInterior from "../assets/logopaltasinterior.png";

const Header = ({ onCartClick, cartCount, client }) => {
  // Ir al login en modo ADMIN
  const handleAdminClick = () => {
    localStorage.setItem("login_mode", "admin");
    window.location.href = "/login";
  };

  // Ir al login/perfil en modo CLIENTE
  const handleClientAreaClick = () => {
    if (client) {
      // ya está logueado → perfil
      window.location.href = "/cliente/perfil";
    } else {
      // aún no → login cliente
      localStorage.setItem("login_mode", "client");
      window.location.href = "/login";
    }
  };

  return (
    <header className="bg-lime-300 py-6 px-10 flex items-center justify-between shadow-md">
      <div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-emerald-900 leading-tight tracking-wide">
          FRUTERIA SEÑOR DE
          <br />
          MURHUAY
        </h1>
      </div>

      <div className="flex flex-col items-end gap-3">
        <div className="flex items-center gap-3">
          {/* Botón cliente */}
          <button
            onClick={handleClientAreaClick}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-600 text-emerald-800 text-xs md:text-sm font-semibold px-3 py-1 rounded-full hover:bg-emerald-100"
          >
            {client ? (
              <>
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs">
                  {client.nombre?.charAt(0)?.toUpperCase() || "U"}
                </span>
                <span className="max-w-[140px] truncate">{client.nombre}</span>
              </>
            ) : (
              <>
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs">
                  🙂
                </span>
                <span>Iniciar sesión cliente</span>
              </>
            )}
          </button>

          {/* Botón Admin */}
          <button
            onClick={handleAdminClick}
            className="bg-emerald-700 hover:bg-emerald-600 text-lime-50 font-semibold px-4 py-2 rounded-full shadow-lg shadow-emerald-700/40 transition text-xs md:text-sm tracking-wide"
          >
            Admin
          </button>

          {/* Botón Carrito */}
          <button
            onClick={onCartClick}
            className="relative flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-lime-50 font-semibold px-5 py-2 rounded-full shadow-lg shadow-emerald-800/40 transition text-xs md:text-sm tracking-wide"
          >
            <span>🛒</span>
            <span>Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <img
          src={logoPaltasInterior}
          alt="Interior N°15"
          className="w-72 h-auto rounded-2xl shadow-xl object-cover"
        />
      </div>
    </header>
  );
};

export default Header;
