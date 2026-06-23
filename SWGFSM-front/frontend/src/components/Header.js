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
    window.location.href = "/login-trabajador";
  };

  return (
    <header className="bg-[#1e3932] py-6 px-8 flex items-center justify-between shadow-md">
      {/* Logo / Título */}
      <div>
        <div className="relative inline-block">
          <div
            className="absolute -inset-x-5 -inset-y-3 rounded-[2rem] bg-white/5 blur-[1px]"
            aria-hidden
          />
          <h1 className="relative leading-[0.95]">
            <span className="block text-sm md:text-base font-extrabold tracking-[0.38em] text-[#d4e9e2]/90 uppercase">
              Frutería Señor de
            </span>
            <span className="block mt-2 text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white">
              Muruhuay
            </span>
            <span
              className="mt-4 block h-2 w-40 md:w-56 rounded-full bg-gradient-to-r from-[#006241] via-[#008567] to-[#d4e9e2]"
              aria-hidden
            />
          </h1>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col items-end gap-3">
        {/* Fila de botones agrupados */}
        <div className="flex items-center rounded-2xl border border-white/15 bg-white/10 px-3 py-2 shadow-md backdrop-blur gap-2">

          {/* Botón cliente / perfil */}
          <button
            onClick={handleLoginClick}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#006241] text-xs font-bold text-white">
              {client ? client.nombre?.charAt(0)?.toUpperCase() : "U"}
            </span>
            <span className="max-w-[130px] truncate">
              {client ? client.nombre : "Iniciar sesión"}
            </span>
          </button>

          {/* Solo invitados: enlace a login de empleados (los clientes no ven esta opción) */}
          {!client && (
            <>
              <div className="h-6 w-px bg-white/20" />
              <button
                type="button"
                onClick={handleAdminClick}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10"
              >
                Acceso trabajador
              </button>
            </>
          )}

          <div className="h-6 w-px bg-white/20" />

          {/* Botón Carrito */}
          <button
            onClick={onCartClick}
            className="relative flex items-center gap-2 rounded-xl bg-[#006241] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#004d33]"
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