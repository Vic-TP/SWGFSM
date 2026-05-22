import React, { useEffect, useState, useCallback } from "react";

const API_TAREAS = "http://localhost:5000/api/tareas";

const readTrabajador = () => {
  try {
    const raw = localStorage.getItem("trabajador_actual");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const fmtFecha = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
};

const TareasAsignadas = () => {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const trabajador = readTrabajador();
  const empleadoId = trabajador?._id;

  const cargar = useCallback(async () => {
    if (!empleadoId) {
      setTareas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_TAREAS}/empleado/${empleadoId}`);
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setTareas([]);
        return;
      }
      setTareas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTareas([]);
    } finally {
      setLoading(false);
    }
  }, [empleadoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarEstado = async (id, nuevoEstado) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${API_TAREAS}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "No se pudo actualizar.");
        return;
      }
      await cargar();
    } catch (e) {
      console.error(e);
      alert("Error de conexión.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!empleadoId) {
    return (
      <section className="flex-1 p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No se encontró la sesión del trabajador. Vuelve a iniciar sesión.
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 space-y-6 overflow-y-auto p-8">
      <div className="rounded-3xl border border-lime-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Tareas asignadas</h2>
            <p className="mt-1 text-sm text-gray-600">
              Aquí aparecen las tareas que el administrador te ha asignado. Marca como completada cuando las termines.
            </p>
            {trabajador?.nombres && (
              <p className="mt-2 text-xs text-emerald-800">
                Sesión:{" "}
                <strong>
                  {trabajador.nombres} {trabajador.apellidos || ""}
                </strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => cargar()}
            disabled={loading}
            className="shrink-0 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
          >
            {loading ? "Cargando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-500">Cargando tareas…</p>
      ) : tareas.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
          No tienes tareas asignadas por ahora.
        </div>
      ) : (
        <ul className="space-y-4">
          {tareas.map((t) => {
            const pendiente = t.estado !== "completada";
            const busy = updatingId === t._id;
            return (
              <li
                key={t._id}
                className="rounded-2xl border border-lime-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-emerald-950">{t.titulo}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          pendiente ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {pendiente ? "Pendiente" : "Completada"}
                      </span>
                    </div>
                    {t.descripcion ? (
                      <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{t.descripcion}</p>
                    ) : null}
                    <p className="mt-3 text-[11px] text-gray-400">Asignada: {fmtFecha(t.fechaCreacion)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    {pendiente ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => cambiarEstado(t._id, "completada")}
                        className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-lime-50 hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {busy ? "…" : "Marcar completada"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => cambiarEstado(t._id, "pendiente")}
                        className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {busy ? "…" : "Volver a pendiente"}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default TareasAsignadas;
