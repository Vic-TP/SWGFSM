import React, { useMemo, useState, useEffect } from "react";
import {
  generarCeldasMes,
  MESES_CALENDARIO,
  DIAS_SEMANA_CORTO,
  parseYMD,
  formatFechaLarga,
} from "../utils/entregaHorario";

const CalendarioEntrega = ({ value, onChange, disabled = false }) => {
  const fechaSel = value ? parseYMD(value) : new Date();
  const [mesVisible, setMesVisible] = useState(() => ({
    year: fechaSel.getFullYear(),
    month: fechaSel.getMonth(),
  }));

  useEffect(() => {
    if (!value) return;
    const d = parseYMD(value);
    setMesVisible({ year: d.getFullYear(), month: d.getMonth() });
  }, [value]);

  const celdas = useMemo(
    () => generarCeldasMes(mesVisible.year, mesVisible.month),
    [mesVisible.year, mesVisible.month],
  );

  const hoy = new Date();
  const minMes = { year: hoy.getFullYear(), month: hoy.getMonth() };
  const maxMes = useMemo(() => {
    const d = new Date(hoy);
    d.setMonth(d.getMonth() + 3);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, []);

  const puedeRetroceder =
    mesVisible.year > minMes.year ||
    (mesVisible.year === minMes.year && mesVisible.month > minMes.month);

  const puedeAvanzar =
    mesVisible.year < maxMes.year ||
    (mesVisible.year === maxMes.year && mesVisible.month < maxMes.month);

  const cambiarMes = (delta) => {
    setMesVisible((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="rounded-xl border border-[#d4e9e2] bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={disabled || !puedeRetroceder}
          onClick={() => cambiarMes(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <p className="text-sm font-bold text-[#1e3932]">
          {MESES_CALENDARIO[mesVisible.month]} {mesVisible.year}
        </p>
        <button
          type="button"
          disabled={disabled || !puedeAvanzar}
          onClick={() => cambiarMes(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {DIAS_SEMANA_CORTO.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {celdas.map((celda, idx) => {
          if (!celda) {
            return <span key={`empty-${idx}`} className="aspect-square" />;
          }
          const activa = value === celda.value;
          const bloqueada = !celda.seleccionable || disabled;
          return (
            <button
              key={celda.value}
              type="button"
              disabled={bloqueada}
              onClick={() => onChange(celda.value)}
              title={
                celda.esDomingo
                  ? "Sin entregas los domingos"
                  : bloqueada
                    ? "No disponible"
                    : formatFechaLarga(celda.value)
              }
              className={`aspect-square rounded-lg text-sm font-medium transition ${
                activa
                  ? "bg-[#006241] text-white shadow-md"
                  : bloqueada
                    ? celda.esDomingo
                      ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                      : "text-gray-300 cursor-not-allowed"
                    : celda.esHoy
                      ? "border-2 border-[#006241]/40 text-[#1e3932] hover:bg-[#eef7f3]"
                      : "text-gray-700 hover:bg-[#eef7f3]"
              }`}
            >
              {celda.day}
            </button>
          );
        })}
      </div>

      {value && (
        <p className="mt-3 text-center text-xs text-[#006241] font-medium">
          {formatFechaLarga(value)}
        </p>
      )}
    </div>
  );
};

export default CalendarioEntrega;
