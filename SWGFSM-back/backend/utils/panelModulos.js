/** Módulos del panel admin (mismas claves que el frontend) */

const PANEL_MENU_ORDER = [
  'dashboard',
  'caja',
  'usuarios',
  'productos',
  'inventario',
  'proveedores',
  'ventas',
  'despacho',
  'tareasGestion',
  'tareasAsignadas',
  'prediction',
];

const modulosPorDefectoRol = (rol) => {
  const pick = (...keys) => keys.filter((k) => PANEL_MENU_ORDER.includes(k));
  switch (rol) {
    case 'Vendedor':
      return pick('caja', 'ventas', 'tareasAsignadas');
    case 'Repartidor':
    case 'Personal de despacho':
      return pick('despacho');
    case 'Administrador de almacén':
      return pick(
        'dashboard',
        'productos',
        'inventario',
        'prediction',
        'tareasAsignadas',
      );
    case 'Administrador de compras':
      return pick(
        'dashboard',
        'proveedores',
        'inventario',
        'productos',
        'tareasAsignadas',
      );
    case 'Administrador de sistemas':
      return [...PANEL_MENU_ORDER];
    default:
      return pick('caja', 'ventas', 'tareasAsignadas');
  }
};

const normalizarModulosHabilitados = (raw, rol) => {
  if (!Array.isArray(raw)) return modulosPorDefectoRol(rol);
  const valid = raw.filter((m) => PANEL_MENU_ORDER.includes(String(m)));
  return valid.length ? valid : modulosPorDefectoRol(rol);
};

module.exports = {
  PANEL_MENU_ORDER,
  modulosPorDefectoRol,
  normalizarModulosHabilitados,
};
