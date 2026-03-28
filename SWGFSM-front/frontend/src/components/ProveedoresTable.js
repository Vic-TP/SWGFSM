// src/components/ProveedoresTable.js
import React, { useEffect, useState } from "react";

// Ajusta el puerto si tu backend usa otro
const API_URL_PROVEEDORES = "http://localhost:5000/api/proveedores";

const ProveedoresTable = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(API_URL_PROVEEDORES);
      if (!res.ok) throw new Error("Error al obtener proveedores");

      const data = await res.json();
      setProveedores(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la lista de proveedores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  return (
    <section className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-emerald-900">Proveedores</h1>
        <button
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-5 py-2 rounded-full shadow-md text-sm"
          onClick={() => alert("Aquí abrirás el formulario para añadir proveedor")}
        >
          Añadir proveedor
        </button>
      </div>

      <div className="bg-lime-50 border border-lime-200 rounded-3xl shadow-sm">
        <div className="px-6 py-4 border-b border-lime-200 rounded-t-3xl">
          <h2 className="text-lg font-semibold text-emerald-900">
            Listado de proveedores
          </h2>
          <p className="text-sm text-emerald-800/80 mt-1">
            Aquí podrás registrar y gestionar tus proveedores de palta
            (contacto, número de puesto, condiciones de pago, etc.).
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-600">
            Cargando proveedores...
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : proveedores.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">
            No hay proveedores registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-emerald-900 text-lime-50">
                  <th className="text-left px-6 py-3 rounded-tl-3xl">Nombre</th>
                  <th className="text-left px-6 py-3">N° de puesto</th>
                  <th className="text-left px-6 py-3">Estado</th>
                  <th className="text-center px-6 py-3 rounded-tr-3xl">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((prov, index) => (
                  <tr
                    key={prov._id || index}
                    className={
                      index % 2 === 0
                        ? "bg-lime-50"
                        : "bg-lime-100/60"
                    }
                  >
                    <td className="px-6 py-3 font-medium text-emerald-900">
                      {prov.nombre}
                    </td>
                    <td className="px-6 py-3 text-gray-800">
                      {prov.numeroPuesto}
                    </td>
                    <td className="px-6 py-3">
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
                    <td className="px-6 py-3 text-center">
                      <button
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm"
                        onClick={() =>
                          alert(
                            `Aquí editarás al proveedor: ${prov.nombre}`
                          )
                        }
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
    </section>
  );
};

export default ProveedoresTable;
