// src/components/AdminDashboard.js - VERSIÓN CORREGIDA

import React, { useState, useEffect } from "react";
import ProveedoresTable from "./ProveedoresTable";
import VentasAdmin from "./VentasAdmin";
import CajaRegistradora from "./CajaRegistradora";

const API_URL_PRODUCTOS  = "http://localhost:5000/api/producto";
const API_URL_INVENTARIO = "http://localhost:5000/api/inventario";

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
  const [selectedSection, setSelectedSection] = useState("dashboard");
  const [modoNuevaVenta, setModoNuevaVenta]   = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [showEmpleadoModal, setShowEmpleadoModal]               = useState(false);
  const [showProductoModal, setShowProductoModal]               = useState(false);
  const [showRegistroInventarioModal, setShowRegistroInventarioModal] = useState(false);

  const [productos,  setProductos]  = useState([]);
  const [inventario, setInventario] = useState([]);

  const [modoEditarProducto, setModoEditarProducto] = useState(false);
  const [productoActual, setProductoActual] = useState({
    nombre: "", categoriaId: "", unidadMedida: "", precioCompra: "",
    precioVenta: "", stockMinimo: "", stockSemanal: "", descripcion: "", estado: "ACTIVO",
  });

  const [nuevoInventario, setNuevoInventario] = useState({
    fecha: "", proveedor: "", numeroPuesto: "", producto: "",
    tipo: "", tamano: "", detalle: "", cantidad: "", precio: "", pago: "",
  });

  const clientesDemo = [
    { _id: "1", nombres: "Hugo", apellidos: "García López", tipoCliente: "MINORISTA", telefono: "999123456", correo: "hgarcia@gmail.com", direccion: "Av. Principal 456 – Chosica", estado: "ACTIVO" },
  ];
  const empleadosDemo = [
    { _id: "1", nombres: "María", apellidos: "Pérez Soto", correo: "maria@muruhuay.com", telefono: "987654321", rol: "ADMIN_ALMACEN", estado: "ACTIVO" },
  ];

  useEffect(() => {
    if (selectedSection === "productos")  fetchProductos();
    if (selectedSection === "inventario") fetchInventario();
  }, [selectedSection]);

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

  const handleChangeProducto  = (e) => setProductoActual((p)  => ({ ...p,  [e.target.name]: e.target.value }));
  const handleChangeInventario = (e) => setNuevoInventario((p) => ({ ...p, [e.target.name]: e.target.value }));

  const abrirModalNuevoProducto    = () => { setModoEditarProducto(false); setProductoActual({ nombre: "", categoriaId: "", unidadMedida: "", precioCompra: "", precioVenta: "", stockMinimo: "", stockSemanal: "", descripcion: "", estado: "ACTIVO" }); setShowProductoModal(true); };
  const abrirModalEditarProducto   = (p) => { setModoEditarProducto(true); setProductoActual(p); setShowProductoModal(true); };

  const handleSubmitProducto = async (e) => {
    e.preventDefault();
    try {
      const method = modoEditarProducto ? "PUT" : "POST";
      const url    = modoEditarProducto ? `${API_URL_PRODUCTOS}/${productoActual._id}` : API_URL_PRODUCTOS;
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(productoActual) });
      if (res.ok) { fetchProductos(); setShowProductoModal(false); alert("Producto guardado."); }
      else alert("Error al guardar producto.");
    } catch (err) { console.error(err); }
  };

  const handleSubmitInventario = async (e) => {
    e.preventDefault();
    const cantidad = Number(nuevoInventario.cantidad);
    const precio   = Number(nuevoInventario.precio);
    const pago     = Number(nuevoInventario.pago);
    if ([cantidad, precio, pago].some((n) => isNaN(n) || n < 0)) { alert("Cantidad, precio y pago deben ser números válidos."); return; }
    const payload = { ...nuevoInventario, cantidad, precio, pago, fecha: nuevoInventario.fecha ? new Date(nuevoInventario.fecha).toISOString() : undefined };
    try {
      const res = await fetch(API_URL_INVENTARIO, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        fetchInventario();
        setShowRegistroInventarioModal(false);
        setNuevoInventario({ fecha: "", proveedor: "", numeroPuesto: "", producto: "", tipo: "", tamano: "", detalle: "", cantidad: "", precio: "", pago: "" });
        alert("Registro guardado.");
      } else {
        let msg = "Error al guardar inventario.";
        try { const b = await res.json(); if (b?.message) msg = b.message; } catch {}
        alert(msg);
      }
    } catch { alert("No se pudo conectar con el servidor."); }
  };

  const handleBack   = () => { if (window.opener) window.close(); else window.history.back(); };
  const confirmLogout = () => { window.location.href = "/"; };

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
    ml: "Análisis ML",
  };

  const inp = "w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400";

  const renderContent = () => {

    /* DASHBOARD */
    if (selectedSection === "dashboard") return (
      <section className="flex-1 p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Ventas hoy",        value: "S/ 0.00",  color: "emerald" },
            { label: "Pedidos pendientes", value: "0",        color: "amber" },
            { label: "Productos activos",  value: "—",        color: "lime" },
            { label: "Stock bajo",         value: "0",        color: "red" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-2xl p-5`}>
              <p className={`text-xs font-semibold text-${color}-700 uppercase tracking-wide mb-1`}>{label}</p>
              <p className={`text-2xl font-extrabold text-${color}-900`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="bg-white border border-lime-200 rounded-3xl p-8">
          <h2 className="text-lg font-bold text-emerald-900 mb-2">Bienvenida al panel de administración</h2>
          <p className="text-sm text-gray-500">Desde aquí puedes gestionar productos, inventario, proveedores, ventas y ver análisis inteligentes con ML. Usa el menú lateral para navegar entre secciones.</p>
        </div>
      </section>
    );

    /* CAJA REGISTRADORA */
    if (selectedSection === "caja") {
      return <CajaRegistradora />;
    }

    /* ANÁLISIS ML */
    if (selectedSection === "ml") return (
      <section className="flex-1 p-8 space-y-6">
        <div className="bg-white border border-lime-200 rounded-3xl p-8">
          <h2 className="text-lg font-bold text-emerald-900 mb-1">Análisis Inteligente (ML)</h2>
          <p className="text-sm text-gray-400 mb-6">Predicciones de demanda y tendencias de ventas basadas en tu historial.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Demanda estimada", desc: "Predicción de ventas para la próxima semana basada en datos históricos.", badge: "Próximamente" },
              { title: "Producto más vendido", desc: "Identificación automática de tu producto estrella por temporada.", badge: "Próximamente" },
              { title: "Alerta de stock", desc: "Aviso inteligente cuando el stock proyectado es insuficiente para la demanda.", badge: "Próximamente" },
            ].map(({ title, desc, badge }) => (
              <div key={title} className="bg-lime-50 border border-lime-200 rounded-2xl p-5">
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-3 py-0.5 rounded-full">{badge}</span>
                <h3 className="font-bold text-emerald-900 mt-3 mb-1 text-sm">{title}</h3>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

    /* USUARIOS */
    if (selectedSection === "usuarios") return (
      <section className="flex-1 p-8 space-y-8">
        <div className="bg-white border border-lime-200 rounded-3xl overflow-hidden">
          <div className="px-8 py-4 border-b border-lime-100">
            <h2 className="text-sm font-bold text-emerald-900">Clientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-emerald-900 text-lime-50 text-left">
                {["Nombres", "Apellidos", "Tipo", "Teléfono", "Correo", "Dirección", "Estado"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {clientesDemo.map(c => (
                  <tr key={c._id} className="border-t hover:bg-lime-50">
                    <td className="px-4 py-2">{c.nombres}</td><td className="px-4 py-2">{c.apellidos}</td>
                    <td className="px-4 py-2">{c.tipoCliente}</td><td className="px-4 py-2">{c.telefono}</td>
                    <td className="px-4 py-2">{c.correo}</td><td className="px-4 py-2">{c.direccion}</td>
                    <td className="px-4 py-2"><span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">{c.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-lime-200 rounded-3xl overflow-hidden">
          <div className="px-8 py-4 border-b border-lime-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-emerald-900">Empleados</h2>
            <button onClick={() => setShowEmpleadoModal(true)} className="px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 text-lime-50 hover:bg-emerald-600">+ Añadir</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-emerald-900 text-lime-50 text-left">
                {["Nombres", "Apellidos", "Correo", "Teléfono", "Rol", "Estado"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {empleadosDemo.map(e => (
                  <tr key={e._id} className="border-t hover:bg-lime-50">
                    <td className="px-4 py-2">{e.nombres}</td><td className="px-4 py-2">{e.apellidos}</td>
                    <td className="px-4 py-2">{e.correo}</td><td className="px-4 py-2">{e.telefono}</td>
                    <td className="px-4 py-2">{e.rol}</td>
                    <td className="px-4 py-2"><span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">{e.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showEmpleadoModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-base font-bold text-gray-900">Nuevo empleado</h2>
                <button onClick={() => setShowEmpleadoModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
              <div className="px-6 py-4 space-y-3 text-sm">
                {["Nombres", "Apellidos", "Email", "Teléfono"].map(f => (
                  <div key={f}>
                    <label className="block mb-1 font-medium text-gray-700">{f}</label>
                    <input type={f === "Email" ? "email" : "text"} className={inp} />
                  </div>
                ))}
                <div>
                  <label className="block mb-1 font-medium text-gray-700">Rol</label>
                  <select className={inp}><option>Vendedor</option><option>Administrador</option></select>
                </div>
                <div>
                  <label className="block mb-1 font-medium text-gray-700">Contraseña</label>
                  <input type="password" className={inp} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t">
                <button onClick={() => setShowEmpleadoModal(false)} className="px-4 py-2 rounded-full text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button className="px-4 py-2 rounded-full text-sm bg-emerald-700 text-white hover:bg-emerald-800">Guardar</button>
              </div>
            </div>
          </div>
        )}
      </section>
    );

    /* PRODUCTOS */
    if (selectedSection === "productos") return (
      <section className="flex-1 p-8">
        <div className="bg-white border border-lime-200 rounded-3xl overflow-hidden">
          <div className="px-8 py-4 border-b border-lime-100 flex justify-between items-center">
            <h2 className="font-bold text-emerald-900">Listado de productos</h2>
            <button onClick={abrirModalNuevoProducto} className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-700 text-lime-50 hover:bg-emerald-800">+ Añadir producto</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-900 text-lime-50">
                <tr>{["Nombre","Categoría","Unidad","P. Compra","P. Venta","Stock Min.","Stock Sem.","Estado","Acciones"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p._id} className="border-b hover:bg-lime-50">
                    <td className="px-4 py-2 font-medium">{p.nombre}</td>
                    <td className="px-4 py-2">{p.categoriaId}</td>
                    <td className="px-4 py-2">{p.unidadMedida}</td>
                    <td className="px-4 py-2">S/ {p.precioCompra}</td>
                    <td className="px-4 py-2">S/ {p.precioVenta}</td>
                    <td className="px-4 py-2">{p.stockMinimo}</td>
                    <td className="px-4 py-2">{p.stockSemanal}</td>
                    <td className="px-4 py-2"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.estado === "ACTIVO" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{p.estado}</span></td>
                    <td className="px-4 py-2">
                      <button onClick={() => abrirModalEditarProducto(p)} className="px-3 py-1 text-xs rounded-full bg-amber-500 text-white hover:bg-amber-600">Editar</button>
                    </td>
                  </tr>
                ))}
                {productos.length === 0 && <tr><td colSpan="9" className="text-center py-6 text-gray-400">No hay productos registrados.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {showProductoModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
              <h2 className="text-lg font-bold mb-4 text-emerald-900">{modoEditarProducto ? "Editar" : "Nuevo"} Producto</h2>
              <form onSubmit={handleSubmitProducto} className="grid grid-cols-2 gap-4">
                {[
                  { label: "Nombre", name: "nombre", type: "text", required: true },
                  { label: "Categoría", name: "categoriaId", type: "text" },
                  { label: "Unidad de medida", name: "unidadMedida", type: "text" },
                  { label: "Precio compra", name: "precioCompra", type: "number" },
                  { label: "Precio venta", name: "precioVenta", type: "number" },
                  { label: "Stock mínimo", name: "stockMinimo", type: "number" },
                  { label: "Stock semanal", name: "stockSemanal", type: "number" },
                ].map(({ label, name, type, required }) => (
                  <div key={name}>
                    <label className="block text-xs font-bold mb-1 text-gray-600">{label}</label>
                    <input className={inp} type={type} step={type === "number" ? "0.01" : undefined} name={name} value={productoActual[name] || ""} onChange={handleChangeProducto} required={required} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">Estado</label>
                  <select className={inp} name="estado" value={productoActual.estado} onChange={handleChangeProducto}>
                    <option value="ACTIVO">ACTIVO</option><option value="INACTIVO">INACTIVO</option>
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
                <tr>{["Fecha","Proveedor","Puesto","Producto","Tipo","Tamaño","Detalle","Cant.","Precio","Pago"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
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
                      <td className="px-4 py-2 font-bold">{inv.cantidad}</td>
                      <td className="px-4 py-2">S/ {inv.precio}</td>
                      <td className="px-4 py-2 text-emerald-700 font-bold">S/ {inv.pago}</td>
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
                <div><label className="block text-xs font-bold mb-1 text-gray-600">Cantidad</label><input type="number" name="cantidad" className={inp} value={nuevoInventario.cantidad} onChange={handleChangeInventario} required /></div>
                <div><label className="block text-xs font-bold mb-1 text-gray-600">Precio</label><input type="number" step="0.01" name="precio" className={inp} value={nuevoInventario.precio} onChange={handleChangeInventario} required /></div>
                <div><label className="block text-xs font-bold mb-1 text-gray-600">Pago</label><input type="number" step="0.01" name="pago" className={inp} value={nuevoInventario.pago} onChange={handleChangeInventario} required /></div>
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

    return null;
  };

  return (
    <div className="min-h-screen flex bg-lime-100 font-sans">
      <aside className="w-64 bg-emerald-950 text-lime-50 flex flex-col shadow-2xl z-10 flex-shrink-0">
        <div className="p-6 border-b border-emerald-800">
          <p className="text-xs text-emerald-400 uppercase tracking-widest mb-1">Panel Admin</p>
          <h1 className="text-base font-bold leading-tight">Frutería Señor de Muruhuay</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {Object.entries(sectionLabels).map(([sec, label]) => (
            <button
              key={sec}
              className={menuBtnClasses(sec)}
              onClick={() => { setSelectedSection(sec); setModoNuevaVenta(false); }}
            >
              {label}
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