/** Descuentos por código — solo ventas ONLINE y solo líneas de palta madura. */

const roundMoney = (n) => Math.round(Number(n) * 100) / 100;

const normCodigo = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

const descuentoProductoActivo = (p) =>
  String(p?.descuentoEstado || "").toUpperCase() === "ACTIVO" &&
  normCodigo(p?.codigoDescuento).length > 0;

const stockMaduroProducto = (p) => Math.max(0, Number(p?.stockPaltaMadura) || 0);

/**
 * Suma subtotal de kg maduro en carrito/líneas para un productoId.
 * Excluye packs promocionales.
 */
const subtotalMaduroEnLineas = (lineas, productoId) => {
  const pid = String(productoId);
  let sum = 0;
  for (const line of lineas || []) {
    if (line.esPromocion || line.promocionId || String(line.medida || "") === "pack") continue;
    if (String(line.productoId || "") !== pid) continue;
    const mad = String(line.madurez || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (mad !== "maduro") continue;
    const cant = Math.max(0, Number(line.cantidad) || 0);
    const pu = Number(line.precioUnitario) || 0;
    if (cant > 0 && pu >= 0) sum += cant * pu;
  }
  return sum;
};

const subtotalMaduroVariosProductos = (lineas, productoIds) => {
  const ids = new Set((productoIds || []).map((id) => String(id)));
  let sum = 0;
  for (const line of lineas || []) {
    if (line.esPromocion || line.promocionId || String(line.medida || "") === "pack") continue;
    if (!ids.has(String(line.productoId || ""))) continue;
    const mad = String(line.madurez || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (mad !== "maduro") continue;
    const cant = Math.max(0, Number(line.cantidad) || 0);
    const pu = Number(line.precioUnitario) || 0;
    if (cant > 0 && pu >= 0) sum += cant * pu;
  }
  return roundMoney(sum);
};

/**
 * Valida código y calcula descuento para venta online.
 * @param {object} opts - { codigo, lineas, productosCatalogo }
 * @returns {{ ok: true, ... } | { ok: false, message: string }}
 */
const calcularDescuentoOnline = ({ codigo, lineas, productosCatalogo }) => {
  const code = normCodigo(codigo);
  if (!code) {
    return { ok: false, message: "Ingresa un código de descuento." };
  }

  const productosConCodigo = (productosCatalogo || []).filter(
    (p) => normCodigo(p.codigoDescuento) === code && descuentoProductoActivo(p)
  );
  if (!productosConCodigo.length) {
    return { ok: false, message: "Código de descuento no válido." };
  }

  const productosElegibles = productosConCodigo.filter(
    (p) => stockMaduroProducto(p) > 0
  );
  if (!productosElegibles.length) {
    return {
      ok: false,
      message: "Descuento no disponible: stock de palta madura agotado.",
    };
  }

  const ids = productosElegibles.map((p) => p._id);
  const subtotalMaduro = subtotalMaduroVariosProductos(lineas, ids);
  if (subtotalMaduro <= 0) {
    return {
      ok: false,
      message:
        "El código solo aplica a palta madura. Verde y sazón no tienen descuento.",
    };
  }

  const ref = productosElegibles[0];
  const pct = Math.min(100, Math.max(0, Number(ref.descuentoPorcentaje) || 15));
  const montoDescuento = roundMoney((subtotalMaduro * pct) / 100);

  if (montoDescuento <= 0) {
    return { ok: false, message: "No se pudo aplicar el descuento." };
  }

  return {
    ok: true,
    codigo: code,
    productoId: String(ref._id),
    productoNombre: ref.nombre,
    tipo: "",
    porcentaje: pct,
    subtotalMaduroAfectado: subtotalMaduro,
    montoDescuento,
  };
};

module.exports = {
  normCodigo,
  descuentoProductoActivo,
  stockMaduroProducto,
  subtotalMaduroEnLineas,
  subtotalMaduroVariosProductos,
  calcularDescuentoOnline,
  roundMoney,
};
