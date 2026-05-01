// src/components/CajaRegistradora.js — Carrito de ventas con validación de stock y totales en tiempo real

import React, { useState, useEffect, useMemo, useCallback } from "react";

const API_URL_PRODUCTOS = "http://localhost:5000/api/producto";
const API_URL_VENTAS = "http://localhost:5000/api/ventas";
const API_URL_CLIENTES = "http://localhost:5000/api/clientes";
const BUSQUEDA_DEBOUNCE_MS = 280;

const normText = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const nombreCompletoCliente = (c) =>
  `${String(c?.nombres || "").trim()} ${String(c?.apellidos || "").trim()}`.trim();

const idProducto = (v) => {
  if (v == null) return "";
  if (typeof v === "object" && typeof v.toString === "function") return String(v.toString());
  return String(v);
};

const precioNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Misma lógica que el backend: suma madura/verde/sazón; si es 0, legacy stockSemanal */
const stockDisponible = (producto) => {
  if (!producto) return 0;
  const sum =
    precioNum(producto.stockPaltaMadura) +
    precioNum(producto.stockPaltaVerde) +
    precioNum(producto.stockPaltaSazon);
  if (sum > 0) return Math.max(0, Math.floor(sum));
  const leg = Number(producto.stockSemanal);
  if (Number.isFinite(leg) && leg > 0) return Math.floor(leg);
  return 0;
};

const precioVentaDe = (producto) => precioNum(producto?.precioVenta);

/** subtotal línea = cantidad × precio unitario (siempre en número) */
const montoLinea = (item) => precioNum(item.cantidad) * precioNum(item.precioUnitario);

const formatSoles = (n) => precioNum(n).toFixed(2);

const tipoProducto = (p) => (p?.tipo != null && p.tipo !== "" ? p.tipo : p?.categoriaId) || "—";

