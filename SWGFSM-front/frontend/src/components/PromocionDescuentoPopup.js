import React, { useMemo, useState } from "react";
import { descuentosUnicosActivos } from "../utils/descuentoOnline";

const CATALOGO_TEMPORADA_ID = "catalogo-destacado";

const PromocionDescuentoPopup = ({ productos = [] }) => {
  const descuentos = useMemo(
    () => descuentosUnicosActivos(productos),
    [productos],
  );
  const [cerrado, setCerrado] = useState(false);

  const cerrar = () => setCerrado(true);

  if (cerrado || !descuentos.length) return null;

  const promo = descuentos[0];
  const pct = promo.porcentaje;
  const codigo = promo.codigo;

  const irCatalogoTemporada = () => {
    cerrar();
    const el = document.getElementById(CATALOGO_TEMPORADA_ID);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-emerald-950/50 backdrop-blur-[2px]"
        onClick={cerrar}
        aria-hidden="true"
      />
      <aside
        className="fixed z-[91] bottom-4 right-4 left-4 sm:left-auto sm:w-[min(100%,320px)]"
        role="dialog"
        aria-modal="true"
        aria-label="Promoción especial"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(6,78,59,0.45)] ring-1 ring-white/20">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800" />
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-lime-300/25 blur-2xl" />
          <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-amber-300/20 blur-2xl" />

          <button
            type="button"
            onClick={cerrar}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-rose-500 shadow-lg ring-2 ring-white/80 hover:bg-white hover:scale-105 transition"
            aria-label="Cerrar promoción"
          >
            ×
          </button>

          <div className="relative px-6 pb-6 pt-7">
            <p className="text-center text-xl font-extrabold uppercase tracking-wider text-white drop-shadow-md">
              ¡Solo por hoy!
            </p>

            <div className="mx-auto mt-3 w-fit rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 px-5 py-1.5 shadow-md">
              <p className="text-center text-xs font-black uppercase tracking-widest text-emerald-950">
                S.M prime DAY
              </p>
            </div>

            <p className="mt-3 text-center text-sm font-semibold text-emerald-50">
              ¡Aprovecha las promociones!
            </p>

            <div className="mx-auto mt-5 max-w-[260px] rounded-2xl bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100 p-5 text-center shadow-inner ring-2 ring-amber-200/80">
              <div className="flex items-end justify-center gap-1 leading-none">
                <span className="bg-gradient-to-br from-emerald-700 to-emerald-900 bg-clip-text text-6xl font-black text-transparent">
                  {pct}
                </span>
                <span className="pb-1 text-3xl font-black text-emerald-800">%</span>
                <span className="pb-1.5 text-sm font-bold text-emerald-700">desct.</span>
              </div>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800/70">
                Código promocional
              </p>
              <p className="mt-1 font-mono text-3xl font-black tracking-wider text-emerald-900">
                {codigo}
              </p>
              <p className="mt-3 rounded-full bg-emerald-100/80 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                Todas las variedades · solo palta madura
              </p>
            </div>

            <p className="mt-4 text-center text-xs font-medium leading-relaxed text-emerald-100/95">
              Solo hasta agotar stock de paltas maduras
            </p>

            <button
              type="button"
              onClick={irCatalogoTemporada}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-lime-400 via-lime-300 to-amber-300 py-3 text-sm font-extrabold uppercase tracking-wide text-emerald-950 shadow-lg ring-1 ring-white/40 hover:brightness-105 active:scale-[0.98] transition"
            >
              Ver catálogo
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default PromocionDescuentoPopup;
