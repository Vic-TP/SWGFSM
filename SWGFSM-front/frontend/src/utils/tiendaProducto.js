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

/** El documento `producto` desde la API trae inventario desglosado (stockPalta* en MongoDB). */
export const productoTieneStockPorMadurez = (p) => {
  if (!p) return false;
  const sum =
    Number(p.stockPaltaMadura || 0) +
    Number(p.stockPaltaVerde || 0) +
    Number(p.stockPaltaSazon || 0);
  return Number.isFinite(sum) && sum > 0;
};

/** Kg por bucket según el backend (`producto` collection). */
export const kilosStockPorMadurez = (p) => ({
  maduro: Math.max(0, Math.floor(Number(p?.stockPaltaMadura) || 0)),
  verde: Math.max(0, Math.floor(Number(p?.stockPaltaVerde) || 0)),
  sazon: Math.max(0, Math.floor(Number(p?.stockPaltaSazon) || 0)),
});

/** Una sola línea en carrito / venta cuando hay inventario por bucket (coherente con CajaRegistradora). */
export const MEASURE_CARRITO_BUCKETS = "kgBuckets";

export const formatoKgCarritoBuckets = () => ({
  verde: 0,
  sazon: 0,
  maduro: 0,
});

/** Limita kg por madurez al stock servidor (Mongo `stockPalta*`). */
export const clampKgPorMadurezUi = (p, raw) => {
  const mx = kilosStockPorMadurez(p);
  const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
  return {
    verde: Math.min(n(raw?.verde), mx.verde),
    sazon: Math.min(n(raw?.sazon), mx.sazon),
    maduro: Math.min(n(raw?.maduro), mx.maduro),
  };
};

export const totalKgBuckets = (kg) => {
  if (!kg || typeof kg !== "object") return 0;
  return (
    Math.max(0, Math.floor(Number(kg.verde) || 0)) +
    Math.max(0, Math.floor(Number(kg.sazon) || 0)) +
    Math.max(0, Math.floor(Number(kg.maduro) || 0))
  );
};

/** Etiqueta de variedad para carrito y ventas (tipo en BD o categoría). */
export const tipoProductoLabel = (p) =>
  (p?.tipo != null && String(p.tipo).trim() !== "" ? String(p.tipo).trim() : p?.categoriaId) || "—";

export const etiquetaMadurezVenta = (m) => {
  const x = String(m || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (x === "maduro") return "Maduro";
  if (x === "verde") return "Verde";
  if (x === "sazon") return "Sazón";
  return "";
};

/**
 * Nombre mostrado en líneas de venta (documento `ventas.productos`): une variedad si no viene en `nombre`.
 * `line` puede ser `{ nombre, tipo?, madurez?, productoId? }`.
 */
export const nombreLineaVenta = (line) => {
  const nombre = String(line?.nombre ?? "").trim() || "—";
  const tipo = line?.tipo != null ? String(line.tipo).trim() : "";
  let base = nombre;
  if (tipo && tipo !== "—" && !nombre.toLowerCase().includes(tipo.toLowerCase())) {
    base = `${nombre} ${tipo}`;
  }
  const mad = etiquetaMadurezVenta(line?.madurez);
  if (mad) base = `${base} · ${mad}`;
  return base;
};

/**
 * Si la línea guardada no tiene `tipo` (ventas antiguas), lo toma del catálogo por `productoId`.
 * `productoPorId`: Map con clave `String(_id)` del producto.
 */
export const mergeTipoLineaDesdeCatalogo = (line, productoPorId) => {
  if (!line || !(productoPorId instanceof Map)) return line;
  const pid = line?.productoId != null ? String(line.productoId).trim() : "";
  let tipo = line?.tipo != null ? String(line.tipo).trim() : "";
  if (tipo && tipo !== "—") return { ...line };
  if (!pid) return { ...line };
  const prod = productoPorId.get(pid);
  if (!prod) return { ...line };
  const t = tipoProductoLabel(prod);
  if (!t || t === "—") return { ...line };
  return { ...line, tipo: t };
};

/** Slug de filtro UI (hass, fuerte, selva, packs, premium, otros) */
export const categoriaCatalogo = (p) => {
  const t = `${p.tipo || ""} ${p.nombre || ""}`.toLowerCase();
  if (t.includes("pack")) return "packs";
  if (t.includes("premium")) return "premium";
  if (t.includes("hall")) return "selva";
  if (t.includes("hass")) return "hass";
  if (t.includes("fuerte")) return "fuerte";
  if (t.includes("naval")) return "naval";
  if (t.includes("selva")) return "selva";
  if (t.includes("gigante")) return "gigante";
  return "otros";
};

/**
 * Imagen para la tienda: URL en BD si existe; si no, por nombre/tipo.
 * `defaults` incluye hassVerde / hassMadura (o `hass` apuntando al verde para compat).
 */
export const imagenCatalogo = (p, defaults) => {
  const u = p?.imagenUrl ?? p?.foto ?? p?.urlImagen;
  if (u != null && String(u).trim() !== "") return String(u).trim();
  const t = `${p?.nombre || ""} ${p?.tipo || ""}`.toLowerCase();
  if (t.includes("hall")) return defaults.hall || defaults.variadas;
  if (t.includes("hass")) return defaults.hassVerde || defaults.hass || defaults.variadas;
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
