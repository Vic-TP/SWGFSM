const GUEST_KEY = "swgfsm_carrito_guest";

export function claveCarritoStorage() {
  try {
    if (localStorage.getItem("cliente_logueado") === "true") {
      const c = JSON.parse(localStorage.getItem("cliente_actual") || "{}");
      const id = String(c.email || c._id || "")
        .trim()
        .toLowerCase();
      if (id) return `swgfsm_carrito_${id}`;
    }
  } catch {
    /* ignore */
  }
  return GUEST_KEY;
}

export function cargarCarrito() {
  try {
    const raw = localStorage.getItem(claveCarritoStorage());
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function guardarCarrito(items) {
  try {
    localStorage.setItem(claveCarritoStorage(), JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function vaciarCarritoStorage() {
  try {
    localStorage.setItem(claveCarritoStorage(), "[]");
  } catch {
    /* ignore */
  }
}
