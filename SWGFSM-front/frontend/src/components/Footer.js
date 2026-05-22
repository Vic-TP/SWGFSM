// src/components/Footer.js - VERSIÓN SIN EMOJIS

import React from "react";

const Footer = () => {
  return (
    <footer className="w-full bg-[#F5FFB5] py-10">
      <div className="max-w-6xl mx-auto px-8 grid gap-8 md:grid-cols-3 text-[#1C3A1A] font-mono">
        {/* Columna 1: Contacto */}
        <div>
          <p className="font-semibold text-lg">
            Contacto para realizar Pedidos:
          </p>
          <p>celular:</p>
          <p className="mt-2">966 142 980</p>
          <p>988 133 254</p>
        </div>

        {/* Columna Dirección */}
        <div className="text-left">
          <h3 className="font-bold text-lg text-emerald-900 mb-2">
            Dirección:
          </h3>
          <a
            href="https://maps.app.goo.gl/g1d1cjpqv94DjvpQ6"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-emerald-900 underline hover:text-emerald-700"
          >
            Av. Mercado Caqueta N° 800, RIMAC
          </a>
        </div>

        {/* Columna 3: Sobre Nosotros */}
        <div>
          <p className="font-semibold text-lg">Sobre Nosotros:</p>
          <p>Comercializadora de Frutas Señor de Muruhuay se dedica a la venta y distribución de paltas a mercados locales y mayoristas. Ofrecemos paltas de alta calidad, cuidadosamente seleccionadas, en variedades como Hass, Fuerte y paltas de la selva, adaptándonos a la temporada y a las preferencias del mercado.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;