/** Busca producto del catálogo por kg según variedad (para descontar stock en packs). */
const encontrarProductoCatalogoPorVariedad = async (Producto, variedad) => {
  const v = String(variedad || "")
    .trim()
    .toLowerCase();
  if (!v) return null;
  const list = await Producto.find({ estado: { $ne: "INACTIVO" } }).lean();
  const match = (p) => {
    const t = `${p.tipo || ""} ${p.nombre || ""}`.toLowerCase();
    if (v === "hall" && t.includes("hall")) return true;
    if (v === "selva" && t.includes("hall")) return true;
    return t.includes(v);
  };
  return list.find(match) || null;
};

module.exports = { encontrarProductoCatalogoPorVariedad };
