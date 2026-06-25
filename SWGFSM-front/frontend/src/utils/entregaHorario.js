/** Entregas: lunes a sábado, 6:00 a.m. – 4:00 p.m. */

export const HORA_ENTREGA_MIN = 6;
export const HORA_ENTREGA_MAX = 16;

const pad2 = (n) => String(n).padStart(2, "0");

export const formatYMD = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const esDiaEntregaValido = (date) => {
  const d = date instanceof Date ? date : new Date(`${date}T12:00:00`);
  const day = d.getDay();
  return day >= 1 && day <= 6;
};

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const formatFechaLarga = (ymdOrDate) => {
  const d =
    typeof ymdOrDate === "string"
      ? new Date(`${ymdOrDate}T12:00:00`)
      : ymdOrDate;
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

export const formatHora12 = (hora24) => {
  const h = Number(String(hora24).split(":")[0]);
  if (!Number.isFinite(h)) return hora24;
  if (h === 0) return "12:00 a.m.";
  if (h < 12) return `${h}:00 a.m.`;
  if (h === 12) return "12:00 p.m.";
  return `${h - 12}:00 p.m.`;
};

export const fechasEntregaDisponibles = (cantidad = 21) => {
  const out = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let guard = 0;
  while (out.length < cantidad && guard < 90) {
    if (esDiaEntregaValido(cursor)) {
      const value = formatYMD(cursor);
      out.push({ value, label: formatFechaLarga(cursor) });
    }
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return out;
};

export const horariosEntregaDisponibles = (fechaYMD) => {
  const slots = [];
  for (let h = HORA_ENTREGA_MIN; h <= HORA_ENTREGA_MAX; h += 1) {
    slots.push({
      value: `${pad2(h)}:00`,
      label: formatHora12(h),
    });
  }
  const hoy = formatYMD(new Date());
  if (fechaYMD !== hoy) return slots;
  const horaActual = new Date().getHours();
  return slots.filter((s) => Number(s.value.split(":")[0]) > horaActual);
};

export const validarEntregaAgendada = (fechaYMD, horario) => {
  if (!fechaYMD || !horario) {
    return { ok: false, message: "Selecciona fecha y horario de entrega." };
  }
  if (!esDiaEntregaValido(fechaYMD)) {
    return {
      ok: false,
      message: "Las entregas son de lunes a sábado solamente.",
    };
  }
  const h = Number(String(horario).split(":")[0]);
  if (!Number.isFinite(h) || h < HORA_ENTREGA_MIN || h > HORA_ENTREGA_MAX) {
    return {
      ok: false,
      message: "El horario debe ser entre 6:00 a.m. y 4:00 p.m.",
    };
  }
  const hoy = formatYMD(new Date());
  if (fechaYMD < hoy) {
    return { ok: false, message: "La fecha de entrega no puede ser pasada." };
  }
  if (fechaYMD === hoy && h <= new Date().getHours()) {
    return {
      ok: false,
      message: "Elige un horario posterior a la hora actual.",
    };
  }
  return { ok: true };
};

export const etiquetaFechaHorarioEntrega = (fechaEntrega, horarioEntrega) => {
  if (!fechaEntrega || !horarioEntrega) return null;
  const ymd =
    typeof fechaEntrega === "string" && fechaEntrega.length >= 10
      ? fechaEntrega.slice(0, 10)
      : formatYMD(new Date(fechaEntrega));
  return `${formatFechaLarga(ymd)}, ${formatHora12(horarioEntrega)}`;
};

export const MESES_CALENDARIO = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const DIAS_SEMANA_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Fecha elegible: lun–sáb, no pasada y con al menos un horario libre */
export const esFechaEntregaSeleccionable = (ymd) => {
  if (!ymd) return false;
  const hoy = formatYMD(new Date());
  if (ymd < hoy) return false;
  if (!esDiaEntregaValido(ymd)) return false;
  return horariosEntregaDisponibles(ymd).length > 0;
};

export const parseYMD = (ymd) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

/** Celdas del mes (null = vacío). Lunes como primer día de la semana */
export const generarCeldasMes = (year, month) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= lastDay; d += 1) {
    const ymd = formatYMD(new Date(year, month, d));
    const dow = new Date(year, month, d).getDay();
    cells.push({
      day: d,
      value: ymd,
      seleccionable: esFechaEntregaSeleccionable(ymd),
      esDomingo: dow === 0,
      esHoy: ymd === formatYMD(new Date()),
    });
  }
  return cells;
};

export const primeraFechaEntregaDisponible = () => {
  const fechas = fechasEntregaDisponibles(60);
  const conHorario = fechas.find(
    (f) => horariosEntregaDisponibles(f.value).length > 0,
  );
  return conHorario?.value || fechas[0]?.value || formatYMD(new Date());
};

const TOLERANCIA_ENTREGA_MS = 30 * 60 * 1000;

const combinarFechaHorarioEntrega = (fechaEntrega, horarioEntrega) => {
  const d =
    typeof fechaEntrega === "string"
      ? new Date(`${fechaEntrega.slice(0, 10)}T12:00:00`)
      : fechaEntrega instanceof Date
        ? fechaEntrega
        : new Date(fechaEntrega);
  const fechaStr = formatYMD(d);
  const [y, m, day] = fechaStr.split("-").map(Number);
  const h = Number(String(horarioEntrega || "").split(":")[0]);
  const mins = Number(String(horarioEntrega || "").split(":")[1]) || 0;
  return new Date(y, m - 1, day, h, mins, 0, 0);
};

/** Solo marcar Entregado el día programado, ±30 min del horario acordado */
export const evaluarVentanaMarcarEntregado = (
  fechaEntrega,
  horarioEntrega,
  ahora = new Date(),
) => {
  if (!fechaEntrega || !horarioEntrega) {
    return { ok: true };
  }

  const etiqueta = etiquetaFechaHorarioEntrega(fechaEntrega, horarioEntrega);
  const fechaStr =
    typeof fechaEntrega === "string" && fechaEntrega.length >= 10
      ? fechaEntrega.slice(0, 10)
      : formatYMD(
          fechaEntrega instanceof Date
            ? fechaEntrega
            : new Date(fechaEntrega),
        );
  const hoy = formatYMD(ahora);

  if (fechaStr !== hoy) {
    if (fechaStr > hoy) {
      return {
        ok: false,
        message: `Aún no es el día de entrega. Programado: ${etiqueta}.`,
      };
    }
    return {
      ok: false,
      message: `La fecha de entrega ya pasó (${etiqueta}).`,
    };
  }

  const programado = combinarFechaHorarioEntrega(fechaEntrega, horarioEntrega);
  const diffMs = ahora.getTime() - programado.getTime();
  if (Math.abs(diffMs) <= TOLERANCIA_ENTREGA_MS) {
    return { ok: true };
  }
  if (diffMs < 0) {
    return {
      ok: false,
      message: `Aún no puedes marcar Entregado. Solo desde 30 min antes del horario (${etiqueta}).`,
    };
  }
  return {
    ok: false,
    message: `Fuera de la ventana de entrega (±30 min). Programado: ${etiqueta}.`,
  };
};

export const puedeMarcarEntregado = (fechaEntrega, horarioEntrega, ahora) =>
  evaluarVentanaMarcarEntregado(fechaEntrega, horarioEntrega, ahora).ok;
