// src/components/DespachoAdmin.js — pedidos web agrupados por fecha y horario de entrega

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { etiquetaFechaHorarioEntrega, evaluarVentanaMarcarEntregado } from "../utils/entregaHorario";
import { nombreLineaVenta, mergeTipoLineaDesdeCatalogo } from "../utils/tiendaProducto";

import {
  API_URL_DESPACHO,
  API_URL_VENTAS,
  API_URL_PRODUCTOS,
} from "../config/api";

const getAuthToken = () => sessionStorage.getItem("auth_token");

const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};

const estadoBadge = (estado) => {
  const map = {
    Pendiente: "bg-amber-100 text-amber-800 border-amber-200",
    Enviado: "bg-blue-100 text-blue-800 border-blue-200",
    Entregado: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Cancelado: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return map[estado] || "bg-gray-100 text-gray-700 border-gray-200";
};

const etiquetaEntrega = (v) => {
  if (v?.tipoEntrega === "METROPOLITANO") {
    const nom = v.estacionMetropolitanoNombre || "Estación";
    const lin = v.estacionMetropolitanoLinea ? ` (${v.estacionMetropolitanoLinea})` : "";
    return `Metropolitano — ${nom}${lin}`;
  }
  if (v?.tipoEntrega === "TIENDA") {
    return v.tiendaDireccion ? `Tienda — ${v.tiendaDireccion}` : "Recojo en tienda";
  }
  return "—";
};

const etiquetaMetodo = (m) => {
  const map = {
    tarjeta: "Tarjeta",
    yape: "Yape",
    plin: "Plin",
    transferencia: "Transferencia",
    efectivo: "Efectivo",
  };
  return map[String(m || "").toLowerCase()] || m || "—";
};

const DespachoAdmin = () => {
  const [grupos, setGrupos] = useState([]);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [codigoConfirmacion, setCodigoConfirmacion] = useState("");
  const [catalogoProductos, setCatalogoProductos] = useState([]);

  const productoPorId = useMemo(() => {
    const m = new Map();
    catalogoProductos.forEach((p) => {
      if (p?._id != null) m.set(String(p._id), p);
    });
    return m;
  }, [catalogoProductos]);

  const etiquetaProducto = (line) =>
    nombreLineaVenta(mergeTipoLineaDesdeCatalogo(line, productoPorId));

  const cargarDespacho = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterEstado !== "todos") params.set("estado", filterEstado);
      if (filterDesde) params.set("desde", filterDesde);
      if (filterHasta) params.set("hasta", filterHasta);
      const qs = params.toString();
      const url = qs ? `${API_URL_DESPACHO}?${qs}` : API_URL_DESPACHO;
      const res = await fetchWithAuth(url);

      if (res.status === 401) {
        toast.error("Sesión expirada. Vuelve a iniciar sesión.");
        window.location.href = "/login-trabajador";
        return;
      }
      if (!res.ok) throw new Error(String(res.status));

      const data = await res.json();
      setGrupos(Array.isArray(data.grupos) ? data.grupos : []);
      setTotalPedidos(Number(data.totalPedidos) || 0);
    } catch (e) {
      console.error(e);
      setGrupos([]);
      setTotalPedidos(0);
      toast.error("No se pudo cargar el despacho.");
    } finally {
      setLoading(false);
    }
  }, [filterEstado, filterDesde, filterHasta]);

  useEffect(() => {
    cargarDespacho();
  }, [cargarDespacho]);

  useEffect(() => {
    fetch(API_URL_PRODUCTOS)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCatalogoProductos(Array.isArray(data) ? data : []))
      .catch(() => setCatalogoProductos([]));
  }, []);

  const cambiarEstado = async (id, nuevoEstado, ventaRef, codigo) => {
    const ventaCtx =
      ventaRef ||
      detalle ||
      grupos.flatMap((g) => g.pedidos || []).find((p) => String(p._id) === String(id));

    if (nuevoEstado === "Entregado" && ventaCtx?.fechaEntrega && ventaCtx?.horarioEntrega) {
      const ventana = evaluarVentanaMarcarEntregado(
        ventaCtx.fechaEntrega,
        ventaCtx.horarioEntrega,
      );
      if (!ventana.ok) {
        toast.error(ventana.message);
        return;
      }
    }

    if (nuevoEstado === "Entregado") {
      const requiereCodigo = ventaCtx?.requiereCodigoEntrega !== false;
      const cod = String(codigo || "").trim();
      if (requiereCodigo && !/^\d{3}$/.test(cod)) {
        toast.error("Ingresa el código de 3 dígitos que dictó el cliente.");
        return;
      }
    }

    try {
      const res = await fetchWithAuth(
        `${API_URL_VENTAS}/${encodeURIComponent(id)}/estado`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estado: nuevoEstado,
            ...(nuevoEstado === "Entregado" && codigo
              ? { codigo: String(codigo).trim() }
              : {}),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(
          nuevoEstado === "Entregado"
            ? "Pedido confirmado como entregado."
            : `Estado actualizado a ${nuevoEstado}`,
        );
        setCodigoConfirmacion("");
        setDetalle((prev) =>
          prev && String(prev._id) === String(id) ? { ...prev, estado: nuevoEstado } : prev,
        );
        cargarDespacho();
      } else {
        toast.error(data.message || "No se pudo actualizar el estado.");
      }
    } catch {
      toast.error("Error de conexión.");
    }
  };

  const abrirDetalle = (pedido) => {
    setCodigoConfirmacion("");
    setDetalle(pedido);
  };

  const slotsConCoincidencia = useMemo(
    () => grupos.filter((g) => g.pedidos?.length > 1).length,
    [grupos],
  );

  return (
    <section className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Pedidos web ordenados por fecha y horario de entrega. Los grupos con varios pedidos
          indican entregas al mismo momento.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Estado</label>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="todos">Todos (sin cancelados)</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Enviado">Enviado</option>
            <option value="Entregado">Entregado</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={filterDesde}
            onChange={(e) => setFilterDesde(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={filterHasta}
            onChange={(e) => setFilterHasta(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={cargarDespacho}
          className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-700 uppercase">Total pedidos</p>
          <p className="text-2xl font-bold text-emerald-950 mt-1">
            {loading ? "…" : totalPedidos}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Franjas horarias</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {loading ? "…" : grupos.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-800 uppercase">Mismo día y hora</p>
          <p className="text-2xl font-bold text-amber-950 mt-1">
            {loading ? "…" : slotsConCoincidencia}
          </p>
          <p className="text-[11px] text-amber-700 mt-1">franjas con 2+ pedidos</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">Cargando despacho…</p>
      ) : grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          No hay pedidos con fecha y horario de entrega programados.
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((grupo) => {
            const n = grupo.pedidos?.length || 0;
            const coinciden = n > 1;
            return (
              <article
                key={`${grupo.fechaEntrega}-${grupo.horarioEntrega}`}
                className={`rounded-2xl border overflow-hidden shadow-sm ${
                  coinciden
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : "border-gray-200"
                }`}
              >
                <header
                  className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                    coinciden ? "bg-amber-50" : "bg-emerald-50"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                      {grupo.etiqueta ||
                        etiquetaFechaHorarioEntrega(
                          grupo.fechaEntrega,
                          grupo.horarioEntrega,
                        )}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      {grupo.fechaEntrega} · {grupo.horarioEntrega}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold border ${
                      coinciden
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-white text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {n} pedido{n !== 1 ? "s" : ""}
                    {coinciden ? " · misma franja" : ""}
                  </span>
                </header>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Boleta</th>
                        <th className="px-4 py-2.5 text-left">Cliente</th>
                        <th className="px-4 py-2.5 text-left">Entrega</th>
                        <th className="px-4 py-2.5 text-left">Pago</th>
                        <th className="px-4 py-2.5 text-left">Estado</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                        <th className="px-4 py-2.5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(grupo.pedidos || []).map((p) => (
                        <tr
                          key={p._id}
                          className="border-b last:border-0 hover:bg-gray-50/80"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-semibold">
                            {p.numeroVenta || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{p.cliente}</p>
                            <p className="text-xs text-gray-500">{p.clienteTelefono || p.clienteEmail}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 max-w-[200px]">
                            {etiquetaEntrega(p)}
                          </td>
                          <td className="px-4 py-3 text-xs">{etiquetaMetodo(p.metodoPago)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${estadoBadge(p.estado)}`}
                            >
                              {p.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-800 tabular-nums">
                            S/ {Number(p.total || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => abrirDetalle(p)}
                              className="text-xs font-semibold text-emerald-700 hover:underline"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b bg-white px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Pedido {detalle.numeroVenta}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {etiquetaFechaHorarioEntrega(detalle.fechaEntrega, detalle.horarioEntrega)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="font-semibold">{detalle.cliente}</p>
                  <p className="text-xs text-gray-600">{detalle.clienteEmail}</p>
                  <p className="text-xs text-gray-600">{detalle.clienteTelefono}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pago y estado</p>
                  <p>{etiquetaMetodo(detalle.metodoPago)}</p>
                  <span
                    className={`inline-block mt-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${estadoBadge(detalle.estado)}`}
                  >
                    {detalle.estado}
                  </span>
                  <p className="font-bold text-emerald-800 mt-2">
                    S/ {Number(detalle.total || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-[#eef7f3] p-3">
                <p className="text-xs font-bold text-[#006241] uppercase">Entrega</p>
                <p className="mt-1 font-medium">{etiquetaEntrega(detalle)}</p>
                {detalle.estacionReferencia && (
                  <p className="text-xs text-gray-600 mt-1">
                    Punto de encuentro: {detalle.estacionReferencia}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Productos</p>
                <ul className="space-y-2">
                  {(detalle.productos || []).map((item, i) => (
                    <li
                      key={i}
                      className="flex justify-between gap-2 border-b border-gray-100 pb-2"
                    >
                      <span>
                        {etiquetaProducto(item)} × {item.cantidad}
                        {item.medida ? ` ${item.medida}` : ""}
                      </span>
                      <span className="font-semibold tabular-nums">
                        S/ {Number(item.subtotal || 0).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {detalle.estado === "Pendiente" && (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(detalle._id, "Enviado", detalle)}
                    className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Marcar Enviado
                  </button>
                )}
                {(detalle.estado === "Pendiente" || detalle.estado === "Enviado") &&
                  (() => {
                    const ventana = evaluarVentanaMarcarEntregado(
                      detalle.fechaEntrega,
                      detalle.horarioEntrega,
                    );
                    return (
                      <div className="w-full space-y-2">
                        <p className="text-xs font-semibold text-[#1e3932]">
                          Confirmar entrega con código del cliente
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={3}
                            value={codigoConfirmacion}
                            onChange={(e) =>
                              setCodigoConfirmacion(
                                e.target.value.replace(/\D/g, "").slice(0, 3),
                              )
                            }
                            placeholder="000"
                            disabled={!ventana.ok}
                            className="w-24 rounded-xl border border-[#d4e9e2] px-3 py-2 text-center text-lg font-bold tracking-[0.3em] disabled:opacity-50"
                          />
                          <button
                            type="button"
                            disabled={
                              !ventana.ok ||
                              (detalle.requiereCodigoEntrega !== false &&
                                codigoConfirmacion.length !== 3)
                            }
                            onClick={() =>
                              cambiarEstado(
                                detalle._id,
                                "Entregado",
                                detalle,
                                codigoConfirmacion,
                              )
                            }
                            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Confirmar entregado
                          </button>
                        </div>
                        {!ventana.ok && (
                          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            {ventana.message}
                          </p>
                        )}
                        {ventana.ok && (
                          <p className="text-xs text-gray-600">
                            El cliente te dictará su código de 3 dígitos al recibir el pedido.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                <button
                  type="button"
                  onClick={() => {
                    setCodigoConfirmacion("");
                    setDetalle(null);
                  }}
                  className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DespachoAdmin;
