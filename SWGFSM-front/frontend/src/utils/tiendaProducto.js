/** Utilidades catálogo tienda ↔ API producto (MongoDB) */

export const stockDisponibleKg = (p) => {
  if (!p) return 0;
  const sum =
    Number(p.stockPaltaMadura || 0) +
    Number(p.stockPaltaVerde || 0) +
    Number(p.stockPaltaSazon || 0);
  if (Number.isFinite(sum) && sum > 0) return Math.max(0, Math.floor(sum));
  const leg = Number(p.stockSemanal);
  if (Number.isFinite(leg) && leg > 0) return Math.floor(leg);
  return 0;
};

/** Slug de filtro UI (hass, fuerte, selva, packs, premium, otros) */
export const categoriaCatalogo = (p) => {
  const t = `${p.tipo || ""} ${p.nombre || ""}`.toLowerCase();
  if (t.includes("pack")) return "packs";
  if (t.includes("premium")) return "premium";
  if (t.includes("hass")) return "hass";
  if (t.includes("fuerte")) return "fuerte";
  if (t.includes("naval")) return "naval";
  if (t.includes("selva")) return "selva";
  if (t.includes("gigante")) return "gigante";
  return "otros";
};

/**
 * Imagen para la tienda: URL en BD si existe; si no, por nombre/tipo.
 * `defaults` = { hass, fuerte, naval, selva, variadas } (imports desde assets)
 */
export const imagenCatalogo = (p, defaults) => {
  const u = p?.imagenUrl ?? p?.foto ?? p?.urlImagen;
  if (u != null && String(u).trim() !== "") return String(u).trim();
  const t = `${p?.nombre || ""} ${p?.tipo || ""}`.toLowerCase();
  if (t.includes("hass")) return defaults.hass;
  if (t.includes("fuerte")) return defaults.fuerte;
  if (t.includes("naval")) return defaults.naval;
  if (t.includes("selva")) return defaults.selva;
  if (t.includes("pack") || t.includes("variad")) return defaults.variadas;
  return defaults.variadas;
};

const MAX_DESCRIPCION_CORTA = 110;

const TEXTO_CORTO_POR_CATEGORIA = {
  hass: "Palta Hass: pulpa cremosa, excelente para guacamole y tostadas.",
  fuerte: "Palta Fuerte: sabor marcado y fruta firme, ideal para ensaladas.",
  naval: "Palta Naval: jugosa y aromática, perfecta para consumo fresco.",
  selva: "Palta de selva: variedad regional, frescura directa del productor.",
  packs: "Selección variada en un solo pedido, pensada para la familia.",
  premium: "Selección premium: calidad extra y presentación cuidada.",
  gigante: "Tamaño generoso, ideal para compartir o preparaciones grandes.",
  otros: "Palta fresca seleccionada, lista para llevar a tu mesa.",
};

/**
 * Texto breve para tarjetas del catálogo: recorta detalle/descripción o usa un default por variedad.
 */
export const descripcionCortaTarjeta = (p) => {
  const full = String((p?.detalle || p?.descripcion || "").trim()).replace(/\s+/g, " ");
  if (full) {
    if (full.length <= MAX_DESCRIPCION_CORTA) return full;
    return `${full.slice(0, MAX_DESCRIPCION_CORTA - 1).trim()}…`;
  }
  const cat = categoriaCatalogo(p);
  return TEXTO_CORTO_POR_CATEGORIA[cat] || TEXTO_CORTO_POR_CATEGORIA.otros;
};
