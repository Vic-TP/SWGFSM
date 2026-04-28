// src/components/VentasAdmin.js - VERSIÓN CORREGIDA

import React, { useState, useEffect } from "react";

const API_URL_VENTAS = "http://localhost:5000/api/ventas";

const VentasAdmin = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterOrigen, setFilterOrigen] = useState("todos");
  const [ventaDetalle, setVentaDetalle] = useState(null);

  /** CAJA = trabajador en caja; ONLINE = cliente compró en la web */
  const etiquetaOrigen = (venta) => {
    if (venta.origen === "CAJA") return "Caja registradora";
    if (venta.origen === "ONLINE") return "Pedido web";
    return "Sin indicar";
  };

  const codigoOrigen = (venta) => {
    if (venta.origen === "CAJA") return "CAJA";
    if (venta.origen === "ONLINE") return "ONLINE";
    return "SIN";
  };

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

  const cambiarOrigen = async (id, nuevoOrigen) => {
    try {
      const response = await fetch(`${API_URL_VENTAS}/${id}/origen`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origen: nuevoOrigen }),
      });
      if (response.ok) {
        fetchVentas();
      } else {
        const err = await response.json();
        alert(err.message || "No se pudo actualizar el origen");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    }
  };

  // Cambiar estado de venta (el backend devuelve stock al cancelar → colección producto)
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const sid = String(id);
      const response = await fetch(`${API_URL_VENTAS}/${encodeURIComponent(sid)}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        window.dispatchEvent(new Event("swgfsm-stock-actualizado"));
        setVentaDetalle((prev) =>
          prev && String(prev._id) === sid ? { ...prev, ...data } : prev
        );
        alert(`Estado actualizado a ${nuevoEstado}`);
        await fetchVentas();
      } else {
        alert(data.message || "No se pudo actualizar el estado (¿stock insuficiente?).");
      }
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("Error de conexión");
    }
  };

  /** Recarga ventas desde el servidor, sincroniza el modal abierto y avisa a Caja/Productos para refrescar stock */
  const refrescarInventarioYDetalle = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL_VENTAS);
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(String(response.status));
      const list = Array.isArray(data) ? data : [];
      setVentas(list);
      setVentaDetalle((prev) => {
        if (!prev?._id) return prev;
        const sid = String(prev._id);
        const fresh = list.find((v) => String(v._id) === sid);
        return fresh ? { ...fresh } : prev;
      });
      window.dispatchEvent(new Event("swgfsm-stock-actualizado"));
    } catch (e) {
      console.error(e);
      alert("No se pudo actualizar el listado de ventas.");
    } finally {
      setLoading(false);
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
        window.dispatchEvent(new Event("swgfsm-stock-actualizado"));
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
  const ventasFiltradas = ventas.filter((venta) => {
    const matchSearch =
      searchTerm === "" || venta.cliente?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filterEstado === "todos" || venta.estado === filterEstado;
    const o = codigoOrigen(venta);
    const matchOrigen =
      filterOrigen === "todos" ||
      (filterOrigen === "SIN" ? o === "SIN" : o === filterOrigen);
    return matchSearch && matchEstado && matchOrigen;
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
  const totalCaja = ventas
    .filter((v) => v.origen === "CAJA")
    .reduce((sum, v) => sum + (v.total || 0), 0);
  const totalPedidoWeb = ventas
    .filter((v) => v.origen === "ONLINE")
    .reduce((sum, v) => sum + (v.total || 0), 0);
  const totalSinIndicar = ventas
    .filter((v) => v.origen !== "CAJA" && v.origen !== "ONLINE")
    .reduce((sum, v) => sum + (v.total || 0), 0);
  const ventasHoy = ventas.filter(v => {
    const hoy = new Date().toDateString();
    return new Date(v.fecha).toDateString() === hoy;
  }).reduce((sum, v) => sum + (v.total || 0), 0);
  const pendientes = ventas.filter(v => v.estado === "Pendiente").length;

  const abrirDetalle = (venta) => setVentaDetalle(venta || null);
  const cerrarDetalle = () => setVentaDetalle(null);

  const imprimirBoleta = (venta) => {
    if (!venta?._id) return;
    const url = `${API_URL_VENTAS}/${venta._id}/comprobante-pdf`;
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) w.focus();
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-emerald-900">Registro de Ventas</h1>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-emerald-500">
          <p className="text-gray-400 text-xs uppercase">Total Ventas</p>
          <p className="text-2xl font-bold text-gray-800">S/ {totalVentas.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-teal-500">
          <p className="text-gray-400 text-xs uppercase">Por caja</p>
          <p className="text-2xl font-bold text-gray-800">S/ {totalCaja.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-cyan-500">
          <p className="text-gray-400 text-xs uppercase">Pedido web</p>
          <p className="text-2xl font-bold text-gray-800">S/ {totalPedidoWeb.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-gray-400">
          <p className="text-gray-400 text-xs uppercase">Sin indicar</p>
          <p className="text-2xl font-bold text-gray-800">S/ {totalSinIndicar.toFixed(2)}</p>
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
            <select
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
              value={filterOrigen}
              onChange={(e) => setFilterOrigen(e.target.value)}
            >
              <option value="todos">Todos los orígenes</option>
              <option value="CAJA">Solo caja registradora</option>
              <option value="ONLINE">Solo pedido web</option>
              <option value="SIN">Sin indicar</option>
            </select>
            <button
              type="button"
              onClick={async () => {
                await fetchVentas();
                window.dispatchEvent(new Event("swgfsm-stock-actualizado"));
              }}
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
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Origen</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Método</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-400">Cargando...</td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-400">No hay ventas registradas</td>
                </tr>
              ) : (
                ventasFiltradas.map((venta) => (
                  <tr
                    key={venta._id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => abrirDetalle(venta)}
                    title="Ver detalle"
                  >
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{venta.numeroVenta || "—"}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(venta.fecha).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-800">{venta.cliente}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {venta.productos?.slice(0, 2).map(p => `${p.nombre} x${p.cantidad}`).join(", ")}
                      {venta.productos?.length > 2 && " ..."}
                    </td>
                    <td className="px-6 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <select
                        title="Origen de la venta"
                        className={`text-xs font-medium rounded-lg border px-2 py-1 max-w-[11rem] ${
                          venta.origen === "CAJA"
                            ? "border-teal-200 bg-teal-50 text-teal-900"
                            : venta.origen === "ONLINE"
                              ? "border-sky-200 bg-sky-50 text-sky-900"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                        }`}
                        value={
                          venta.origen === "CAJA" ? "CAJA" : venta.origen === "ONLINE" ? "ONLINE" : ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "CAJA" || v === "ONLINE") cambiarOrigen(venta._id, v);
                        }}
                      >
                        <option value="">Sin indicar…</option>
                        <option value="CAJA">Caja registradora</option>
                        <option value="ONLINE">Pedido web</option>
                      </select>
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
                      <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => abrirDetalle(venta)}
                          className="text-xs px-3 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          Ver
                        </button>
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

      {/* Modal detalle de venta */}
      {ventaDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-emerald-900">Detalle de venta</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {ventaDetalle.comprobante || "Boleta"} · <span className="font-mono">{ventaDetalle.numeroVenta || "—"}</span> ·{" "}
                  {ventaDetalle.fecha ? new Date(ventaDetalle.fecha).toLocaleString() : "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarDetalle}
                className="w-10 h-10 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Cliente</p>
                  <p className="mt-1 font-bold text-gray-800">{ventaDetalle.cliente || "—"}</p>
                  {ventaDetalle.clienteDocumento ? (
                    <p className="text-sm text-gray-600 mt-1">Doc: {ventaDetalle.clienteDocumento}</p>
                  ) : null}
                  {ventaDetalle.clienteEmail ? (
                    <p className="text-sm text-gray-600 mt-1">Email: {ventaDetalle.clienteEmail}</p>
                  ) : null}
                  {ventaDetalle.clienteTelefono ? (
                    <p className="text-sm text-gray-600 mt-1">Tel: {ventaDetalle.clienteTelefono}</p>
                  ) : null}
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Pago y estado</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Origen:{" "}
                    <span className="font-semibold">
                      {etiquetaOrigen(ventaDetalle)}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    Método: <span className="font-semibold capitalize">{ventaDetalle.metodoPago || "—"}</span>
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    Estado:{" "}
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getEstadoColor(ventaDetalle.estado)}`}>
                      {ventaDetalle.estado || "—"}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    Total: <span className="font-extrabold text-emerald-700">S/ {(ventaDetalle.total || 0).toFixed(2)}</span>
                  </p>
                </div>
              </div>

              <div className="border rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Productos</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Cant.</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Unid.</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">P. Unit.</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ventaDetalle.productos || []).map((p, idx) => (
                        <tr key={`${p.nombre}-${idx}`} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{p.cantidad}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{p.medida || "—"}</td>
                          <td className="px-4 py-3 text-right text-gray-700">S/ {(p.precioUnitario || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">S/ {(p.subtotal || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {(ventaDetalle.productos || []).length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-gray-400">
                            Sin productos
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-600">
                  Subtotal: <span className="font-semibold">S/ {(ventaDetalle.subtotal || 0).toFixed(2)}</span>{" "}
                  · Total: <span className="font-extrabold text-emerald-700">S/ {(ventaDetalle.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={refrescarInventarioYDetalle}
                    className="px-4 py-2 rounded-xl border border-emerald-600 text-emerald-800 text-sm font-semibold hover:bg-emerald-50"
                  >
                    Actualizar inventario
                  </button>
                  <button
                    type="button"
                    onClick={() => imprimirBoleta(ventaDetalle)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >
                    Imprimir boleta
                  </button>
                  <button
                    type="button"
                    onClick={cerrarDetalle}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentasAdmin;