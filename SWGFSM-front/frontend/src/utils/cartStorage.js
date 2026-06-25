const GUEST_KEY = "swgfsm_carrito_guest";

export function claveCarritoParaCliente(cliente) {
  const id = String(cliente?.email || cliente?.correo || cliente?._id || "")
    .trim()
    .toLowerCase();
  if (!id) return GUEST_KEY;
  return `swgfsm_carrito_${id}`;
}

export function claveCarritoStorage() {
  try {
    if (localStorage.getItem("cliente_logueado") === "true") {
      const c = JSON.parse(localStorage.getItem("cliente_actual") || "{}");
      const key = claveCarritoParaCliente(c);
      if (key !== GUEST_KEY) return key;
    }
  } catch {
    /* ignore */
  }
  return GUEST_KEY;
}

function lineaCarritoKey(item) {
  if (item?.esPromocion && item?.promocionId) {
    return `promo:${String(item.promocionId)}`;
  }
  const pid = String(item?.productoId ?? item?.id ?? "");
  const measure = item?.measure ?? "1kg";
  return `prod:${pid}:${measure}`;
}

/** Une ítems del carrito invitado con los del usuario (suma cantidades si coinciden). */
export function fusionarItemsCarrito(existing, incoming) {
  const result = [...(Array.isArray(existing) ? existing : [])];
  for (const item of Array.isArray(incoming) ? incoming : []) {
    const key = lineaCarritoKey(item);
    const ix = result.findIndex((i) => lineaCarritoKey(i) === key);
    if (ix < 0) {
      result.push(item);
      continue;
    }
    const prev = result[ix];
    if (item.esPromocion) {
      const newQty = (Number(prev.quantity) || 0) + (Number(item.quantity) || 0);
      result[ix] = { ...prev, quantity: newQty, cantidadPacks: newQty };
    } else if (prev.esBuckets || item.esBuckets) {
      const mergedKg = { ...(prev.kgPorMadurez || {}) };
      for (const [k, v] of Object.entries(item.kgPorMadurez || {})) {
        mergedKg[k] = (Number(mergedKg[k]) || 0) + (Number(v) || 0);
      }
      const totalKg = Object.values(mergedKg).reduce(
        (a, b) => a + (Number(b) || 0),
        0,
      );
      result[ix] = {
        ...prev,
        kgPorMadurez: mergedKg,
        quantity: totalKg,
        cantidadKg: totalKg,
      };
    } else {
      const newQty = (Number(prev.quantity) || 0) + (Number(item.quantity) || 0);
      result[ix] = { ...prev, quantity: newQty, cantidadKg: newQty };
    }
  }
  return result;
}

/** Tras login/registro: pasa el carrito de invitado al del cliente y vacía el invitado. */
export function migrarCarritoInvitadoTrasLogin(cliente) {
  try {
    const guestRaw = localStorage.getItem(GUEST_KEY);
    if (!guestRaw) return false;
    const guestItems = JSON.parse(guestRaw);
    if (!Array.isArray(guestItems) || guestItems.length === 0) return false;

    const userKey = claveCarritoParaCliente(cliente);
    if (!userKey || userKey === GUEST_KEY) return false;

    let userItems = [];
    try {
      const userRaw = localStorage.getItem(userKey);
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        userItems = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      userItems = [];
    }

    const merged = fusionarItemsCarrito(userItems, guestItems);
    localStorage.setItem(userKey, JSON.stringify(merged));
    localStorage.setItem(GUEST_KEY, "[]");
    return true;
  } catch {
    return false;
  }
}

export function cargarCarrito() {
  try {
    if (localStorage.getItem("cliente_logueado") === "true") {
      const c = JSON.parse(localStorage.getItem("cliente_actual") || "{}");
      migrarCarritoInvitadoTrasLogin(c);
    }
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
