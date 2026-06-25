// src/components/Footer.js - VERSIÓN SIN EMOJIS

import React from "react";

const Footer = () => {
  return (
    <footer className="w-full bg-[#1e3932] py-12 text-[#f5f5f0]">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 grid gap-10 md:grid-cols-3">
        {/* Columna 1: Contacto */}
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#d4e9e2]">
            Contacto para realizar Pedidos:
          </p>
          <p className="mt-4 text-xs font-medium tracking-wide text-[#d4e9e2]/80">Celular</p>
          <p className="mt-2 text-sm font-semibold text-white">966 142 980</p>
        </div>

        {/* Columna Dirección */}
        <div className="text-left">
          <h3 className="mb-4 text-sm font-semibold tracking-wide text-[#d4e9e2]">
            Dirección:
          </h3>
          <a
            href="https://maps.app.goo.gl/g1d1cjpqv94DjvpQ6"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/90 underline decoration-[#d4e9e2]/50 underline-offset-4 transition-colors hover:text-white hover:decoration-[#d4e9e2]"
          >
            Av. Mercado Caqueta N° 800, RIMAC
          </a>
        </div>

        {/* Columna 3: Sobre Nosotros */}
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#d4e9e2]">Sobre Nosotros</p>
          <p className="mt-4 text-sm leading-relaxed text-white/85">
            Comercializadora de Frutas Señor de Muruhuay se dedica a la venta y distribución de paltas a mercados locales y
            mayoristas. Ofrecemos paltas de alta calidad, cuidadosamente seleccionadas, en variedades como Hass, Fuerte y
            paltas de la selva, adaptándonos a la temporada y a las preferencias del mercado.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;