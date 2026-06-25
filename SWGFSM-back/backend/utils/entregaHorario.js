/** Entregas online: lunes a sábado, 6:00 – 16:00 */

const HORA_MIN = 6;
const HORA_MAX = 16;

const pad2 = (n) => String(n).padStart(2, '0');

const formatYMD = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const esDiaEntregaValido = (date) => {
  const d = date instanceof Date ? date : new Date(`${date}T12:00:00`);
  const day = d.getDay();
  return day >= 1 && day <= 6;
};

const validarEntregaAgendada = (fechaYMD, horario) => {
  if (!fechaYMD || !horario) {
    return { ok: false, message: 'Indica fecha y horario de entrega.' };
  }
  const fechaStr = String(fechaYMD).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return { ok: false, message: 'Fecha de entrega inválida.' };
  }
  if (!esDiaEntregaValido(fechaStr)) {
    return {
      ok: false,
      message: 'Las entregas son de lunes a sábado solamente.',
    };
  }
  const h = Number(String(horario).split(':')[0]);
  if (!Number.isFinite(h) || h < HORA_MIN || h > HORA_MAX) {
    return {
      ok: false,
      message: 'El horario debe ser entre 6:00 a.m. y 4:00 p.m.',
    };
  }
  const hoy = formatYMD(new Date());
  if (fechaStr < hoy) {
    return { ok: false, message: 'La fecha de entrega no puede ser pasada.' };
  }
  if (fechaStr === hoy && h <= new Date().getHours()) {
    return {
      ok: false,
      message: 'El horario de entrega debe ser posterior a la hora actual.',
    };
  }
  return { ok: true, fechaStr, horario: `${pad2(h)}:00` };
};

const parseFechaEntrega = (fechaYMD) => {
  const fechaStr = String(fechaYMD).trim().slice(0, 10);
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

const etiquetaFechaHorarioEntrega = (fechaEntrega, horarioEntrega) => {
  if (!fechaEntrega || !horarioEntrega) return '';
  const d =
    fechaEntrega instanceof Date
      ? fechaEntrega
      : new Date(`${String(fechaEntrega).slice(0, 10)}T12:00:00`);
  const dias = [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
  ];
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  const h = Number(String(horarioEntrega).split(':')[0]);
  let horaTxt = horarioEntrega;
  if (Number.isFinite(h)) {
    if (h < 12) horaTxt = `${h}:00 a.m.`;
    else if (h === 12) horaTxt = '12:00 p.m.';
    else horaTxt = `${h - 12}:00 p.m.`;
  }
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}, ${horaTxt}`;
};

const horaEntregaNum = (horario) => {
  const h = Number(String(horario || '').split(':')[0]);
  return Number.isFinite(h) ? h : 0;
};

const TOLERANCIA_ENTREGA_MS = 30 * 60 * 1000;

const combinarFechaHorarioEntrega = (fechaEntrega, horarioEntrega) => {
  const d =
    fechaEntrega instanceof Date
      ? fechaEntrega
      : new Date(`${String(fechaEntrega).slice(0, 10)}T12:00:00`);
  const fechaStr = formatYMD(d);
  const [y, m, day] = fechaStr.split('-').map(Number);
  const h = horaEntregaNum(horarioEntrega);
  const mins = Number(String(horarioEntrega || '').split(':')[1]) || 0;
  return new Date(y, m - 1, day, h, mins, 0, 0);
};

/** Solo marcar Entregado el día programado, ±30 min del horario acordado */
const evaluarVentanaMarcarEntregado = (
  fechaEntrega,
  horarioEntrega,
  ahora = new Date(),
) => {
  if (!fechaEntrega || !horarioEntrega) {
    return { ok: true };
  }

  const etiqueta = etiquetaFechaHorarioEntrega(fechaEntrega, horarioEntrega);
  const fechaStr = formatYMD(
    fechaEntrega instanceof Date
      ? fechaEntrega
      : new Date(`${String(fechaEntrega).slice(0, 10)}T12:00:00`),
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

/** Agrupa pedidos online por fecha + horario, ordenados cronológicamente */
const agruparPedidosDespacho = (ventas) => {
  const list = Array.isArray(ventas) ? ventas : [];
  const sorted = [...list].sort((a, b) => {
    const da = new Date(a.fechaEntrega).getTime();
    const db = new Date(b.fechaEntrega).getTime();
    if (da !== db) return da - db;
    const ha = horaEntregaNum(a.horarioEntrega);
    const hb = horaEntregaNum(b.horarioEntrega);
    if (ha !== hb) return ha - hb;
    return String(a.numeroVenta || '').localeCompare(String(b.numeroVenta || ''));
  });

  const grupos = [];
  const map = new Map();
  for (const v of sorted) {
    const fechaStr = formatYMD(v.fechaEntrega);
    const horario = String(v.horarioEntrega || '').trim();
    const key = `${fechaStr}|${horario}`;
    if (!map.has(key)) {
      const grupo = {
        fechaEntrega: fechaStr,
        horarioEntrega: horario,
        etiqueta: etiquetaFechaHorarioEntrega(v.fechaEntrega, horario),
        pedidos: [],
      };
      map.set(key, grupo);
      grupos.push(grupo);
    }
    map.get(key).pedidos.push(v);
  }
  return { grupos, totalPedidos: sorted.length };
};

const generarCodigoEntrega = () =>
  String(Math.floor(100 + Math.random() * 900));

const omitirCodigoEntrega = (venta) => {
  if (!venta || typeof venta !== 'object') return venta;
  const { codigoEntrega, ...rest } = venta;
  return rest;
};

module.exports = {
  validarEntregaAgendada,
  parseFechaEntrega,
  etiquetaFechaHorarioEntrega,
  agruparPedidosDespacho,
  formatYMD,
  evaluarVentanaMarcarEntregado,
  generarCodigoEntrega,
  omitirCodigoEntrega,
};
