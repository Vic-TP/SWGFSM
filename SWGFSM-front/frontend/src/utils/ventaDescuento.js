/** Resumen de descuento en ventas (admin, cliente, boleta). */

export const descuentoVentaDetalle = (venta) => {
  const m = Number(venta?.montoDescuento);
  if (Number.isFinite(m) && m > 0) {
    return {
      monto: m,
      codigo: venta.codigoDescuento,
      porcentaje: venta.descuentoPorcentaje,
    };
  }
  const sub = Number(venta?.subtotal);
  const tot = Number(venta?.total);
  if (Number.isFinite(sub) && Number.isFinite(tot) && sub > tot + 0.001) {
    return {
      monto: Math.round((sub - tot) * 100) / 100,
      codigo: venta?.codigoDescuento,
      porcentaje: venta?.descuentoPorcentaje,
    };
  }
  return null;
};

export const etiquetaDescuentoVenta = (desc) => {
  if (!desc) return null;
  const partes = ["Descuento"];
  if (desc.codigo) partes.push(String(desc.codigo));
  if (desc.porcentaje != null && Number(desc.porcentaje) > 0) {
    partes.push(`${desc.porcentaje}%`);
  }
  return partes.join(" · ");
};
