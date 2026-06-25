/**
 * URL base de la API.
 * - Desarrollo: http://localhost:5000/api (por defecto)
 * - Producción (Vercel): define REACT_APP_API_URL en el panel de Vercel
 *   Ej: https://tu-backend.onrender.com/api
 *   Si front y back comparten dominio con proxy /api, usa REACT_APP_API_URL=/api
 */
const normalize = (base) => String(base || "").replace(/\/+$/, "");

export const API_BASE_URL = normalize(
  process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "/api"
      : "http://localhost:5000/api"),
);

/** Construye URL: apiUrl('ventas') → …/api/ventas */
export const apiUrl = (...segments) => {
  const path = segments
    .filter((s) => s != null && s !== "")
    .join("/")
    .replace(/^\/+/, "");
  return path ? `${API_BASE_URL}/${path}` : API_BASE_URL;
};

export const API_URL_PRODUCTOS = apiUrl("producto");
export const API_URL_PROMOCIONES = apiUrl("promociones");
export const API_URL_INVENTARIO = apiUrl("inventario");
export const API_URL_CLIENTES = apiUrl("clientes");
export const API_URL_EMPLEADOS = apiUrl("empleados");
export const API_URL_VENTAS = apiUrl("ventas");
export const API_URL_PREDICCION = apiUrl("prediccion");
export const API_URL_PROVEEDORES = apiUrl("proveedores");
export const API_URL_TAREAS = apiUrl("tareas");
export const API_URL_DESPACHO = apiUrl("ventas/despacho");
export const API_URL_EMPLEADOS_LOGIN = apiUrl("empleados/login");
