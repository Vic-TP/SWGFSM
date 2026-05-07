import React, { useMemo, useState } from "react";

const badgeClass =
  "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800";

const RecetasPaltaPage = () => {
  const recetas = useMemo(
    () => [
      {
        id: "guacamole",
        titulo: "Guacamole clásico",
        tiempo: "10 min",
        nivel: "Fácil",
        porciones: "2-3",
        ingredientes: [
          "2 paltas maduras",
          "1/2 cebolla roja (picada)",
          "1 tomate (en cubitos)",
          "Jugo de 1 limón",
          "Cilantro (opcional)",
          "Sal y pimienta",
        ],
        pasos: [
          "Machaca la palta en un bowl.",
          "Agrega cebolla, tomate y limón.",
          "Sazona con sal y pimienta.",
          "Mezcla y sirve con tostadas o chips.",
        ],
      },
      {
        id: "ensalada",
        titulo: "Ensalada fresca con palta",
        tiempo: "15 min",
        nivel: "Fácil",
        porciones: "2",
        ingredientes: [
          "1 palta en cubos",
          "Lechuga o mix de hojas",
          "1/2 pepino (rodajas)",
          "Tomate cherry",
          "Aceite de oliva y limón",
          "Sal",
        ],
        pasos: [
          "Lava y seca las hojas.",
          "Mezcla con pepino y tomate.",
          "Agrega la palta al final.",
          "Aliña con aceite, limón y sal.",
        ],
      },
      {
        id: "tostada",
        titulo: "Tostadas de palta",
        tiempo: "12 min",
        nivel: "Fácil",
        porciones: "2",
        ingredientes: [
          "2 rebanadas de pan",
          "1 palta madura",
          "Limón",
          "Ají en hojuelas (opcional)",
          "Sal y pimienta",
        ],
        pasos: [
          "Tuesta el pan.",
          "Machaca la palta con limón, sal y pimienta.",
          "Unta sobre el pan.",
          "Termina con ají en hojuelas si deseas.",
        ],
      },
      {
        id: "smoothie",
        titulo: "Smoothie cremoso de palta",
        tiempo: "7 min",
        nivel: "Fácil",
        porciones: "1-2",
        ingredientes: [
          "1/2 palta",
          "1 plátano",
          "1 taza de leche (o vegetal)",
          "Miel (opcional)",
          "Hielo",
        ],
        pasos: [
          "Coloca todo en la licuadora.",
          "Licúa hasta que quede cremoso.",
          "Ajusta dulzor y sirve frío.",
        ],
      },
      {
        id: "pasta",
        titulo: "Pasta con salsa de palta",
        tiempo: "20 min",
        nivel: "Intermedio",
        porciones: "2",
        ingredientes: [
          "200 g de pasta",
          "1 palta madura",
          "1 diente de ajo",
          "Jugo de 1/2 limón",
          "Aceite de oliva",
          "Sal y pimienta",
        ],
        pasos: [
          "Cocina la pasta al dente.",
          "Licúa palta, ajo, limón, aceite, sal y pimienta.",
          "Mezcla la salsa con la pasta tibia.",
          "Sirve y ajusta sazón.",
        ],
      },
      {
        id: "pollo",
        titulo: "Pollo a la plancha con palta",
        tiempo: "25 min",
        nivel: "Intermedio",
        porciones: "2",
        ingredientes: [
          "2 filetes de pollo",
          "1 palta en láminas",
          "Limón",
          "Sal, pimienta y comino",
          "Ensalada (opcional)",
        ],
        pasos: [
          "Sazona el pollo y cocínalo a la plancha.",
          "Sirve con palta en láminas.",
          "Agrega limón y acompaña con ensalada.",
        ],
      },
    ],
    []
  );

  const [openId, setOpenId] = useState(recetas[0]?.id || "");

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 transition"
          >
            <span aria-hidden>←</span>
            <span>Volver</span>
          </button>
          <div className="text-right">
            <p className="text-xs font-bold tracking-[0.28em] text-emerald-700 uppercase">
              Recetarios
            </p>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Recetas con palta
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-5 py-2">
            <span className="text-emerald-800 text-sm font-bold tracking-wide uppercase">
              Ideas saludables
            </span>
          </span>
          <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Cocina fácil y deliciosa
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Elige una receta y revisa ingredientes y pasos. Puedes empezar por la más rápida.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white">
                <p className="text-sm font-extrabold text-emerald-900">
                  Recetas disponibles
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Selecciona una para ver el detalle.
                </p>
              </div>
              <div className="p-3 space-y-2">
                {recetas.map((r) => {
                  const active = r.id === openId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setOpenId(r.id)}
                      className={`w-full text-left rounded-2xl px-4 py-3 border transition ${
                        active
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-transparent hover:border-emerald-200 hover:bg-emerald-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 truncate">
                            {r.titulo}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {r.tiempo} · {r.nivel} · {r.porciones} porciones
                          </p>
                        </div>
                        <span
                          className={`shrink-0 h-2.5 w-2.5 rounded-full mt-2 ${
                            active ? "bg-emerald-600" : "bg-emerald-200"
                          }`}
                          aria-hidden
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            {recetas
              .filter((r) => r.id === openId)
              .map((r) => (
                <article
                  key={r.id}
                  className="rounded-3xl border border-emerald-100 bg-white shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-6 sm:px-8 sm:py-8 bg-gradient-to-br from-emerald-50 via-white to-lime-50">
                    <h3 className="text-3xl sm:text-4xl font-black text-slate-900">
                      {r.titulo}
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={badgeClass}>⏱ {r.tiempo}</span>
                      <span className={badgeClass}>⭐ {r.nivel}</span>
                      <span className={badgeClass}>🍽 {r.porciones}</span>
                    </div>
                    <p className="mt-4 text-slate-600 text-base leading-relaxed">
                      Una receta práctica para disfrutar la palta con todo su sabor.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    <div className="p-6 sm:p-8 border-t border-emerald-100 md:border-t-0 md:border-r md:border-emerald-100">
                      <h4 className="text-sm font-extrabold text-emerald-900 uppercase tracking-[0.18em]">
                        Ingredientes
                      </h4>
                      <ul className="mt-4 space-y-2 text-slate-700">
                        {r.ingredientes.map((x) => (
                          <li key={x} className="flex gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                            <span className="text-sm sm:text-base">{x}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-6 sm:p-8 border-t border-emerald-100 md:border-t-0">
                      <h4 className="text-sm font-extrabold text-emerald-900 uppercase tracking-[0.18em]">
                        Preparación
                      </h4>
                      <ol className="mt-4 space-y-3 text-slate-700">
                        {r.pasos.map((x, idx) => (
                          <li key={x} className="flex gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-sm font-extrabold shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-sm sm:text-base leading-relaxed">
                              {x}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </article>
              ))}
          </section>
        </div>
      </main>
    </div>
  );
};

export default RecetasPaltaPage;

