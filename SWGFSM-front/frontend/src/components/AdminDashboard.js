
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import ProveedoresTable from "./ProveedoresTable";
import VentasAdmin from "./VentasAdmin";
import GestionTareas from "./GestionTareas";
import TareasAsignadas from "./TareasAsignadas";
import CajaRegistradora from "./CajaRegistradora";
import Prediccion from "../predict/Prediccion";
import PasswordInput from "./PasswordInput";

const API_URL_PRODUCTOS  = "http://localhost:5000/api/producto";
const API_URL_INVENTARIO = "http://localhost:5000/api/inventario";
const API_URL_CLIENTES   = "http://localhost:5000/api/clientes";
const API_URL_EMPLEADOS  = "http://localhost:5000/api/empleados";
const API_URL_VENTAS     = "http://localhost:5000/api/ventas";
const API_URL_PREDICCION = "http://localhost:5000/api/prediccion";

const readTrabajador = () => {
  try {
    const raw = localStorage.getItem("trabajador_actual");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Vendedor: solo caja + ventas. Resto de roles: panel completo. */
const isPanelVendedor = (t) => t?.rol === "Vendedor";

const sameLocalDay = (a, b) => {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const fechaVenta = (v) => new Date(v.fecha || v.creadoEn || Date.now());

const stockKgProducto = (p) =>
  Number(p.stockPaltaMadura || 0) +
  Number(p.stockPaltaVerde || 0) +
  Number(p.stockPaltaSazon || 0) +
  Number(p.stockSemanal || 0);

const localDateKey = (d) => {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfLocalDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * Fin de ventana para gráficos/export: hoy si hay ventas en los últimos `windowDays`
 * días calendario; si no (p. ej. datos de prueba antiguos), el día de la venta más reciente.
 */
const getVentasWindowEndAnchor = (ventasArr, windowDays) => {
  const list = ventasArr || [];
  if (!list.length) return new Date();
  const today = startOfLocalDay(new Date());
  const from = new Date(today);
  from.setDate(from.getDate() - (windowDays - 1));
  const hasInWindow = list.some((v) => {
    const fv = startOfLocalDay(fechaVenta(v));
    return fv >= from && fv <= today;
  });
  if (hasInWindow) return today;
  const latestMs = Math.max(...list.map((v) => fechaVenta(v).getTime()));
  return new Date(latestMs);
};

/** Últimos `numDays` días calendario hasta el día de anclaje `endRef` (inicio local): barras */
const bucketVentasPorDia = (ventasArr, numDays, endRef) => {
  const end = startOfLocalDay(endRef != null ? endRef : new Date());
  const buckets = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    buckets.push({
      key: localDateKey(d),
      date: d,
      label: d.toLocaleDateString("es-PE", { day: "numeric", month: "short" }),
      total: 0,
      count: 0,
    });
  }
  const map = new Map(buckets.map((b) => [b.key, b]));
  (ventasArr || []).forEach((v) => {
    const fv = startOfLocalDay(fechaVenta(v));
    const b = map.get(localDateKey(fv));
    if (b) {
      b.total += Number(v.total || 0);
      b.count += 1;
    }
  });
  return buckets;
};

const filterVentasUltimosDias = (ventasArr, days) => {
  const list = ventasArr || [];
  if (!days || days < 1) return [...list];

  const sliceForEnd = (refEnd) => {
    const end = startOfLocalDay(refEnd);
    const from = new Date(end);
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);
    return list.filter((v) => {
      const fv = startOfLocalDay(fechaVenta(v));
      return fv >= from && fv <= end;
    });
  };

  const today = startOfLocalDay(new Date());
  let rows = sliceForEnd(today);
  if (rows.length === 0 && list.length > 0) {
    const latestMs = Math.max(...list.map((v) => fechaVenta(v).getTime()));
    rows = sliceForEnd(new Date(latestMs));
  }
  return rows;
};

const ventasToXlsxRows = (rows) =>
  rows.map((v) => {
    const fv = fechaVenta(v);
    const productos = Array.isArray(v.productos)
      ? v.productos.map((p) => `${p.nombre || ""} x${p.cantidad || ""}`).join("; ")
      : "";
    return {
      numeroVenta: v.numeroVenta ?? "",
      fechaISO: fv.toISOString(),
      total: Number(Number(v.total || 0).toFixed(2)),
      subtotal: Number(Number(v.subtotal ?? v.total ?? 0).toFixed(2)),
      estado: v.estado ?? "",
      origen: v.origen ?? "",
      metodoPago: v.metodoPago ?? "",
      cliente: v.cliente ?? "",
      clienteEmail: v.clienteEmail ?? "",
      clienteTelefono: v.clienteTelefono ?? "",
      productosResumen: productos,
    };
  });

const downloadVentasXlsx = (rows, filename) => {
  const data = ventasToXlsxRows(rows);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ventas");
  XLSX.writeFile(wb, filename);
};

/* ── Modal confirmación de logout ── */
const LogoutModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Cerrar sesión</h3>
      <p className="text-sm text-gray-500 mb-6">¿Seguro que quieres salir del panel de administración?</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-full text-sm hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-full text-sm transition">
          Cerrar sesión
        </button>
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [selectedSection, setSelectedSection] = useState(() =>
    isPanelVendedor(readTrabajador()) ? "caja" : "dashboard"
  );
  const [modoNuevaVenta, setModoNuevaVenta]   = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [showEmpleadoModal, setShowEmpleadoModal]               = useState(false);
  const [showProductoModal, setShowProductoModal]               = useState(false);
  const [showRegistroInventarioModal, setShowRegistroInventarioModal] = useState(false);

  const [productos,  setProductos]  = useState([]);
  const [inventario, setInventario] = useState([]);

  const [modoEditarProducto, setModoEditarProducto] = useState(false);
  const emptyProductoForm = () => ({
    nombre: "",
    tipo: "",
    unidadMedida: "kg",
    precioVenta: "",
    stockPaltaMadura: "",
    stockPaltaVerde: "",
    stockPaltaSazon: "",
    detalle: "",
    tamano: "",
    descripcion: "",
    estado: "ACTIVO",
  });
  const [productoActual, setProductoActual] = useState(emptyProductoForm);

  const [nuevoInventario, setNuevoInventario] = useState({
    fecha: "", proveedor: "", numeroPuesto: "", producto: "",
    tipo: "", tamano: "", detalle: "", cantidad: "", precioCompra: "", totalInvertido: "",
  });

  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);

  const [dash, setDash] = useState({
    loading: false,
    error: null,
    ventasHoyMonto: 0,
    ventasHoyCount: 0,
    pedidosPendientes: 0,
    productosActivos: 0,
    stockBajoCount: 0,
    clientesCount: 0,
    kgMaduroML: 0,
    kgSazonML: 0,
    kgVerdeML: 0,
    kgPuntoNegroML: 0,
    lotesInventarioML: 0,
    ventas7dCount: 0,
    ventas7dMonto: 0,
    ventas30dCount: 0,
    ventas30dMonto: 0,
    porOrigenCaja: 0,
    porOrigenOnline: 0,
    porOrigenSin: 0,
    ultimasVentas: [],
    ventasLista: [],
  });
  const emptyEmpleadoForm = () => ({
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    rol: "Vendedor",
    password: "",
  });
  const [empleadoForm, setEmpleadoForm] = useState(emptyEmpleadoForm);
  const [editingEmpleadoId, setEditingEmpleadoId] = useState(null);

  useEffect(() => {
    const ok = localStorage.getItem("trabajador_logueado") === "true";
    if (!ok) {
      window.location.href = "/login-trabajador";
    }
  }, []);

  useEffect(() => {
    const t = readTrabajador();
    if (!isPanelVendedor(t)) return;
    if (!["caja", "ventas", "tareasAsignadas"].includes(selectedSection)) {
      setSelectedSection("caja");
    }
  }, [selectedSection]);

  useEffect(() => {
    if (selectedSection === "productos")  fetchProductos();
    if (selectedSection === "inventario") fetchInventario();
    if (selectedSection === "usuarios")   fetchUsuarios();
    if (selectedSection === "dashboard")  fetchDashboardData();
  }, [selectedSection]);

  const fetchClientes = async () => {
    try {
      const r = await fetch(API_URL_CLIENTES);
      if (!r.ok) throw new Error(String(r.status));
      setClientes(await r.json());
    } catch (e) {
      console.error(e);
      setClientes([]);
    }
  };

  const fetchEmpleados = async () => {
    try {
      const r = await fetch(API_URL_EMPLEADOS);
      if (!r.ok) throw new Error(String(r.status));
      setEmpleados(await r.json());
    } catch (e) {
      console.error(e);
      setEmpleados([]);
    }
  };

  const fetchUsuarios = async () => {
    setCargandoUsuarios(true);
    try {
      await Promise.all([fetchClientes(), fetchEmpleados()]);
    } finally {
      setCargandoUsuarios(false);
    }
  };

  const fetchDashboardData = async () => {
    setDash((d) => ({ ...d, loading: true, error: null }));
    const hoy = new Date();
    const hace7 = new Date(hoy);
    hace7.setDate(hace7.getDate() - 7);
    const hace30 = new Date(hoy);
    hace30.setDate(hace30.getDate() - 30);

    try {
      const [rv, rp, rc, rpred] = await Promise.all([
        fetch(API_URL_VENTAS),
        fetch(API_URL_PRODUCTOS),
        fetch(API_URL_CLIENTES),
        fetch(`${API_URL_PREDICCION}/resumen`),
      ]);

      if (!rv.ok) throw new Error(`Ventas HTTP ${rv.status}`);
      const ventasRaw = await rv.json();
      const ventasArr = Array.isArray(ventasRaw) ? ventasRaw : [];

      let productosArr = [];
      if (rp.ok) {
        const pj = await rp.json();
        productosArr = Array.isArray(pj) ? pj : [];
      }

      let clientesArr = [];
      if (rc.ok) {
        const cj = await rc.json();
        clientesArr = Array.isArray(cj) ? cj : [];
      }

      let predData = null;
      if (rpred.ok) {
        const pr = await rpred.json();
        predData = pr?.data || null;
      }

      const ventasHoyList = ventasArr.filter((v) => sameLocalDay(fechaVenta(v), hoy));
      const ventasHoyMonto = ventasHoyList.reduce((s, v) => s + Number(v.total || 0), 0);

      const ventas7 = ventasArr.filter((v) => fechaVenta(v) >= hace7);
      const ventas30 = ventasArr.filter((v) => fechaVenta(v) >= hace30);

      const porOrigen = { CAJA: 0, ONLINE: 0, sin: 0 };
      ventas30.forEach((v) => {
        if (v.origen === "CAJA") porOrigen.CAJA += 1;
        else if (v.origen === "ONLINE") porOrigen.ONLINE += 1;
        else porOrigen.sin += 1;
      });

      const activos = productosArr.filter(
        (p) => String(p.estado || "ACTIVO").toUpperCase() !== "INACTIVO"
      );
      const stockBajoCount = activos.filter((p) => {
        const t = stockKgProducto(p);
        return t > 0 && t < 8;
      }).length;

      const ultimasVentas = [...ventasArr]
        .sort((a, b) => fechaVenta(b) - fechaVenta(a))
        .slice(0, 8)
        .map((v) => ({
          id: v._id,
          numero: v.numeroVenta,
          fecha: fechaVenta(v),
          total: Number(v.total || 0),
          estado: v.estado || "—",
          origen: v.origen || "—",
        }));

      setDash({
        loading: false,
        error: null,
        ventasHoyMonto,
        ventasHoyCount: ventasHoyList.length,
        pedidosPendientes: ventasArr.filter((v) => String(v.estado) === "Pendiente").length,
        productosActivos: activos.length,
        stockBajoCount,
        clientesCount: clientesArr.length,
        kgMaduroML: predData?.kgPorEstado?.maduro ?? 0,
        kgSazonML: predData?.kgPorEstado?.sazon ?? 0,
        kgVerdeML: predData?.kgPorEstado?.verde ?? 0,
        kgPuntoNegroML: predData?.kgPorEstado?.punto_negro ?? 0,
        lotesInventarioML: predData?.total ?? 0,
        ventas7dCount: ventas7.length,
        ventas7dMonto: ventas7.reduce((s, v) => s + Number(v.total || 0), 0),
        ventas30dCount: ventas30.length,
        ventas30dMonto: ventas30.reduce((s, v) => s + Number(v.total || 0), 0),
        porOrigenCaja: porOrigen.CAJA,
        porOrigenOnline: porOrigen.ONLINE,
        porOrigenSin: porOrigen.sin,
        ultimasVentas,
        ventasLista: ventasArr,
      });

      setProductos(productosArr);
      setClientes(clientesArr);
    } catch (e) {
      console.error(e);
      setDash((d) => ({
        ...d,
        loading: false,
        error: e?.message || "No se pudo cargar el dashboard.",
      }));
    }
  };

  const exportVentasXlsx = (days, slug) => {
    const lista = dash.ventasLista || [];
    const rows = filterVentasUltimosDias(lista, days).sort((a, b) => fechaVenta(b) - fechaVenta(a));
    if (!rows.length) {
      alert("No hay ventas en el rango seleccionado para exportar.");
      return;
    }
    const fname = `ventas_${slug}_${localDateKey(new Date())}.xlsx`;
    downloadVentasXlsx(rows, fname);
  };

  const handleChangeEmpleadoForm = (e) =>
    setEmpleadoForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const abrirModalNuevoEmpleado = () => {
    setEditingEmpleadoId(null);
    setEmpleadoForm(emptyEmpleadoForm());
    setShowEmpleadoModal(true);
  };

  const abrirModalEditarEmpleado = (emp) => {
    setEditingEmpleadoId(emp._id);
    setEmpleadoForm({
      nombres: emp.nombres || "",
      apellidos: emp.apellidos || "",
      correo: emp.correo || "",
      telefono: emp.telefono || "",
      rol: emp.rol || "Vendedor",
      password: "",
    });
    setShowEmpleadoModal(true);
  };

  const cerrarModalEmpleado = () => {
    setShowEmpleadoModal(false);
    setEditingEmpleadoId(null);
    setEmpleadoForm(emptyEmpleadoForm());
  };

  const handleSubmitEmpleado = async (e) => {
    e.preventDefault();
    if (!empleadoForm.correo?.trim()) {
      alert("El correo del empleado es obligatorio.");
      return;
    }
    const pwd = empleadoForm.password?.trim() || "";
    if (!editingEmpleadoId && pwd.length < 6) {
      alert("La contraseña es obligatoria al crear un empleado (mínimo 6 caracteres).");
      return;
    }
    if (editingEmpleadoId && pwd.length > 0 && pwd.length < 6) {
      alert("Si cambias la contraseña, debe tener al menos 6 caracteres.");
      return;
    }
    try {
      const basePayload = {
        nombres: empleadoForm.nombres,
        apellidos: empleadoForm.apellidos,
        correo: empleadoForm.correo,
        telefono: empleadoForm.telefono,
        rol: empleadoForm.rol,
      };
      let res;
      if (editingEmpleadoId) {
        const payload = { ...basePayload };
        if (pwd) payload.password = pwd;
        res = await fetch(`${API_URL_EMPLEADOS}/${editingEmpleadoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(API_URL_EMPLEADOS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...basePayload, password: pwd }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "No se pudo guardar el empleado.");
        return;
      }
      const fueEdicion = !!editingEmpleadoId;
      cerrarModalEmpleado();
      fetchEmpleados();
      alert(fueEdicion ? "Empleado actualizado." : "Empleado registrado.");
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar empleado.");
    }
  };

  const fetchProductos = async () => { 
    try { 
      console.log('Fetching desde:', API_URL_PRODUCTOS);
      const response = await fetch(API_URL_PRODUCTOS);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Productos recibidos:', data);
      setProductos(data); 
    } catch (e) { 
      console.error('Error al cargar productos:', e); 
      alert('No se pudieron cargar los productos. Verifica el backend.');
    } 
  };
  
  const fetchInventario = async () => { 
    try { 
      const r = await fetch(API_URL_INVENTARIO); 
      setInventario(await r.json()); 
    } catch (e) { 
      console.error(e); 
    } 
  };

  useEffect(() => {
    const onStock = () => {
      if (selectedSection === "productos") fetchProductos();
      if (selectedSection === "dashboard") fetchDashboardData();
    };
    window.addEventListener("swgfsm-stock-actualizado", onStock);
    return () => window.removeEventListener("swgfsm-stock-actualizado", onStock);
  }, [selectedSection]);

  const handleChangeProducto  = (e) => setProductoActual((p)  => ({ ...p,  [e.target.name]: e.target.value }));
  const handleChangeInventario = (e) => setNuevoInventario((p) => ({ ...p, [e.target.name]: e.target.value }));

  const mapProductoToForm = (p) => ({
    ...emptyProductoForm(),
    ...p,
    tipo: p.tipo ?? p.categoriaId ?? "",
    unidadMedida: p.unidadMedida || "kg",
    stockPaltaMadura: p.stockPaltaMadura ?? "",
    stockPaltaVerde: p.stockPaltaVerde ?? "",
    stockPaltaSazon: p.stockPaltaSazon ?? "",
    detalle: p.detalle ?? "",
    tamano: p.tamano ?? "",
  });

  const abrirModalNuevoProducto = () => {
    setModoEditarProducto(false);
    setProductoActual(emptyProductoForm());
    setShowProductoModal(true);
  };
  const abrirModalEditarProducto = (p) => {
    setModoEditarProducto(true);
    setProductoActual(mapProductoToForm(p));
    setShowProductoModal(true);
  };

  const handleSubmitProducto = async (e) => {
    e.preventDefault();
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const payload = {
      nombre: String(productoActual.nombre || "").trim(),
      tipo: String(productoActual.tipo || "").trim(),
      unidadMedida: String(productoActual.unidadMedida || "kg").trim() || "kg",
      precioVenta: num(productoActual.precioVenta),
      stockPaltaMadura: num(productoActual.stockPaltaMadura),
      stockPaltaVerde: num(productoActual.stockPaltaVerde),
      stockPaltaSazon: num(productoActual.stockPaltaSazon),
      detalle: String(productoActual.detalle || "").trim(),
      tamano: String(productoActual.tamano || "").trim(),
      descripcion: String(productoActual.descripcion || "").trim(),
      estado: productoActual.estado || "ACTIVO",
    };
    if (!payload.nombre) {
      alert("El nombre del producto es obligatorio.");
      return;
    }
    try {
      const method = modoEditarProducto ? "PUT" : "POST";
      const url = modoEditarProducto ? `${API_URL_PRODUCTOS}/${productoActual._id}` : API_URL_PRODUCTOS;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchProductos();
        setShowProductoModal(false);
        alert("Producto guardado.");
      } else alert("Error al guardar producto.");
    } catch (err) {
      console.error(err);
    }
  };

  const eliminarProducto = async (p) => {
    if (!p?._id) return;
    if (!window.confirm(`¿Eliminar el producto "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_URL_PRODUCTOS}/${p._id}`, { method: "DELETE" });
      if (res.ok) {
        if (showProductoModal && productoActual._id === p._id) {
          setShowProductoModal(false);
        }
        fetchProductos();
        alert("Producto eliminado.");
      } else {
        let msg = "No se pudo eliminar el producto.";
        try {
          const err = await res.json();
          if (err.message) msg = err.message;
        } catch {
          /* ignore */
        }
        alert(msg);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al eliminar.");
    }
  };

  const handleSubmitInventario = async (e) => {
    e.preventDefault();
    const cantidad = Number(nuevoInventario.cantidad);
    const precioCompra = Number(nuevoInventario.precioCompra);
    const totalInvertido = Number(nuevoInventario.totalInvertido);
    if ([cantidad, precioCompra, totalInvertido].some((n) => isNaN(n) || n < 0)) {
      alert("Cantidad, precio de compra y total invertido deben ser números válidos.");
      return;
    }
    const payload = {
      ...nuevoInventario,
      cantidad,
      precioCompra,
      totalInvertido,
      fecha: nuevoInventario.fecha ? new Date(nuevoInventario.fecha).toISOString() : undefined
    };
    try {
      const res = await fetch(API_URL_INVENTARIO, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        fetchInventario();
        setShowRegistroInventarioModal(false);
        setNuevoInventario({ fecha: "", proveedor: "", numeroPuesto: "", producto: "", tipo: "", tamano: "", detalle: "", cantidad: "", precioCompra: "", totalInvertido: "" });
        alert("Registro guardado.");
      } else {
        let msg = "Error al guardar inventario.";
        try { const b = await res.json(); if (b?.message) msg = b.message; } catch {}
        alert(msg);
      }
    } catch { alert("No se pudo conectar con el servidor."); }
  };

  const handleBack   = () => { if (window.opener) window.close(); else window.history.back(); };
  const confirmLogout = () => {
    localStorage.removeItem("trabajador_logueado");
    localStorage.removeItem("trabajador_actual");
    window.location.href = "/";
  };

  const menuBtnClasses = (s) =>
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
      selectedSection === s ? "bg-emerald-700 text-lime-50" : "text-emerald-100 hover:bg-emerald-800/60"
    }`;

  const sectionLabels = {
    dashboard: "Dashboard",
    caja: "Caja Registradora",
    usuarios: "Usuarios",
    productos: "Productos",
    inventario: "Inventario",
    proveedores: "Proveedores",
    ventas: "Ventas",
    tareasGestion: "Gestión de Tareas",
    tareasAsignadas: "Tareas asignadas",
    prediction: "Predicción",
  };

  const adminMenuOrder = [
    "dashboard",
    "caja",
    "usuarios",
    "productos",
    "inventario",
    "proveedores",
    "ventas",
    "tareasGestion",
    "tareasAsignadas",
    "prediction",
  ];

  const trabajadorSesion = readTrabajador();
  const menuSectionKeys = isPanelVendedor(trabajadorSesion)
    ? ["caja", "ventas", "tareasAsignadas"]
    : adminMenuOrder.filter((k) => Object.prototype.hasOwnProperty.call(sectionLabels, k));

  const inp = "w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400";

  const renderContent = () => {

    /* DASHBOARD */
    if (selectedSection === "dashboard") {
      const fmtSoles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;
      const fmtNum = (n) => (dash.loading ? "…" : String(n ?? "—"));
      const kpi = [
        {
          label: "Ventas hoy",
          sub: dash.ventasHoyCount ? `${dash.ventasHoyCount} ticket(s)` : "Sin ventas hoy",
          value: dash.loading ? "…" : fmtSoles(dash.ventasHoyMonto),
          box: "bg-emerald-50 border-emerald-200",
          lab: "text-emerald-700",
          val: "text-emerald-900",
        },
        {
          label: "Pedidos pendientes",
          sub: "Estado Pendiente",
          value: fmtNum(dash.pedidosPendientes),
          box: "bg-amber-50 border-amber-200",
          lab: "text-amber-800",
          val: "text-amber-950",
        },
        {
          label: "Productos activos",
          sub: "Catálogo tienda",
          value: fmtNum(dash.productosActivos),
          box: "bg-lime-50 border-lime-200",
          lab: "text-lime-800",
          val: "text-lime-950",
        },
        {
          label: "Stock bajo",
          sub: "Menos de 8 kg total",
          value: fmtNum(dash.stockBajoCount),
          box: "bg-red-50 border-red-200",
          lab: "text-red-700",
          val: "text-red-900",
        },
        {
          label: "Clientes registrados",
          sub: "En base de datos",
          value: fmtNum(dash.clientesCount),
          box: "bg-sky-50 border-sky-200",
          lab: "text-sky-800",
          val: "text-sky-950",
        },
      ];
      return (
        <section className="flex-1 space-y-6 overflow-y-auto p-8">
          <div className="rounded-3xl border border-lime-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-emerald-900">Bienvenida al panel de administración</h2>
            <p className="mt-2 text-sm text-gray-500">
              Usa el menú lateral para caja, usuarios, productos, inventario, proveedores, ventas detalladas y el módulo
              de predicción con machine learning.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Datos en vivo desde el backend (ventas, productos, clientes, predicción ML).
            </p>
            <button
              type="button"
              onClick={() => fetchDashboardData()}
              disabled={dash.loading}
              className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
            >
              {dash.loading ? "Actualizando…" : "Actualizar"}
            </button>
          </div>
          {dash.error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{dash.error}</div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {kpi.map((c) => (
              <div key={c.label} className={`rounded-2xl border p-4 ${c.box}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${c.lab}`}>{c.label}</p>
                <p className={`mt-1 text-xl font-extrabold tabular-nums sm:text-2xl ${c.val}`}>{c.value}</p>
                <p className="mt-1 text-[10px] text-gray-500">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-lime-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-emerald-900">Análisis del registro de ventas</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Cada venta queda registrada con total, líneas de producto, método de pago y origen (caja física o tienda
                web). Las cifras de esta sección se calculan con los datos reales devueltos por el servidor.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Últimos 7 días</p>
                  <p className="font-bold text-gray-900">{dash.loading ? "…" : dash.ventas7dCount}</p>
                  <p className="text-xs text-emerald-700">{fmtSoles(dash.ventas7dMonto)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Últimos 30 días</p>
                  <p className="font-bold text-gray-900">{dash.loading ? "…" : dash.ventas30dCount}</p>
                  <p className="text-xs text-emerald-700">{fmtSoles(dash.ventas30dMonto)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Origen CAJA (30 d.)</p>
                  <p className="font-bold text-gray-900">{dash.loading ? "…" : dash.porOrigenCaja}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Origen WEB (30 d.)</p>
                  <p className="font-bold text-gray-900">{dash.loading ? "…" : dash.porOrigenOnline}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white p-4">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900">Ventas por día (últimos 14 días)</h3>
                    <p className="text-[11px] text-gray-500">Altura de cada barra = monto total del día en soles.</p>
                  </div>
                </div>
                {dash.loading ? (
                  <p className="py-8 text-center text-xs text-gray-400">Cargando gráfico…</p>
                ) : (
                  (() => {
                    const lista = dash.ventasLista || [];
                    const chartEnd = getVentasWindowEndAnchor(lista, 14);
                    const buckets = bucketVentasPorDia(lista, 14, chartEnd);
                    const max = Math.max(...buckets.map((b) => b.total), 1);
                    const chartH = 112;
                    const anchorIsPast =
                      lista.length > 0 &&
                      startOfLocalDay(chartEnd).getTime() < startOfLocalDay(new Date()).getTime();
                    return (
                      <>
                        {anchorIsPast && (
                          <p className="mb-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] text-amber-900">
                            No hay ventas en las últimas fechas del calendario; se muestran 14 días hasta la última venta
                            registrada.
                          </p>
                        )}
                      <div className="flex h-[148px] items-end justify-between gap-0.5 border-b border-emerald-200/50 pb-1 sm:gap-1">
                        {buckets.map((b) => {
                          const barPx = b.total > 0 ? Math.max(6, (b.total / max) * chartH) : 4;
                          return (
                            <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center">
                              <div
                                className="w-full max-w-[26px] rounded-t-md bg-emerald-600 transition hover:bg-emerald-700 sm:max-w-[32px]"
                                style={{ height: `${barPx}px` }}
                                title={`${b.label}: ${b.count} venta(s), ${fmtSoles(b.total)}`}
                              />
                              <span className="mt-1 max-w-full truncate text-center text-[9px] leading-tight text-gray-500 sm:text-[10px]">
                                {b.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      </>
                    );
                  })()
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <p className="text-xs font-semibold text-gray-800">Exportar registro de ventas (Excel .xlsx)</p>
                <p className="text-[11px] text-gray-500">
                  Rango: últimos 7, 15, 30 o 365 días respecto a <strong>hoy</strong>; si no hay ventas en ese lapso
                  (p. ej. datos antiguos), se usa la <strong>última fecha con ventas</strong> como fin del periodo.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { days: 7, slug: "semanal", label: "Semanal (7 d.)" },
                    { days: 15, slug: "quincenal", label: "Quincenal (15 d.)" },
                    { days: 30, slug: "mensual", label: "Mensual (30 d.)" },
                    { days: 365, slug: "anual", label: "Anual (365 d.)" },
                  ].map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      disabled={dash.loading}
                      onClick={() => exportVentasXlsx(p.days, p.slug)}
                      className="rounded-full border border-emerald-400 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <h3 className="mt-6 text-sm font-bold text-gray-800">Últimas ventas registradas</h3>
              <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[320px] text-left text-xs">
                  <thead className="sticky top-0 bg-emerald-900 text-lime-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold">N°</th>
                      <th className="px-3 py-2 font-semibold">Fecha</th>
                      <th className="px-3 py-2 font-semibold">Total</th>
                      <th className="px-3 py-2 font-semibold">Estado</th>
                      <th className="px-3 py-2 font-semibold">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.loading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                          Cargando…
                        </td>
                      </tr>
                    ) : dash.ultimasVentas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                          Aún no hay ventas en el sistema.
                        </td>
                      </tr>
                    ) : (
                      dash.ultimasVentas.map((row) => (
                        <tr key={row.id || row.numero} className="border-t border-gray-100 hover:bg-lime-50/50">
                          <td className="px-3 py-2 font-mono text-gray-800">{row.numero || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {row.fecha ? row.fecha.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "—"}
                          </td>
                          <td className="px-3 py-2 font-semibold text-emerald-800">{fmtSoles(row.total)}</td>
                          <td className="px-3 py-2">{row.estado}</td>
                          <td className="px-3 py-2">{row.origen}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-lime-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-emerald-900">Palta madura (predicción ML)</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Kilos estimados por estado de madurez según el modelo de machine learning aplicado a los lotes de
                    inventario registrados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSection("prediction")}
                  className="shrink-0 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-lime-50 hover:bg-emerald-600"
                >
                  Ver predicción
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase text-emerald-800">Maduro (kg)</p>
                  <p className="text-2xl font-extrabold text-emerald-900 tabular-nums">
                    {dash.loading ? "…" : Number(dash.kgMaduroML).toFixed(1)}
                  </p>
                </div>
                <div className="rounded-xl border border-lime-100 bg-lime-50 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase text-lime-900">En sazón (kg)</p>
                  <p className="text-2xl font-extrabold text-lime-950 tabular-nums">
                    {dash.loading ? "…" : Number(dash.kgSazonML).toFixed(1)}
                  </p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase text-green-900">Verde (kg)</p>
                  <p className="text-2xl font-extrabold text-green-950 tabular-nums">
                    {dash.loading ? "…" : Number(dash.kgVerdeML).toFixed(1)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase text-amber-900">Punto negro (kg)</p>
                  <p className="text-2xl font-extrabold text-amber-950 tabular-nums">
                    {dash.loading ? "…" : Number(dash.kgPuntoNegroML).toFixed(1)}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Lotes de inventario considerados:{" "}
                <strong>{dash.loading ? "…" : dash.lotesInventarioML}</strong>. La palta clasificada como{" "}
                <strong>madura</strong> es la que el sistema anticipa lista o casi lista para venta inmediata.
              </p>
            </div>
          </div>
        </section>
      );
    }

    /* CAJA REGISTRADORA */
    if (selectedSection === "caja") {
      return (
        <CajaRegistradora
          onVentaCompletada={() => {
            fetchProductos();
            fetchClientes();
            fetchDashboardData();
          }}
        />
      );
    }

    /* PREDICCION */
     if (selectedSection === "prediction") {
       return <Prediccion />;
    }
    

    /* USUARIOS */
    if (selectedSection === "usuarios") return (
      <section className="flex-1 p-8 space-y-8">
        <h1 className="text-2xl font-bold text-emerald-900">Usuarios</h1>
        <div className="bg-white border border-lime-200 rounded-3xl overflow-hidden">
          <div className="px-8 py-4 border-b border-lime-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-emerald-900">Clientes</h2>
            <button
              type="button"
              onClick={fetchClientes}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            >
              Actualizar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-emerald-900 text-lime-50 text-left">
                {["Nombres", "Apellidos", "Tipo", "Teléfono", "Correo", "Dirección", "Estado"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {cargandoUsuarios ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">Cargando clientes…</td></tr>
                ) : clientes.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No hay clientes registrados. Los datos ingresados en Caja registradora al concretar una venta aparecerán aquí.</td></tr>
                ) : (
                  clientes.map((c) => (
                    <tr key={c._id} className="border-t hover:bg-lime-50">
                      <td className="px-4 py-2">{c.nombres}</td>
                      <td className="px-4 py-2">{c.apellidos}</td>
                      <td className="px-4 py-2">{c.tipoCliente}</td>
                      <td className="px-4 py-2">{c.telefono || "—"}</td>
                      <td className="px-4 py-2">{c.correo || "—"}</td>
                      <td className="px-4 py-2">{c.direccion || "—"}</td>
                      <td className="px-4 py-2"><span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">{c.estado}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-lime-200 rounded-3xl overflow-hidden">
          <div className="px-8 py-4 border-b border-lime-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-emerald-900">Empleados</h2>
            <button type="button" onClick={abrirModalNuevoEmpleado} className="px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 text-lime-50 hover:bg-emerald-600">+ Añadir</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-emerald-900 text-lime-50 text-left">
                {["Nombres", "Apellidos", "Correo", "Teléfono", "Rol", "Estado", "Acciones"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {cargandoUsuarios ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">Cargando empleados…</td></tr>
                ) : empleados.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No hay empleados. Usa &quot;+ Añadir&quot; para registrar uno en la base de datos.</td></tr>
                ) : (
                  empleados.map((e) => (
                    <tr key={e._id} className="border-t hover:bg-lime-50">
                      <td className="px-4 py-2">{e.nombres}</td>
                      <td className="px-4 py-2">{e.apellidos}</td>
                      <td className="px-4 py-2">{e.correo}</td>
                      <td className="px-4 py-2">{e.telefono || "—"}</td>
                      <td className="px-4 py-2">{e.rol}</td>
                      <td className="px-4 py-2"><span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">{e.estado}</span></td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => abrirModalEditarEmpleado(e)}
                          className="text-xs font-semibold text-emerald-800 hover:underline"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showEmpleadoModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmitEmpleado}>
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h2 className="text-base font-bold text-gray-900">{editingEmpleadoId ? "Editar empleado" : "Nuevo empleado"}</h2>
                  <button type="button" onClick={cerrarModalEmpleado} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                </div>
                <div className="px-6 py-4 space-y-3 text-sm">
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Nombres</label>
                    <input name="nombres" value={empleadoForm.nombres} onChange={handleChangeEmpleadoForm} className={inp} required />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Apellidos</label>
                    <input name="apellidos" value={empleadoForm.apellidos} onChange={handleChangeEmpleadoForm} className={inp} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Correo *</label>
                    <input type="email" name="correo" value={empleadoForm.correo} onChange={handleChangeEmpleadoForm} className={inp} required />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">
                      Contraseña {editingEmpleadoId ? "(opcional)" : "*"}
                    </label>
                    <PasswordInput
                      name="password"
                      value={empleadoForm.password}
                      onChange={handleChangeEmpleadoForm}
                      placeholder={
                        editingEmpleadoId ? "Dejar en blanco para no cambiar" : "Ingrese su contraseña (mín. 6 caracteres)"
                      }
                      autoComplete="new-password"
                      required={!editingEmpleadoId}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Teléfono</label>
                    <input name="telefono" value={empleadoForm.telefono} onChange={handleChangeEmpleadoForm} className={inp} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Rol</label>
                    <select name="rol" value={empleadoForm.rol} onChange={handleChangeEmpleadoForm} className={inp}>
                      <option value="Vendedor">Vendedor</option>
                      <option value="Personal de despacho">Personal de despacho</option>
                      <option value="Administrador de almacén">Administrador de almacén</option>
                      <option value="Administrador de compras">Administrador de compras</option>
                      <option value="Administrador de sistemas">Administrador de sistemas</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t">
                  <button type="button" onClick={cerrarModalEmpleado} className="px-4 py-2 rounded-full text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="px-4 py-2 rounded-full text-sm bg-emerald-700 text-white hover:bg-emerald-800">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    );

    /* PRODUCTOS */
    if (selectedSection === "productos") return (
      <section className="flex-1 p-8">
        <div className="bg-white border border-lime-200 rounded-3xl overflow-hidden">
          <div className="px-8 py-4 border-b border-lime-100 flex justify-between items-center flex-wrap gap-2">
            <h2 className="font-bold text-emerald-900">Listado de productos</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  fetchProductos();
                  window.dispatchEvent(new Event("swgfsm-stock-actualizado"));
                }}
                className="px-4 py-2 text-xs font-semibold rounded-full border border-emerald-700 text-emerald-800 hover:bg-emerald-50"
              >
                Actualizar
              </button>
              <button onClick={abrirModalNuevoProducto} className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-700 text-lime-50 hover:bg-emerald-800">+ Añadir producto</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-900 text-lime-50">
                <tr>
                  {[
                    "Producto",
                    "Tipo",
                    "Unidad",
                    "P. venta",
                    "Madura (kg)",
                    "Verde (kg)",
                    "Sazón (kg)",
                    "Estado",
                    "Acciones",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => {
                  const tipo = p.tipo ?? p.categoriaId ?? "—";
                  const u = p.unidadMedida || "kg";
                  return (
                    <tr key={p._id} className="border-b hover:bg-lime-50">
                      <td className="px-4 py-2 font-medium">{p.nombre}</td>
                      <td className="px-4 py-2">{tipo}</td>
                      <td className="px-4 py-2">{u}</td>
                      <td className="px-4 py-2">S/ {p.precioVenta}</td>
                      <td className="px-4 py-2">{p.stockPaltaMadura ?? "—"}</td>
                      <td className="px-4 py-2">{p.stockPaltaVerde ?? "—"}</td>
                      <td className="px-4 py-2">{p.stockPaltaSazon ?? "—"}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            p.estado === "ACTIVO" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => abrirModalEditarProducto(p)}
                            className="px-3 py-1 text-xs rounded-full bg-amber-500 text-white hover:bg-amber-600"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarProducto(p)}
                            className="px-3 py-1 text-xs rounded-full bg-red-600 text-white hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {productos.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center py-6 text-gray-400">
                      No hay productos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showProductoModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
              <h2 className="text-lg font-bold mb-4 text-emerald-900">{modoEditarProducto ? "Editar" : "Nuevo"} Producto</h2>
              <form onSubmit={handleSubmitProducto} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Producto</label>
                  <input
                    className={inp}
                    type="text"
                    name="nombre"
                    value={productoActual.nombre || ""}
                    onChange={handleChangeProducto}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Tipo</label>
                  <input className={inp} type="text" name="tipo" value={productoActual.tipo || ""} onChange={handleChangeProducto} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Unidad de medida (kg)</label>
                  <input className={inp} type="text" name="unidadMedida" value={productoActual.unidadMedida || "kg"} onChange={handleChangeProducto} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Precio venta</label>
                  <input
                    className={inp}
                    type="number"
                    step="0.01"
                    min="0"
                    name="precioVenta"
                    value={productoActual.precioVenta || ""}
                    onChange={handleChangeProducto}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Stock palta madura (kg)</label>
                  <input
                    className={inp}
                    type="number"
                    step="0.01"
                    min="0"
                    name="stockPaltaMadura"
                    value={productoActual.stockPaltaMadura ?? ""}
                    onChange={handleChangeProducto}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Stock palta verde (kg)</label>
                  <input
                    className={inp}
                    type="number"
                    step="0.01"
                    min="0"
                    name="stockPaltaVerde"
                    value={productoActual.stockPaltaVerde ?? ""}
                    onChange={handleChangeProducto}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Stock palta sazón (kg)</label>
                  <input
                    className={inp}
                    type="number"
                    step="0.01"
                    min="0"
                    name="stockPaltaSazon"
                    value={productoActual.stockPaltaSazon ?? ""}
                    onChange={handleChangeProducto}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1 text-gray-600">Detalle</label>
                  <textarea className={inp} name="detalle" value={productoActual.detalle || ""} onChange={handleChangeProducto} rows={2} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Tamaño</label>
                  <input className={inp} type="text" name="tamano" value={productoActual.tamano || ""} onChange={handleChangeProducto} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Estado</label>
                  <select className={inp} name="estado" value={productoActual.estado} onChange={handleChangeProducto}>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1 text-gray-600">Descripción</label>
                  <textarea className={inp} name="descripcion" value={productoActual.descripcion || ""} onChange={handleChangeProducto} rows={2} />
                </div>
                <div className="col-span-2 flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowProductoModal(false)} className="px-4 py-2 border rounded-full text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-700 text-white rounded-full hover:bg-emerald-800">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    );

    /* INVENTARIO */
    if (selectedSection === "inventario") return (
      <section className="flex-1 p-8">
        <div className="bg-white border border-lime-200 rounded-3xl overflow-hidden">
          <div className="px-8 py-4 border-b border-lime-100 flex justify-between items-center">
            <h2 className="font-bold text-emerald-900">Inventario de paltas</h2>
            <button onClick={() => setShowRegistroInventarioModal(true)} className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-700 text-lime-50 hover:bg-emerald-800">+ Agregar registro</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-900 text-lime-50">
                <tr>{["Fecha","Proveedor","Puesto","Producto","Tipo","Tamaño","Detalle","Cant. (kg)","Precio de compra","Total invertido"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {inventario.length === 0
                  ? <tr><td colSpan="10" className="p-6 text-center text-gray-400">No hay registros de inventario.</td></tr>
                  : inventario.map(inv => (
                    <tr key={inv._id} className="border-b hover:bg-lime-50">
                      <td className="px-4 py-2">{inv.fecha ? new Date(inv.fecha).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2">{inv.proveedor}</td>
                      <td className="px-4 py-2">{inv.numeroPuesto}</td>
                      <td className="px-4 py-2">{inv.producto}</td>
                      <td className="px-4 py-2">{inv.tipo}</td>
                      <td className="px-4 py-2">{inv.tamano}</td>
                      <td className="px-4 py-2">{inv.detalle}</td>
                      <td className="px-4 py-2 font-bold">{inv.cantidad} kg</td>
                      <td className="px-4 py-2">S/ {inv.precioCompra ?? inv.precio}</td>
                      <td className="px-4 py-2 text-emerald-700 font-bold">S/ {inv.totalInvertido ?? inv.pago}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {showRegistroInventarioModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-lg font-bold mb-4 text-emerald-900">Nuevo registro de inventario</h2>
              <form onSubmit={handleSubmitInventario} className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold mb-1 text-gray-600">Fecha</label><input type="date" name="fecha" className={inp} value={nuevoInventario.fecha} onChange={handleChangeInventario} required /></div>
                <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-gray-600">Proveedor</label><input type="text" name="proveedor" className={inp} value={nuevoInventario.proveedor} onChange={handleChangeInventario} required /></div>
                <div><label className="block text-xs font-bold mb-1 text-gray-600">N° de puesto</label><input type="text" name="numeroPuesto" className={inp} value={nuevoInventario.numeroPuesto} onChange={handleChangeInventario} /></div>
                <div><label className="block text-xs font-bold mb-1 text-gray-600">Producto</label><input type="text" name="producto" className={inp} value={nuevoInventario.producto} onChange={handleChangeInventario} required /></div>
                <div><label className="block text-xs font-bold mb-1 text-gray-600">Tipo</label><input type="text" name="tipo" className={inp} value={nuevoInventario.tipo} onChange={handleChangeInventario} /></div>
                <div><label className="block text-xs font-bold mb-1 text-gray-600">Tamaño</label><input type="text" name="tamano" className={inp} value={nuevoInventario.tamano} onChange={handleChangeInventario} /></div>
                <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-gray-600">Detalle</label><input type="text" name="detalle" className={inp} value={nuevoInventario.detalle} onChange={handleChangeInventario} /></div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Cantidad (kg)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="cantidad"
                      min="0"
                      step="0.01"
                      className={inp}
                      value={nuevoInventario.cantidad}
                      onChange={handleChangeInventario}
                      required
                    />
                    <span className="text-sm font-semibold text-emerald-800 shrink-0">kg</span>
                  </div>
                </div>
                <div><label className="block text-xs font-bold mb-1 text-gray-600">Precio de compra</label><input type="number" step="0.01" name="precioCompra" className={inp} value={nuevoInventario.precioCompra} onChange={handleChangeInventario} required /></div>
                <div><label className="block text-xs font-bold mb-1 text-gray-600">Total invertido</label><input type="number" step="0.01" name="totalInvertido" className={inp} value={nuevoInventario.totalInvertido} onChange={handleChangeInventario} required /></div>
                <div className="col-span-2 flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowRegistroInventarioModal(false)} className="px-4 py-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="px-4 py-2 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    );

    /* PROVEEDORES */
    if (selectedSection === "proveedores") return <ProveedoresTable />;

    /* VENTAS */
    if (selectedSection === "ventas") {
      return <VentasAdmin />;
    }

    if (selectedSection === "tareasGestion") {
      return <GestionTareas />;
    }

    if (selectedSection === "tareasAsignadas") {
      return <TareasAsignadas />;
    }

    return null;
  };

  return (
    <div className="min-h-screen flex bg-lime-100 font-sans">
      <aside className="w-64 bg-emerald-950 text-lime-50 flex flex-col shadow-2xl z-10 flex-shrink-0">
        <div className="p-6 border-b border-emerald-800">
          <p className="text-xs text-emerald-400 uppercase tracking-widest mb-1">
            {isPanelVendedor(trabajadorSesion) ? "Panel vendedor" : "Panel Admin"}
          </p>
          <h1 className="text-base font-bold leading-tight">Frutería Señor de Muruhuay</h1>
          {trabajadorSesion?.nombres && (
            <p className="text-xs text-emerald-300/90 mt-2">
              {trabajadorSesion.nombres} {trabajadorSesion.apellidos || ""}
            </p>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuSectionKeys.map((sec) => (
            <button
              key={sec}
              className={menuBtnClasses(sec)}
              onClick={() => { setSelectedSection(sec); setModoNuevaVenta(false); }}
            >
              {sectionLabels[sec]}
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-emerald-800">
          <button onClick={() => setShowLogoutModal(true)} className="w-full bg-red-600/80 hover:bg-red-600 py-2.5 rounded-xl text-white text-sm font-semibold transition">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-lime-50">
        <header className="flex justify-between p-5 bg-white border-b sticky top-0 z-10 shadow-sm items-center">
          <h1 className="text-xl font-bold text-emerald-900">{sectionLabels[selectedSection]}</h1>
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="text-sm text-emerald-700 font-semibold hover:underline">
              Volver
            </button>
          </div>
        </header>
        {renderContent()}
      </main>

      {showLogoutModal && <LogoutModal onConfirm={confirmLogout} onCancel={() => setShowLogoutModal(false)} />}
    </div>
  );
};

export default AdminDashboard;