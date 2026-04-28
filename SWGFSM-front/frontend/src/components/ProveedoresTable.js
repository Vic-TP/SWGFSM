// src/components/ProveedoresTable.js
import React, { useEffect, useState, useCallback } from "react";

const API_URL_PROVEEDORES = "http://localhost:5000/api/proveedores";

const inp =
  "w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400";

const emptyProveedor = () => ({
  nombre: "",
  numeroPuesto: "",
  telefono: "",
  nombreMercado: "",
  entidadBancaria: "",
  numeroCuenta: "",
  estado: "ACTIVO",
});

const ProveedoresTable = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [form, setForm] = useState(emptyProveedor());
  const [editId, setEditId] = useState(null);

  const cargarProveedores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(API_URL_PROVEEDORES);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProveedores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la lista de proveedores.");
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProveedores();
  }, [cargarProveedores]);

  const abrirNuevo = () => {
    setModoEditar(false);
    setEditId(null);
    setForm(emptyProveedor());
    setShowModal(true);
  };

  const abrirEditar = (prov) => {
    setModoEditar(true);
    setEditId(prov._id);
    setForm({
      nombre: prov.nombre || "",
      numeroPuesto: prov.numeroPuesto || "",
      telefono: prov.telefono || "",
      nombreMercado: prov.nombreMercado || "",
      entidadBancaria: prov.entidadBancaria || "",
      numeroCuenta: prov.numeroCuenta || "",
      estado: prov.estado || "ACTIVO",
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      window.alert("Ingresa el nombre del proveedor.");
      return;
    }
    try {
      const url = modoEditar ? `${API_URL_PROVEEDORES}/${editId}` : API_URL_PROVEEDORES;
      const method = modoEditar ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          numeroPuesto: form.numeroPuesto.trim(),
          telefono: form.telefono.trim(),
          nombreMercado: form.nombreMercado.trim(),
          entidadBancaria: form.entidadBancaria.trim(),
          numeroCuenta: form.numeroCuenta.trim(),
          estado: form.estado,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Error al guardar (${res.status})`);
      }
      setShowModal(false);
      await cargarProveedores();
    } catch (err) {
      console.error(err);
      window.alert(err.message || "No se pudo guardar el proveedor.");
    }
  };

  return (
    <section className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-emerald-900">Proveedores</h1>
        <button
          type="button"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-5 py-2 rounded-full shadow-md text-sm"
          onClick={abrirNuevo}
        >
          Añadir proveedor
        </button>
      </div>

      <div className="bg-lime-50 border border-lime-200 rounded-3xl shadow-sm">
        <div className="px-6 py-4 border-b border-lime-200 rounded-t-3xl">
          <h2 className="text-lg font-semibold text-emerald-900">Listado de proveedores</h2>
          <p className="text-sm text-emerald-800/80 mt-1">
            Registra y gestiona tus proveedores (contacto, puesto, mercado, datos bancarios).
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-600">Cargando proveedores...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : proveedores.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No hay proveedores registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-emerald-900 text-lime-50">
                  <th className="text-left px-4 py-3 rounded-tl-3xl">Nombre</th>
                  <th className="text-left px-4 py-3">N° puesto</th>
                  <th className="text-left px-4 py-3">Celular</th>
                  <th className="text-left px-4 py-3">Mercado</th>
                  <th className="text-left px-4 py-3">Entidad banc.</th>
                  <th className="text-left px-4 py-3">N° cuenta</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-center px-4 py-3 rounded-tr-3xl">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((prov, index) => (
                  <tr
                    key={prov._id || index}
                    className={index % 2 === 0 ? "bg-lime-50" : "bg-lime-100/60"}
                  >
                    <td className="px-4 py-3 font-medium text-emerald-900">{prov.nombre}</td>
                    <td className="px-4 py-3 text-gray-800">{prov.numeroPuesto || "—"}</td>
                    <td className="px-4 py-3 text-gray-800">{prov.telefono || "—"}</td>
                    <td className="px-4 py-3 text-gray-800">{prov.nombreMercado || "—"}</td>
                    <td className="px-4 py-3 text-gray-800">{prov.entidadBancaria || "—"}</td>
                    <td className="px-4 py-3 text-gray-800">{prov.numeroCuenta || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          prov.estado === "ACTIVO"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {prov.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm"
                        onClick={() => abrirEditar(prov)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold mb-4 text-emerald-900">
              {modoEditar ? "Editar proveedor" : "Nuevo proveedor"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1 text-gray-600">Nombre</label>
                <input
                  className={inp}
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1 text-gray-600">N° puesto</label>
                <input
                  className={inp}
                  type="text"
                  name="numeroPuesto"
                  value={form.numeroPuesto}
                  onChange={handleChange}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1 text-gray-600">Núm. celular</label>
                <input
                  className={inp}
                  type="tel"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1 text-gray-600">Nom. mercado</label>
                <input
                  className={inp}
                  type="text"
                  name="nombreMercado"
                  value={form.nombreMercado}
                  onChange={handleChange}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1 text-gray-600">Entidad bancaria</label>
                <input
                  className={inp}
                  type="text"
                  name="entidadBancaria"
                  value={form.entidadBancaria}
                  onChange={handleChange}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1 text-gray-600">N° cuenta</label>
                <input
                  className={inp}
                  type="text"
                  name="numeroCuenta"
                  value={form.numeroCuenta}
                  onChange={handleChange}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1 text-gray-600">Estado</label>
                <select className={inp} name="estado" value={form.estado} onChange={handleChange}>
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-full text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 text-white rounded-full hover:bg-emerald-800">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProveedoresTable;
