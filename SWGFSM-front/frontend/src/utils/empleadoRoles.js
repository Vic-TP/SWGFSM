/** Roles de empleado y acceso al panel admin */

export const ROL_REPARTIDOR = "Repartidor";
export const ROL_PERSONAL_DESPACHO = "Personal de despacho";
export const ROL_VENDEDOR = "Vendedor";

const ROLES_SOLO_DESPACHO = [ROL_REPARTIDOR, ROL_PERSONAL_DESPACHO];

export const PANEL_SECTION_LABELS = {
  dashboard: "Dashboard",
  caja: "Caja Registradora",
  usuarios: "Usuarios",
  productos: "Productos",
  inventario: "Gestión de inventario",
  proveedores: "Proveedores",
  ventas: "Ventas",
  despacho: "Despacho",
  tareasGestion: "Gestión de Tareas",
  tareasAsignadas: "Tareas asignadas",
  prediction: "Predicción",
};

export const PANEL_MENU_ORDER = [
  "dashboard",
  "caja",
  "usuarios",
  "productos",
  "inventario",
  "proveedores",
  "ventas",
  "despacho",
  "tareasGestion",
  "tareasAsignadas",
  "prediction",
];

export const modulosPorDefectoRol = (rol) => {
  const pick = (...keys) =>
    keys.filter((k) => PANEL_MENU_ORDER.includes(k));
  switch (rol) {
    case ROL_VENDEDOR:
      return pick("caja", "ventas", "tareasAsignadas");
    case ROL_REPARTIDOR:
    case ROL_PERSONAL_DESPACHO:
      return pick("despacho");
    case "Administrador de almacén":
      return pick(
        "dashboard",
        "productos",
        "inventario",
        "prediction",
        "tareasAsignadas",
      );
    case "Administrador de compras":
      return pick(
        "dashboard",
        "proveedores",
        "inventario",
        "productos",
        "tareasAsignadas",
      );
    case "Administrador de sistemas":
      return [...PANEL_MENU_ORDER];
    default:
      return pick("caja", "ventas", "tareasAsignadas");
  }
};

export const isPanelRepartidor = (trabajador) =>
  Boolean(trabajador?.rol && ROLES_SOLO_DESPACHO.includes(trabajador.rol));

export const isPanelVendedor = (trabajador) =>
  trabajador?.rol === ROL_VENDEDOR;

export const isPanelAdminCompleto = (trabajador) =>
  Boolean(trabajador?.rol) &&
  !isPanelRepartidor(trabajador) &&
  !isPanelVendedor(trabajador);

export const menuSeccionesPanel = (
  trabajador,
  adminMenuOrder = PANEL_MENU_ORDER,
  sectionLabels = PANEL_SECTION_LABELS,
) => {
  const modulos = trabajador?.modulosHabilitados;
  if (Array.isArray(modulos) && modulos.length > 0) {
    return adminMenuOrder.filter(
      (k) => modulos.includes(k) && Object.hasOwn(sectionLabels, k),
    );
  }
  if (isPanelRepartidor(trabajador)) return ["despacho"];
  if (isPanelVendedor(trabajador)) {
    return ["caja", "ventas", "tareasAsignadas"];
  }
  return adminMenuOrder.filter((k) => Object.hasOwn(sectionLabels, k));
};

export const seccionInicialPanel = (trabajador) => {
  const allowed = menuSeccionesPanel(trabajador);
  return allowed[0] || "dashboard";
};

export const etiquetaRolSidebar = (t) => {
  if (!t?.rol) return "—";
  if (t.rol === ROL_VENDEDOR) return "VENDEDOR";
  if (t.rol === ROL_REPARTIDOR) return "REPARTIDOR";
  if (t.rol === ROL_PERSONAL_DESPACHO) return "REPARTIDOR";
  if (t.rol === "Administrador de sistemas") return "ADMINISTRADOR DEL SISTEMA";
  return String(t.rol).toUpperCase();
};
