// src/components/VentasAdmin.js - VERSIÓN CORREGIDA

import React, { useState, useEffect } from "react";

const API_URL_VENTAS = "http://localhost:5000/api/ventas";

const VentasAdmin = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");

  // Cargar ventas
  const fetchVentas = async () => {
    try {
      setLoading(true);
      console.log("Cargando ventas desde:", API_URL_VENTAS);
      const response = await fetch(API_URL_VENTAS);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Ventas cargadas:", data);
      setVentas(data);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
      alert("No se pudieron cargar las ventas. Verifica el backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentas();
  }, []);

  // Cambiar estado de venta
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      console.log(`Cambiando venta ${id} a estado: ${nuevoEstado}`);
      const response = await fetch(`${API_URL_VENTAS}/${id}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      
      if (response.ok) {
        alert(`Estado actualizado a ${nuevoEstado}`);
        fetchVentas();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("Error de conexión");
    }
  };

  // Eliminar venta
  const eliminarVenta = async (id) => {
    if (!window.confirm("¿Eliminar esta venta permanentemente?")) return;
    
    try {
      const response = await fetch(`${API_URL_VENTAS}/${id}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        alert("Venta eliminada");
        fetchVentas();
      } else {
        alert("Error al eliminar");
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("Error de conexión");
    }
  };

  // Filtrar ventas
  const ventasFiltradas = ventas.filter(venta => {
    const matchSearch = searchTerm === "" || 
      venta.cliente?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filterEstado === "todos" || venta.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const getEstadoColor = (estado) => {
    switch(estado) {
      case "Entregado": return "bg-green-100 text-green-700";
      case "Enviado": return "bg-blue-100 text-blue-700";
      case "Pendiente": return "bg-amber-100 text-amber-700";
      case "Cancelado": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // Calcular totales
  const totalVentas = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
  const ventasHoy = ventas.filter(v => {
    const hoy = new Date().toDateString();
    return new Date(v.fecha).toDateString() === hoy;
  }).reduce((sum, v) => sum + (v.total || 0), 0);
  const pendientes = ventas.filter(v => v.estado === "Pendiente").length;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-emerald-900">Registro de Ventas</h1>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-emerald-500">
          <p className="text-gray-400 text-xs uppercase">Total Ventas</p>
          <p className="text-2xl font-bold text-gray-800">S/ {totalVentas.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-blue-500">
          <p className="text-gray-400 text-xs uppercase">Ventas Hoy</p>
          <p className="text-2xl font-bold text-gray-800">S/ {ventasHoy.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-amber-500">
          <p className="text-gray-400 text-xs uppercase">Pedidos Pendientes</p>
          <p className="text-2xl font-bold text-gray-800">{pendientes}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-purple-500">
          <p className="text-gray-400 text-xs uppercase">Total Transacciones</p>
          <p className="text-2xl font-bold text-gray-800">{ventas.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Buscar por cliente..."
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Enviado">Enviado</option>
              <option value="Entregado">Entregado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
            <button
              onClick={fetchVentas}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de ventas */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">N° Venta</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Productos</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Método</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-400">Cargando...</td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-400">No hay ventas registradas</td>
                </tr>
              ) : (
                ventasFiltradas.map((venta) => (
                  <tr key={venta._id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{venta.numeroVenta || "—"}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(venta.fecha).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-800">{venta.cliente}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {venta.productos?.slice(0, 2).map(p => `${p.nombre} x${p.cantidad}`).join(", ")}
                      {venta.productos?.length > 2 && " ..."}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-emerald-700">
                      S/ {venta.total?.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-center capitalize text-gray-600">{venta.metodoPago}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getEstadoColor(venta.estado)}`}>
                        {venta.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <select
                          value={venta.estado}
                          onChange={(e) => cambiarEstado(venta._id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Enviado">Enviado</option>
                          <option value="Entregado">Entregado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                        <button
                          onClick={() => eliminarVenta(venta._id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VentasAdmin;