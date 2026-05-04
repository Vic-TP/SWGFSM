import React, { useEffect, useState, useCallback } from "react";

const API_TAREAS = "http://localhost:5000/api/tareas";
const API_EMPLEADOS = "http://localhost:5000/api/empleados";

const nombreEmpleado = (e) =>
  [e?.nombres, e?.apellidos].filter(Boolean).join(" ").trim() || e?.correo || "—";

const fmtFecha = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
};

const emptyForm = () => ({
  empleadoAsignado: "",
  titulo: "",
  descripcion: "",
  estado: "pendiente",
});

const GestionTareas = () => {
  const [tareas, setTareas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [rT, rE] = await Promise.all([fetch(API_TAREAS), fetch(API_EMPLEADOS)]);
      if (rT.ok) setTareas(await rT.json());
      else setTareas([]);
      if (rE.ok) setEmpleados(await rE.json());
      else setEmpleados([]);
    } catch (e) {
      console.error(e);
      setTareas([]);
      setEmpleados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!form.empleadoAsignado || !form.titulo.trim()) {
      alert("Elige un empleado y escribe un título.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_TAREAS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleadoAsignado: form.empleadoAsignado,
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "No se pudo crear la tarea.");
        return;
      }
      setForm(emptyForm());
      await cargar();
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  const abrirEditar = (t) => {
    const empId = t.empleadoAsignado?._id || t.empleadoAsignado;
    setEditingId(t._id);
    setEditForm({
      empleadoAsignado: empId ? String(empId) : "",
      titulo: t.titulo || "",
      descripcion: t.descripcion || "",
      estado: t.estado === "completada" ? "completada" : "pendiente",
    });
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    if (!editForm.titulo.trim()) {
      alert("El título no puede quedar vacío.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_TAREAS}/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editForm.titulo.trim(),
          descripcion: editForm.descripcion.trim(),
          empleadoAsignado: editForm.empleadoAsignado,
          estado: editForm.estado,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "No se pudo guardar.");
        return;
      }
      setEditingId(null);
      await cargar();
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar esta tarea?")) return;
    try {
      const res = await fetch(`${API_TAREAS}/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "No se pudo eliminar.");
        return;
      }
      await cargar();
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    }
  };

  const empleadosActivos = empleados.filter((e) => String(e.estado || "").toUpperCase() === "ACTIVO");

  return (
    <section className="flex-1 space-y-6 overflow-y-auto p-8">
      <div className="rounded-3xl border border-lime-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-emerald-900">Asignar nueva tarea</h2>
        <p className="mt-1 text-sm text-gray-600">
          Selecciona el empleado, define el título y opcionalmente los detalles. El trabajador la verá en{" "}
          <strong>Tareas asignadas</strong>.
        </p>
        <form onSubmit={handleCrear} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-gray-600 mb-1">Empleado</label>
            <select
              name="empleadoAsignado"
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              value={form.empleadoAsignado}
              onChange={handleFormChange}
              required
            >
              <option value="">— Elige —</option>
              {empleadosActivos.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {nombreEmpleado(emp)} ({emp.rol})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-gray-600 mb-1">Título</label>
            <input
              name="titulo"
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              value={form.titulo}
              onChange={handleFormChange}
              placeholder="Ej. Revisar stock de paltas Hass"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1">Descripción (opcional)</label>
            <textarea
              name="descripcion"
              rows={3}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              value={form.descripcion}
              onChange={handleFormChange}
              placeholder="Indicaciones adicionales…"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-lime-50 hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Crear tarea"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-lime-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-emerald-900">Tareas registradas</h2>
          <button
            type="button"
            onClick={() => cargar()}
            disabled={loading}
            className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
          >
            {loading ? "Cargando…" : "Actualizar"}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-emerald-900 text-lime-50">
              <tr>
                <th className="px-3 py-2 font-semibold">Título</th>
                <th className="px-3 py-2 font-semibold">Empleado</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 font-semibold">Creada</th>
                <th className="px-3 py-2 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                    Cargando…
                  </td>
                </tr>
              ) : tareas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                    Aún no hay tareas. Crea la primera arriba.
                  </td>
                </tr>
              ) : (
                tareas.map((t) => {
                  const emp = t.empleadoAsignado;
                  const nombre = emp && typeof emp === "object" ? nombreEmpleado(emp) : "—";
                  return (
                    <tr key={t._id} className="border-t border-gray-100 hover:bg-lime-50/50">
                      <td className="px-3 py-2 font-medium text-gray-900">{t.titulo}</td>
                      <td className="px-3 py-2 text-gray-600">{nombre}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            t.estado === "completada"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {t.estado === "completada" ? "Completada" : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtFecha(t.fechaCreacion)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => abrirEditar(t)}
                          className="mr-2 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(t._id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-emerald-900">Editar tarea</h3>
            <form onSubmit={handleGuardarEdicion} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Empleado</label>
                <select
                  name="empleadoAsignado"
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  value={editForm.empleadoAsignado}
                  onChange={(e) => setEditForm((p) => ({ ...p, empleadoAsignado: e.target.value }))}
                  required
                >
                  {empleados.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {nombreEmpleado(emp)} ({emp.rol})
                      {String(emp.estado || "").toUpperCase() !== "ACTIVO" ? " — inactivo" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Título</label>
                <input
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  value={editForm.titulo}
                  onChange={(e) => setEditForm((p) => ({ ...p, titulo: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm((p) => ({ ...p, descripcion: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Estado</label>
                <select
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  value={editForm.estado}
                  onChange={(e) => setEditForm((p) => ({ ...p, estado: e.target.value }))}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="completada">Completada</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-lime-50 hover:bg-emerald-600 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default GestionTareas;
