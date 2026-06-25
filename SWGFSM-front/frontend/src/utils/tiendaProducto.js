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
export const MEASURE_CARRITO_PROMO = "pack-promo";

export const roundKg = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return NaN;
  return Math.round(x * 100) / 100;
};

export const kgMaduraPackPromocion = (promo) => {
  const n = Number(promo?.kgMadura);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export const kgTotalPackPromocion = (promo, packs = 1) => {
  const p = Math.max(1, Math.floor(Number(packs)) || 1);
  return roundKg(p * kgMaduraPackPromocion(promo));
};

/** Producto activo del listado por kg que corresponde a una variedad (para packs). */
export const productoCatalogoPorVariedad = (productos, variedad) => {
  const v = String(variedad || "")
    .trim()
    .toLowerCase();
  if (!v || !Array.isArray(productos)) return null;
  const activos = productos.filter(
    (p) => String(p?.estado || "ACTIVO").toUpperCase() !== "INACTIVO",
  );
  const match = (p) => {
    const t = `${p.tipo || ""} ${p.nombre || ""}`.toLowerCase();
    if (v === "hall" && t.includes("hall")) return true;
    if (v === "selva" && t.includes("hall")) return true;
    return t.includes(v);
  };
  return activos.find(match) || null;
};

export const variedadDisponibleEnCatalogo = (productos, variedad) =>
  Boolean(productoCatalogoPorVariedad(productos, variedad));

/** Promoción independiente (colección promocion) */
export const promocionEstaActiva = (promo) =>
  String(promo?.estado || "").toUpperCase() === "ACTIVO" && Number(promo?.precio) > 0;

export const precioPackPromocion = (promo) => Number(promo?.precio) || 0;

export const nombrePackPromocion = (promo) =>
  String(promo?.nombre || "Pack Familiar").trim() || "Pack Familiar";

export const descripcionPackPromocion = (promo) => String(promo?.descripcion || "").trim();

export const variedadPackPromocion = (promo) => String(promo?.variedad || "").trim();

/** Legacy: promo embebida en producto */
export const productoTienePromocion = (p) =>
  Boolean(p?.promocionActiva) && Number(p?.promocionPrecio) > 0;

export const precioPromocionProducto = (p) =>
  productoTienePromocion(p) ? Number(p.promocionPrecio) : 0;

export const nombrePromocionProducto = (p) =>
  String(p?.promocionNombre || "Pack Familiar").trim() || "Pack Familiar";

export const descripcionPromocionProducto = (p) =>
  String(p?.promocionDescripcion || "").trim();

export const kgMaduraPorPackPromo = (p) => {
  const n = Number(p?.promocionKgMadura);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export const variedadPromocionProducto = (p) =>
  String(p?.promocionVariedad || p?.tipo || "").trim();

export const estadoPromocionLabel = (p) =>
  productoTienePromocion(p) ? "ACTIVO" : "INACTIVO";

export const imagenPromoPorTipo = (p, imgs = {}) => {
  const cat = categoriaCatalogo(p);
  if (cat === "fuerte" && imgs.fuerte) return imgs.fuerte;
  if (cat === "hass" && imgs.hass) return imgs.hass;
  if ((cat === "hall" || cat === "selva") && imgs.hall) return imgs.hall;
  return null;
};

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

/**
 * Texto de tarjeta del catálogo: solo el campo «Descripción» del admin (sin textos automáticos).
 */
export const descripcionCortaTarjeta = (p) => {
  const full = String(p?.descripcion || "").trim().replace(/\s+/g, " ");
  if (!full) return "";
  if (full.length <= MAX_DESCRIPCION_CORTA) return full;
  return `${full.slice(0, MAX_DESCRIPCION_CORTA - 1).trim()}…`;
};