/** onVentaCompletada: opcional; p.ej. refrescar el listado de Productos en el panel admin (solo afecta catálogo Producto, no el módulo Inventario). */
const CajaRegistradora = ({ onVentaCompletada }) => {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [buscandoSugerencias, setBuscandoSugerencias] = useState(false);
  const [buscadorEnfocado, setBuscadorEnfocado] = useState(false);
  const [cliente, setCliente] = useState({ nombre: "", email: "", telefono: "", documento: "" });
  const [clientesIndex, setClientesIndex] = useState([]);
  const [clienteSugerencias, setClienteSugerencias] = useState([]);
  const [clienteRegistrado, setClienteRegistrado] = useState(null);
  const [clienteSugVisible, setClienteSugVisible] = useState(false);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [comprobante, setComprobante] = useState("Boleta");
  const [mostrarModalEnvio, setMostrarModalEnvio] = useState(false);
  const [ventaActual, setVentaActual] = useState(null);
  const [tipoEnvio, setTipoEnvio] = useState("email");
  const [destinoEnvio, setDestinoEnvio] = useState("");

  // Cargar clientes (para autocompletado)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(API_URL_CLIENTES);
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data?.message || `Error al cargar clientes (${res.status})`);
        const list = Array.isArray(data) ? data : [];
        const indexed = list
          .filter((c) => String(c?.estado || "ACTIVO").toUpperCase() === "ACTIVO")
          .map((c) => {
            const correo = String(c?.correo || "").trim().toLowerCase();
            const tel = String(c?.telefono || "").trim();
            const full = nombreCompletoCliente(c);
            return {
              raw: c,
              id: String(c?._id || correo || tel || full),
              full,
              correo,
              tel,
              fullNorm: normText(full),
              correoNorm: normText(correo),
            };
          });
        if (!cancel) setClientesIndex(indexed);
      } catch (e) {
        console.warn("No se pudo cargar clientes:", e);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Cargar productos
  useEffect(() => {
    fetchProductos();
  }, []);

  useEffect(() => {
    const onStock = () => fetchProductos();
    window.addEventListener("swgfsm-stock-actualizado", onStock);
    return () => window.removeEventListener("swgfsm-stock-actualizado", onStock);
  }, []);

  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) {
      setProductosFiltrados(productos);
      setBuscandoSugerencias(false);
      return;
    }

    const controller = new AbortController();
    setBuscandoSugerencias(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL_PRODUCTOS}/buscar?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProductosFiltrados(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name === "AbortError") return;
        console.error("Error en búsqueda de productos:", e);
        setProductosFiltrados([]);
      } finally {
        if (!controller.signal.aborted) {
          setBuscandoSugerencias(false);
        }
      }
    }, BUSQUEDA_DEBOUNCE_MS);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [searchTerm, productos]);

  const fetchProductos = async () => {
    try {
      const res = await fetch(API_URL_PRODUCTOS);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setProductos(lista);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  /** Mapa id → producto actual del catálogo (para stock / precio en tiempo real) */
  const productoPorId = useMemo(() => {
    const m = new Map();
    productos.forEach((p) => m.set(idProducto(p._id), p));
    return m;
  }, [productos]);

  const stockMaxLinea = useCallback(
    (productoId) => {
      const p = productoPorId.get(idProducto(productoId));
      return p ? stockDisponible(p) : 0;
    },
    [productoPorId]
  );

  /** Si el catálogo cambia (p. ej. tras otra venta), ajusta cantidades y precios al inventario actual */
  useEffect(() => {
    if (!productos.length) return;
    setCarrito((prev) => {
      const next = [];
      let changed = false;
      for (const item of prev) {
        const p = productos.find((x) => idProducto(x._id) === idProducto(item.productoId));
        if (!p) {
          next.push(item);
          continue;
        }
        const max = stockDisponible(p);
        const unit = precioVentaDe(p);
        if (max <= 0) {
          changed = true;
          continue;
        }
        let cant = Math.max(1, Math.floor(precioNum(item.cantidad) || 1));
        if (cant > max) {
          cant = max;
          changed = true;
        }
        if (precioNum(item.precioUnitario) !== unit) changed = true;
        const medida = item.medida != null ? String(item.medida) : (p.unidadMedida ? String(p.unidadMedida) : "—");
        next.push({ ...item, precioUnitario: unit, cantidad: cant, medida });
      }
      return changed ? next : prev;
    });
  }, [productos]);

  const eliminarDelCarrito = useCallback((index) => {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const agregarAlCarrito = useCallback(
    (producto, cantidad = 1) => {
      const pid = idProducto(producto._id);
      const unit = precioVentaDe(producto);
      const max = stockDisponible(producto);
      const paso = Math.max(1, Math.floor(Number(cantidad)) || 1);

      if (max <= 0) {
        window.alert(`Sin stock disponible para "${producto.nombre}".`);
        return;
      }
      if (unit <= 0) {
        window.alert(`Precio de venta inválido para "${producto.nombre}". Revise el producto en el catálogo.`);
        return;
      }

      setCarrito((prev) => {
        const idx = prev.findIndex((i) => idProducto(i.productoId) === pid);
        if (idx >= 0) {
          const actual = prev[idx];
          const actualCant = Math.max(1, Math.floor(precioNum(actual.cantidad) || 1));
          const deseado = actualCant + paso;
          const final = Math.min(deseado, max);
          if (deseado > max) {
            window.alert(
              `Stock insuficiente para "${producto.nombre}". Máximo permitido: ${max}.`
            );
          }
          return prev.map((row, i) =>
            i === idx
              ? { ...row, precioUnitario: unit, cantidad: final, medida: producto.unidadMedida ? String(producto.unidadMedida) : (row.medida != null ? String(row.medida) : "—") }
              : row
          );
        }
        const cantInicial = Math.min(paso, max);
        return [
          ...prev,
          {
            productoId: pid,
            nombre: producto.nombre,
            precioUnitario: unit,
            cantidad: cantInicial,
            medida: producto.unidadMedida ? String(producto.unidadMedida) : "—",
          },
        ];
      });
      setSearchTerm("");
      setProductosFiltrados(productos);
    },
    [productos]
  );

  const actualizarCantidad = useCallback(
    (index, nuevaCantidad) => {
      const entero = Math.floor(Number(nuevaCantidad));
      if (!Number.isFinite(entero) || entero < 1) {
        eliminarDelCarrito(index);
        return;
      }
      setCarrito((prev) => {
        const item = prev[index];
        if (!item) return prev;
        const max = stockMaxLinea(item.productoId);
        if (max <= 0) {
          window.alert(`Sin stock para "${item.nombre}". Se quitará del carrito.`);
          return prev.filter((_, i) => i !== index);
        }
        if (entero > max) {
          window.alert(`Cantidad máxima disponible: ${max}.`);
        }
        const final = Math.min(entero, max);
        return prev.map((row, i) => (i === index ? { ...row, cantidad: final } : row));
      });
    },
    [eliminarDelCarrito, stockMaxLinea]
  );

  const total = useMemo(
    () => carrito.reduce((sum, item) => sum + montoLinea(item), 0),
    [carrito]
  );

  const validarCarritoAntesDeVender = useCallback(() => {
    for (const item of carrito) {
      const max = stockMaxLinea(item.productoId);
      if (max <= 0) {
        return `El producto "${item.nombre}" ya no tiene stock. Quítalo del carrito.`;
      }
      if (item.cantidad > max) {
        return `Ajusta "${item.nombre}": pediste ${item.cantidad} pero solo hay ${max} en inventario.`;
      }
      if (precioNum(item.precioUnitario) <= 0) {
        return `Precio inválido para "${item.nombre}".`;
      }
    }
    return null;
  }, [carrito, stockMaxLinea]);

  const registrarVenta = async () => {
    if (carrito.length === 0) {
      window.alert("Agrega productos al carrito.");
      return;
    }
    if (!cliente.nombre?.trim()) {
      window.alert("Ingresa el nombre del cliente.");
      return;
    }

    const err = validarCarritoAntesDeVender();
    if (err) {
      window.alert(err);
      return;
    }

    const lineas = carrito.map((item) => ({
      productoId: idProducto(item.productoId),
      nombre: item.nombre,
      cantidad: Math.max(1, Math.floor(Number(item.cantidad)) || 1),
      precioUnitario: precioNum(item.precioUnitario),
      medida: item.medida || "—",
      subtotal: montoLinea(item),
    }));

    const suma = lineas.reduce((s, x) => s + x.subtotal, 0);
    const venta = {
      cliente: cliente.nombre.trim(),
      clienteEmail: cliente.email,
      clienteTelefono: cliente.telefono,
      clienteDocumento: cliente.documento,
      productos: lineas,
      subtotal: suma,
      total: suma,
      metodoPago: metodoPago,
      comprobante: comprobante,
      origen: "CAJA",
    };

    try {
      const res = await fetch(API_URL_VENTAS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(venta),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Respuesta inválida del servidor.");
      }
      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || `Error al crear la venta (${res.status})`
        );
      }
      try {
        const cr = await fetch(`${API_URL_CLIENTES}/registro-caja`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombreCompleto: cliente.nombre.trim(),
            telefono: (cliente.telefono || "").trim(),
            correo: (cliente.email || "").trim(),
            documento: (cliente.documento || "").trim(),
          }),
        });
        if (!cr.ok) {
          const err = await cr.json().catch(() => ({}));
          console.warn("No se guardó el cliente en el catálogo:", err?.message || cr.status);
        }
      } catch (e) {
        console.warn("Error al registrar cliente en catálogo:", e);
      }
      setVentaActual(data);
      const email = (cliente.email || "").trim();
      const tel = (cliente.telefono || "").trim();
      const prefer = email ? "email" : (tel ? "whatsapp" : "email");
      setTipoEnvio(prefer);
      setDestinoEnvio(prefer === "email" ? email : tel);
      setMostrarModalEnvio(true);
      setCarrito([]);
      setSearchTerm("");
      await fetchProductos();
      onVentaCompletada?.();
    } catch (error) {
      console.error("Error al registrar venta:", error);
      window.alert(error.message || "Error al registrar la venta");
    }
  };

  // Enviar comprobante
  const enviarComprobante = async () => {
    if (!destinoEnvio) {
      alert(`Ingresa el ${tipoEnvio === "email" ? "correo" : "número de WhatsApp"}`);
      return;
    }

    try {
      const res = await fetch(`${API_URL_VENTAS}/${ventaActual._id}/enviar-comprobante`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: tipoEnvio, destino: destinoEnvio })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Error al enviar (${res.status})`);
      }
      // Si el servidor no tiene SMTP configurado, no lo tratamos como error:
      // simplemente mostramos/impirmimos la boleta generada.
      const sent = data?.sent !== false; // undefined => true, false => no enviado
      if (sent) {
        alert(data?.message || "Comprobante generado.");
      }

      if (tipoEnvio === "whatsapp" && data?.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      }
      
      // Abrir comprobante en nueva ventana
      if (data?.comprobanteHTML) {
        const ventana = window.open();
        if (ventana) {
          ventana.document.write(data.comprobanteHTML);
          ventana.document.close();
        }
      }

      // Si el email no se envió (SMTP no configurado), avisar y NO imprimir
      if (tipoEnvio === "email" && data?.sent === false) {
        alert(
          "No se pudo enviar al correo porque el servidor no tiene SMTP configurado. " +
            "Configura SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS en el backend y reinicia el servidor."
        );
      }
      
      // Resetear todo
      setCarrito([]);
      setCliente({ nombre: "", email: "", telefono: "", documento: "" });
      setMostrarModalEnvio(false);
      setVentaActual(null);
      setDestinoEnvio("");
    } catch (error) {
      console.error("Error al enviar comprobante:", error);
      alert(error?.message || "Error al enviar el comprobante");
    }
  };

  // Saltar envío (solo imprimir)
  const saltarEnvio = async () => {
    try {
      if (!ventaActual?._id) throw new Error("No hay venta para imprimir.");

      const res = await fetch(`${API_URL_VENTAS}/${ventaActual._id}/enviar-comprobante`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "print", destino: "" })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Error al generar (${res.status})`);

      if (data?.comprobanteHTML) {
        const ventana = window.open();
        if (ventana) {
          ventana.document.write(data.comprobanteHTML);
          // Disparar impresión (como boleta)
          ventana.document.close();
          ventana.focus();
          setTimeout(() => {
            try {
              ventana.print();
            } catch {}
          }, 250);
        }
      }
    } catch (e) {
      console.error("Error al imprimir comprobante:", e);
      alert(e?.message || "Error al imprimir el comprobante");
    } finally {
      setCarrito([]);
      setCliente({ nombre: "", email: "", telefono: "", documento: "" });
      setMostrarModalEnvio(false);
      setVentaActual(null);
      setDestinoEnvio("");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-emerald-900">Caja Registradora</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo: Buscador y productos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-400/50 focus-within:border-emerald-300">
                <span className="text-gray-400 select-none" aria-hidden>🔍</span>
                <input
                  type="text"
                  placeholder="Buscar producto por nombre..."
                  className="w-full py-2 text-lg outline-none bg-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setBuscadorEnfocado(true)}
                  onBlur={() => setBuscadorEnfocado(false)}
                  autoFocus
                  autoComplete="off"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 px-1"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchTerm("");
                      setProductosFiltrados(productos);
                    }}
                    aria-label="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}
              </div>

              {buscadorEnfocado && searchTerm.trim() && (
                <ul
                  className="absolute z-20 left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
                  role="listbox"
                >
                  {buscandoSugerencias && (
                    <li className="px-4 py-3 text-sm text-gray-500">Buscando…</li>
                  )}
                  {!buscandoSugerencias &&
                    productosFiltrados.map((producto) => (
                      <li key={producto._id} role="option" aria-selected="false">
                        <button
                          type="button"
                          disabled={stockDisponible(producto) <= 0}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 ${
                            stockDisponible(producto) <= 0
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-emerald-50"
                          }`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => agregarAlCarrito(producto, 1)}
                        >
                          <span className="text-gray-400 mt-0.5">🔍</span>
                          <span className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-left">
                            <span className="font-medium text-gray-900 truncate">{producto.nombre}</span>
                            <span className="text-sm text-gray-700 shrink-0">{tipoProducto(producto)}</span>
                            <span className="text-sm text-emerald-700 col-span-2">
                              P. unit.: S/ {formatSoles(precioVentaDe(producto))}
                              <span className="text-gray-400 font-normal ml-2">
                                · Stock: {stockDisponible(producto)} {producto.unidadMedida ? `· ${producto.unidadMedida}` : ""}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  {!buscandoSugerencias && productosFiltrados.length === 0 && (
                    <li className="px-4 py-3 text-sm text-gray-500">
                      Sin coincidencias en el catálogo
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-3">Productos disponibles</h2>
            <p className="text-xs text-gray-500 mb-3">
              {searchTerm.trim()
                ? "Resultados según tu búsqueda (desde el servidor)"
                : "Catálogo completo — escribe arriba para sugerencias al instante"}
            </p>
            <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 overflow-hidden">
              {buscandoSugerencias && searchTerm.trim() && (
                <p className="text-gray-400 text-center py-6 bg-white">Buscando…</p>
              )}
              {!(buscandoSugerencias && searchTerm.trim()) && productosFiltrados.length > 0 && (
                <table className="w-full text-sm text-left">
                  <thead className="bg-emerald-900 text-lime-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Producto</th>
                      <th className="px-4 py-3 font-semibold w-32">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {productosFiltrados.map((producto) => {
                      const sinStock = stockDisponible(producto) <= 0;
                      return (
                        <tr
                          key={producto._id}
                          onClick={() => {
                            if (!sinStock) agregarAlCarrito(producto, 1);
                          }}
                          className={
                            sinStock
                              ? "opacity-50 cursor-not-allowed bg-gray-50"
                              : "hover:bg-emerald-50 cursor-pointer"
                          }
                          title={sinStock ? "Sin stock" : "Clic para agregar al carrito"}
                        >
                          <td className="px-4 py-3 align-top">
                            <span className="font-medium text-gray-900 block">{producto.nombre}</span>
                            <span className="text-xs text-gray-500 mt-0.5 block">
                              S/ {formatSoles(precioVentaDe(producto))}
                              <span className="text-gray-400">
                                {" "}
                                · Stock: {stockDisponible(producto)}
                                {producto.unidadMedida ? ` · ${producto.unidadMedida}` : ""}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-gray-800 border-l border-gray-100 font-medium">
                            {tipoProducto(producto)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {!buscandoSugerencias &&
                productosFiltrados.length === 0 &&
                !searchTerm.trim() && (
                  <p className="text-gray-400 text-center py-8 bg-white">No hay productos registrados</p>
                )}
              {!buscandoSugerencias &&
                productosFiltrados.length === 0 &&
                searchTerm.trim() && (
                  <p className="text-gray-400 text-center py-8 bg-white">Sin coincidencias</p>
                )}
            </div>
          </div>
        </div>

        {/* Panel derecho: Carrito y datos cliente */}
        <div className="space-y-4">
          {/* Datos del cliente */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-3">Datos del cliente</h2>
            <div className="space-y-2">
              {clienteRegistrado && (
                <div className="mb-2 flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-emerald-700">
                    USUARIO REGISTRADO
                  </p>
                  <p className="text-[11px] text-emerald-700 truncate">
                    {clienteRegistrado.full}
                  </p>
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  placeholder="Nombre completo *"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-emerald-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={cliente.nombre}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCliente({ ...cliente, nombre: v });
                    const q = normText(v);
                    if (!q || q.length < 2) {
                      setClienteSugerencias([]);
                      setClienteRegistrado(null);
                      setClienteSugVisible(false);
                      return;
                    }
                    const sug = clientesIndex
                      .filter((c) => c.fullNorm.includes(q) || c.correoNorm.includes(q))
                      .slice(0, 6);
                    setClienteSugerencias(sug);
                    const exact = clientesIndex.find((c) => c.fullNorm === q);
                    setClienteRegistrado(exact || null);
                    setClienteSugVisible(sug.length > 0);
                  }}
                  onFocus={() => {
                    if (clienteSugerencias.length > 0) setClienteSugVisible(true);
                  }}
                  onBlur={() => {
                    // Pequeño delay para permitir click en sugerencia
                    setTimeout(() => setClienteSugVisible(false), 140);
                  }}
                />

                {clienteSugVisible && clienteSugerencias.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                    {clienteSugerencias.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition"
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => {
                          const correo = c.correo || "";
                          const tel = c.tel || "";
                          setCliente({
                            ...cliente,
                            nombre: c.full,
                            email: correo,
                            telefono: tel,
                            documento: String(c.raw?.documento || ""),
                          });
                          setClienteRegistrado(c);
                          setClienteSugVisible(false);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{c.full}</p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {c.correo ? c.correo : (c.tel ? `Tel: ${c.tel}` : "—")}
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 shrink-0">
                            REGISTRADO
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="email"
                placeholder="Correo electrónico (para boleta)"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-emerald-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                value={cliente.email}
                onChange={(e) => {
                  const v = e.target.value;
                  setCliente({ ...cliente, email: v });
                  const q = normText(v);
                  if (!q || q.length < 3) {
                    setClienteRegistrado(null);
                    return;
                  }
                  const exact = clientesIndex.find((c) => c.correoNorm === q);
                  if (exact) {
                    setClienteRegistrado(exact);
                    setCliente({
                      ...cliente,
                      nombre: exact.full,
                      email: exact.correo || v,
                      telefono: exact.tel || "",
                      documento: String(exact.raw?.documento || ""),
                    });
                  } else {
                    setClienteRegistrado(null);
                  }
                }}
              />
              <input
                type="tel"
                placeholder="Teléfono / WhatsApp"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-emerald-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                value={cliente.telefono}
                onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
              />
              <input
                type="text"
                placeholder="Documento (DNI/RUC) - opcional"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-emerald-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                value={cliente.documento}
                onChange={(e) => setCliente({ ...cliente, documento: e.target.value })}
              />
            </div>
          </div>

          {/* Carrito */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-1">Carrito de venta</h2>
            <p className="text-xs text-gray-500 mb-3">
              Precio × cantidad = subtotal. No puedes superar el stock disponible.
            </p>
            <div className="max-h-80 overflow-y-auto space-y-3">
              {carrito.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No hay productos agregados</p>
              ) : (
                carrito.map((item, index) => {
                  const maxPermitido = stockMaxLinea(item.productoId);
                  const cantNum = Math.max(1, Math.floor(precioNum(item.cantidad) || 1));
                  const precioU = precioNum(item.precioUnitario);
                  const sub = cantNum * precioU;
                  const alLimite = cantNum >= maxPermitido || maxPermitido <= 0;
                  return (
                    <div
                      key={idProducto(item.productoId)}
                      className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-900">{item.nombre}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Unidad: <span className="text-gray-700">{item.medida || "—"}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarDelCarrito(index)}
                          className="text-red-500 shrink-0 text-lg leading-none"
                          title="Quitar"
                        >
                          🗑️
                        </button>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                        <dt className="text-gray-500">P. unitario</dt>
                        <dd className="text-right font-medium text-gray-800">
                          S/ {formatSoles(precioU)}
                        </dd>
                        <dt className="text-gray-500">Cantidad</dt>
                        <dd className="text-right text-gray-800">{cantNum}</dd>
                        <dt className="text-gray-500">Stock disponible</dt>
                        <dd className="text-right text-amber-800 font-medium">{maxPermitido}</dd>
                        <dt className="text-gray-500 col-span-2 pt-1 border-t border-gray-200 mt-1">
                          Subtotal
                        </dt>
                        <dd className="col-span-2 text-right text-base font-bold text-emerald-700">
                          S/ {formatSoles(sub)}
                        </dd>
                      </dl>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(index, cantNum - 1)}
                          className="w-9 h-9 rounded-full bg-gray-200 text-gray-800 font-bold hover:bg-gray-300"
                        >
                          −
                        </button>
                        <span className="w-10 text-center font-bold">{cantNum}</span>
                        <button
                          type="button"
                          disabled={alLimite}
                          onClick={() => actualizarCantidad(index, cantNum + 1)}
                          className="w-9 h-9 rounded-full bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={alLimite ? "Cantidad máxima alcanzada" : "Aumentar"}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t pt-3 mt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Ítems en carrito</span>
                <span>{carrito.reduce((n, i) => n + Math.max(0, Math.floor(precioNum(i.cantidad) || 0)), 0)} u.</span>
              </div>
              <div className="flex justify-between items-baseline font-bold">
                <span className="text-gray-800">Total</span>
                <span className="text-xl text-emerald-700">S/ {formatSoles(total)}</span>
              </div>
            </div>
          </div>

          {/* Método de pago y comprobante */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Método de pago</label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Comprobante</label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  value={comprobante}
                  onChange={(e) => setComprobante(e.target.value)}
                >
                  <option value="Boleta">Boleta</option>
                  <option value="Factura">Factura</option>
                </select>
              </div>
            </div>

            <button
              onClick={registrarVenta}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700 transition"
            >
              Registrar Venta - S/ {formatSoles(total)}
            </button>
          </div>
        </div>
      </div>

      {/* Modal para enviar comprobante */}
      {mostrarModalEnvio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-emerald-900 mb-4">Enviar comprobante</h3>
            <p className="text-sm text-gray-500 mb-4">
              Venta registrada: <strong>{ventaActual?.numeroVenta}</strong>
              <br />
              Total: <strong className="text-emerald-700">S/ {ventaActual?.total?.toFixed(2)}</strong>
            </p>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => {
                  setTipoEnvio("email");
                  setDestinoEnvio((cliente.email || "").trim());
                }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold ${tipoEnvio === "email" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                📧 Email
              </button>
              <button
                onClick={() => {
                  setTipoEnvio("whatsapp");
                  setDestinoEnvio((cliente.telefono || "").trim());
                }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold ${tipoEnvio === "whatsapp" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                📱 WhatsApp
              </button>
            </div>

            <input
              type={tipoEnvio === "email" ? "email" : "tel"}
              placeholder={tipoEnvio === "email" ? "correo@ejemplo.com" : "Número de WhatsApp (ej: 966142980)"}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 mb-4"
              value={destinoEnvio}
              onChange={(e) => setDestinoEnvio(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                onClick={enviarComprobante}
                className="flex-1 py-2 rounded-full bg-emerald-600 text-white font-semibold"
              >
                Enviar
              </button>
              <button
                onClick={saltarEnvio}
                className="flex-1 py-2 rounded-full border border-gray-300 text-gray-600 font-semibold"
              >
                Solo imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CajaRegistradora;