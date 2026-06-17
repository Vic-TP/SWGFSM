/** Descuentos online — solo palta madura, hasta agotar stock maduro. */

export const normCodigoDescuento = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

export const descuentoProductoActivo = (p) =>
  String(p?.descuentoEstado || "").toUpperCase() === "ACTIVO" &&
  normCodigoDescuento(p?.codigoDescuento).length > 0;

export const stockMaduroProducto = (p) =>
  Math.max(0, Number(p?.stockPaltaMadura) || 0);

/** Productos con descuento online activo y stock maduro disponible (para popup tienda). */
export const promocionesDescuentoActivas = (productos) =>
  (productos || []).filter(
    (p) =>
      String(p?.estado || "ACTIVO").toUpperCase() === "ACTIVO" &&
      descuentoProductoActivo(p) &&
      stockMaduroProducto(p) > 0,
  );

/** Agrupa descuentos activos por código único (mismo código en todas las variedades). */
export const descuentosUnicosActivos = (productos) => {
  const map = new Map();
  for (const p of promocionesDescuentoActivas(productos)) {
    const codigo = normCodigoDescuento(p.codigoDescuento);
    if (!codigo) continue;
    if (!map.has(codigo)) {
      map.set(codigo, {
        codigo,
        porcentaje: Math.min(
          100,
          Math.max(0, Number(p.descuentoPorcentaje) || 15),
        ),
        productos: [p],
      });
    } else {
      map.get(codigo).productos.push(p);
    }
  }
  return Array.from(map.values());
};

const roundMoney = (n) => Math.round(Number(n) * 100) / 100;

/** Convierte ítems del carrito a líneas con madurez (como POST ventas). */
export const lineasDesdeCarritoParaDescuento = (cartItems) => {
  const filas = [];
  for (const item of cartItems || []) {
    if (item.esPromocion || item.measure === "pack-promo") continue;

    const pu = Number(item.precioUnitario ?? item.price) || 0;
    const base = {
      productoId: String(item.productoId ?? item.id ?? ""),
      precioUnitario: pu,
      esPromocion: false,
    };

    if (item.esBuckets && item.kgPorMadurez && typeof item.kgPorMadurez === "object") {
      for (const mad of ["verde", "sazon", "maduro"]) {
        const c = Math.max(0, Math.floor(Number(item.kgPorMadurez[mad]) || 0));
        if (c < 1) continue;
        filas.push({
          ...base,
          cantidad: c,
          subtotal: c * pu,
          madurez: mad,
          medida: "1kg",
        });
      }
      continue;
    }

    const cant = Math.max(1, Math.floor(Number(item.cantidadKg ?? item.quantity)) || 1);
    filas.push({
      ...base,
      cantidad: cant,
      subtotal: cant * pu,
      madurez: item.madurez || undefined,
      medida: item.measure || "1kg",
    });
  }
  return filas;
};

export const calcularDescuentoOnlineCliente = ({
  codigo,
  cartItems,
  productosCatalogo,
}) => {
  const code = normCodigoDescuento(codigo);
  if (!code) {
    return { ok: false, message: "Ingresa un código de descuento." };
  }

  const productosConCodigo = (productosCatalogo || []).filter(
    (p) =>
      normCodigoDescuento(p.codigoDescuento) === code &&
      descuentoProductoActivo(p),
  );
  if (!productosConCodigo.length) {
    return { ok: false, message: "Código de descuento no válido." };
  }

  const productosElegibles = productosConCodigo.filter(
    (p) => stockMaduroProducto(p) > 0,
  );
  if (!productosElegibles.length) {
    return {
      ok: false,
      message: "Descuento no disponible: stock de palta madura agotado.",
    };
  }

  const idsElegibles = new Set(
    productosElegibles.map((p) => String(p._id)),
  );
  const lineas = lineasDesdeCarritoParaDescuento(cartItems);
  let subtotalMaduro = 0;
  for (const line of lineas) {
    if (!idsElegibles.has(String(line.productoId))) continue;
    if (String(line.madurez || "").toLowerCase() !== "maduro") continue;
    subtotalMaduro += Number(line.subtotal) || 0;
  }
  subtotalMaduro = roundMoney(subtotalMaduro);

  if (subtotalMaduro <= 0) {
    return {
      ok: false,
      message:
        "El código solo aplica a palta madura. Verde y sazón no tienen descuento.",
    };
  }

  const ref = productosElegibles[0];
  const pct = Math.min(
    100,
    Math.max(0, Number(ref.descuentoPorcentaje) || 15),
  );
  const montoDescuento = roundMoney((subtotalMaduro * pct) / 100);

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
