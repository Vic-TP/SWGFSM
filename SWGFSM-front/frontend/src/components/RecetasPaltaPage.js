import React, { useMemo, useState } from "react";
import guacamoleImg from "../assets/recetas/guacamole.png";
import causaPaltaImg from "../assets/recetas/causa-palta.png";
import tostadaPaltaImg from "../assets/recetas/tostada-palta.png";
import smoothiePaltaImg from "../assets/recetas/smoothie-palta.png";
import pastaPaltaImg from "../assets/recetas/pasta-palta.png";
import polloPaltaImg from "../assets/recetas/pollo-palta.png";
import ensaladaPaltaImg from "../assets/recetas/ensalada-palta.png";
import paltaRellenaImg from "../assets/recetas/palta-rellena.png";

const RecetasPaltaPage = () => {
  const recetas = useMemo(
    () => [
      {
        id: "guacamole",
        titulo: "Guacamole clásico",
        tiempo: "10 min",
        nivel: "Fácil",
        porciones: "2-3",
        imagen: guacamoleImg,
        descripcion: "Una receta práctica para disfrutar la palta con todo su sabor.",
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
        id: "causa-palta",
        titulo: "Causa de palta",
        tiempo: "90 min",
        nivel: "Intermedio",
        porciones: "4-6",
        imagen: causaPaltaImg,
        descripcion:
          "Clásico peruano de puré de papa amarilla con relleno de pollo y capas de palta fuerte.",
        ingredientes: [
          "1 kg de papa amarilla",
          "1/2 kg de ají amarillo",
          "700 g de pechuga de pollo",
          "100 g de zanahoria",
          "100 g de arveja",
          "10 ml de aceite",
          "500 g de mayonesa",
          "Zumo de 4 limones",
          "1 palta fuerte",
          "1 huevo sancochado",
          "Sal y pimienta al gusto",
        ],
        pasos: [
          "Cocina las papas con sal, pela y prensa en puré mientras estén calientes.",
          "Licúa el ají amarillo con el zumo de limón, aceite, sal y pimienta; incorpora al puré y mezcla bien.",
          "Cocina la pechuga, deshiláchala y mezcla con mayonesa; cocina zanahoria y arveja al dente.",
          "Arma en molde o plato: capa de puré, relleno de pollo, láminas de palta fuerte y tapa con puré.",
          "Decora con huevo sancochado en rodajas; refrigera 30 min antes de servir.",
        ],
      },
      {
        id: "palta-rellena",
        titulo: "Palta rellena",
        tiempo: "35 min",
        nivel: "Intermedio",
        porciones: "6",
        imagen: paltaRellenaImg,
        descripcion:
          "Entrada clásica: mitades de palta rellenas con ensalada de atún, verduras y salsa rosada.",
        ingredientes: [
          "1 lata de atún",
          "1/2 cebolla blanca pequeña (picada finamente)",
          "1/2 taza de arvejas cocinadas",
          "1/2 taza de granos de maíz cocidos",
          "1/2 taza de zanahoria cocida (picada finamente)",
          "1 huevo duro (picado finamente)",
          "1 tomate mediano sin semillas (picado finamente)",
          "6 paltas maduras pero firmes",
          "Jugo de 1 limón",
          "12 hojas de lechuga lavadas",
          "1 taza de salsa rosada",
          "1 cucharada de perejil finamente picado",
          "1 ají sin venas ni semillas, picado (opcional)",
          "Sal y pimienta al gusto",
        ],
        pasos: [
          "Mezcla el atún, cebolla, arvejas, maíz, zanahoria, huevo duro, ají y tomate con 1/2 taza de salsa rosada; sal y pimienta al gusto.",
          "Corta las paltas en mitades, retira las pepas y pela con cuidado. Rocía con jugo de limón.",
          "Coloca las hojas de lechuga en el plato y acomoda las mitades de palta encima.",
          "Rellena las paltas con la mezcla de atún, añade salsa rosada encima y espolvorea perejil.",
          "Sirve de inmediato.",
        ],
      },
      {
        id: "ensalada",
        titulo: "Ensalada fresca con palta",
        tiempo: "15 min",
        nivel: "Fácil",
        porciones: "2",
        imagen: ensaladaPaltaImg,
        descripcion: "Fresca, ligera y lista en pocos minutos.",
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
        imagen: tostadaPaltaImg,
        descripcion: "Desayuno o merienda rápida con palta cremosa.",
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
        imagen: smoothiePaltaImg,
        descripcion: "Bebida cremosa ideal para empezar el día.",
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
        imagen: pastaPaltaImg,
        descripcion: "Salsa suave y aromática para acompañar pasta.",
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
        imagen: polloPaltaImg,
        descripcion: "Plato balanceado con proteína y palta en láminas.",
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
  const activa = recetas.find((r) => r.id === openId) || recetas[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef7f3] via-[#f4faf7] to-white">
      <header className="border-b border-[#d4e9e2]/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center gap-2 rounded-full border border-[#d4e9e2] bg-white px-5 py-2.5 text-sm font-semibold text-[#1e3932] shadow-sm transition hover:bg-[#eef7f3]"
          >
            <span aria-hidden>←</span>
            <span>Volver</span>
          </button>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#006241]">
              Recetarios
            </p>
            <h1 className="text-xl font-extrabold text-[#1e3932] sm:text-2xl">Recetas con palta</h1>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 pb-5">
          <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
            Elige una receta y revisa ingredientes y pasos. Puedes empezar por la más rápida.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,340px)_1fr] lg:gap-8">
          {/* Lista — izquierda */}
          <aside className="h-fit lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-3xl border border-[#d4e9e2] bg-[#eef7f3]/90 shadow-sm">
              <div className="border-b border-[#d4e9e2]/80 px-5 py-4">
                <p className="text-base font-extrabold text-[#006241]">Recetas disponibles</p>
                <p className="mt-1 text-xs text-slate-600">Selecciona una para ver el detalle.</p>
              </div>
              <div className="space-y-2 p-3">
                {recetas.map((r) => {
                  const active = r.id === openId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setOpenId(r.id)}
                      className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
                        active
                          ? "border-[#006241]/35 bg-white shadow-sm"
                          : "border-transparent bg-white/60 hover:border-[#d4e9e2] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#1e3932]">{r.titulo}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {r.tiempo} · {r.nivel} · {r.porciones} porciones
                          </p>
                        </div>
                        <span
                          className={`mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 ${
                            active
                              ? "border-[#006241] bg-[#006241]"
                              : "border-[#b8ddd0] bg-[#d4e9e2]"
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

          {/* Detalle — derecha */}
          {activa && (
            <article className="overflow-hidden rounded-3xl border border-[#d4e9e2] bg-white shadow-md">
              <div className="border-b border-[#d4e9e2]/70 p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-3xl font-extrabold tracking-tight text-[#1e3932] sm:text-4xl">
                      {activa.titulo}
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7f3] px-3 py-1.5 text-xs font-semibold text-[#1e3932] border border-[#d4e9e2]">
                        <span aria-hidden>⏱</span> {activa.tiempo}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 border border-amber-100">
                        <span aria-hidden>★</span> {activa.nivel}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 border border-sky-100">
                        <span aria-hidden>🍽</span> {activa.porciones}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                      {activa.descripcion}
                    </p>
                  </div>
                  {activa.imagen && (
                    <div className="shrink-0 sm:max-w-[240px] lg:max-w-[280px]">
                      <img
                        src={activa.imagen}
                        alt={activa.titulo}
                        className="w-full rounded-2xl border border-[#d4e9e2] object-cover shadow-sm aspect-[4/3]"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="border-t border-[#d4e9e2]/70 p-6 sm:p-8 md:border-r md:border-t-0">
                  <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#006241]">
                    Ingredientes
                  </h3>
                  <ul className="mt-5 space-y-2.5">
                    {activa.ingredientes.map((item) => (
                      <li key={item} className="flex gap-3 text-sm text-slate-700 sm:text-base">
                        <span
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#006241]"
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-[#d4e9e2]/70 p-6 sm:p-8 md:border-t-0">
                  <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#006241]">
                    Preparación
                  </h3>
                  <ol className="mt-5 space-y-4">
                    {activa.pasos.map((paso, idx) => (
                      <li key={paso} className="flex gap-3 text-sm text-slate-700 sm:text-base">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d4e9e2] bg-[#eef7f3] text-sm font-bold text-[#006241]">
                          {idx + 1}
                        </span>
                        <span className="pt-1 leading-relaxed">{paso}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </article>
          )}
        </div>
      </main>
    </div>
  );
};

export default RecetasPaltaPage;
