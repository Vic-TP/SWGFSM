import React, { useState, useEffect } from "react";
import Prediccion from "../predict/Prediccion";
import ProveedoresTable from "./ProveedoresTable";


// Configuración de la API
// Asegúrate de que tu backend esté corriendo en el puerto 5000
const API_URL_PRODUCTOS = "http://localhost:5000/api/productos";
const API_URL_INVENTARIO = "http://localhost:5000/api/inventario";

const AdminDashboard = () => {
  // ==========================================
  // 1. ESTADOS (HOOKS)
  // ==========================================
  
  // Navegación principal
  const [selectedSection, setSelectedSection] = useState("dashboard");
  const [modoNuevaVenta, setModoNuevaVenta] = useState(false);

  // Estados de visibilidad de Modales
  const [showEmpleadoModal, setShowEmpleadoModal] = useState(false);
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [showRegistroInventarioModal, setShowRegistroInventarioModal] = useState(false);

  // Estados de Datos (Listas que vienen de la base de datos)
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]); 

  // Estado para el formulario de PRODUCTOS (Crear/Editar)
  const [modoEditarProducto, setModoEditarProducto] = useState(false);
  const [productoActual, setProductoActual] = useState({
    nombre: "", 
    categoriaId: "", 
    unidadMedida: "", 
    precioCompra: "",
    precioVenta: "", 
    stockMinimo: "", 
    stockSemanal: "", 
    descripcion: "", 
    estado: "ACTIVO"
  });

  // Estado para el formulario de INVENTARIO (Solo Crear)
 const [nuevoInventario, setNuevoInventario] = useState({
    fecha: "",
    proveedor: "",
    numeroPuesto: "",
    producto: "",
    tipo: "",
    tamano: "",
    detalle: "",
    cantidad: "",
    precio: "",
    pago: "",
  });
  

  // --- DATOS DEMO (Solo visuales por ahora para Usuarios) ---
  const clientesDemo = [
    {
      _id: "691e7113f967f83afdfc295e",
      nombres: "Hugo",
      apellidos: "García López",
      tipoCliente: "MINORISTA",
      telefono: "999123456",
      correo: "hgarcia@gmail.com",
      direccion: "Av. Principal 456 – Chosica",
      estado: "ACTIVO",
    },
  ];

  const empleadosDemo = [
    {
      _id: "691e6da5f967f83afdfc2940",
      nombres: "María",
      apellidos: "Pérez Soto",
      correo: "maria@muruhuay.com",
      telefono: "987654321",
      rol: "ADMIN_ALMACEN",
      estado: "ACTIVO",
    },
  ];

  // ==========================================
  // 2. EFECTOS (CARGA DE DATOS AUTOMÁTICA)
  // ==========================================
  
  // Se ejecuta cada vez que cambias de sección
  useEffect(() => {
    if (selectedSection === "productos") fetchProductos();
    if (selectedSection === "inventario") fetchInventario();
  }, [selectedSection]);

  // Función para pedir la lista de productos al backend
  const fetchProductos = async () => {
    try {
      const res = await fetch(API_URL_PRODUCTOS);
      const data = await res.json();
      setProductos(data);
    } catch (error) { console.error("Error cargando productos:", error); }
  };

  // Función para pedir la lista de inventario al backend
  const fetchInventario = async () => {
    try {
      const res = await fetch(API_URL_INVENTARIO);
      const data = await res.json();
      setInventario(data);
    } catch (error) { console.error("Error cargando inventario:", error); }
  };

  // ==========================================
  // 3. HANDLERS (LÓGICA DE PRODUCTOS)
  // ==========================================

  // Maneja lo que escribes en los inputs de productos
  const handleChangeProducto = (e) => {
    const { name, value } = e.target;
    setProductoActual((prev) => ({ ...prev, [name]: value }));
  };

  const abrirModalNuevoProducto = () => {
    setModoEditarProducto(false);
    // Limpiamos el formulario con todos los campos
    setProductoActual({ nombre: "", categoriaId: "", unidadMedida: "", precioCompra: "", precioVenta: "", stockMinimo: "", stockSemanal: "", descripcion: "", estado: "ACTIVO" });
    setShowProductoModal(true);
  };

  const abrirModalEditarProducto = (prod) => {
    setModoEditarProducto(true);
    // Cargamos los datos del producto seleccionado
    setProductoActual(prod);
    setShowProductoModal(true);
  };

  // Envía los datos de producto al backend (POST o PUT)
  const handleSubmitProducto = async (e) => {
    e.preventDefault();
    const payload = { ...productoActual }; 
    try {
      const method = modoEditarProducto ? "PUT" : "POST";
      const url = modoEditarProducto ? `${API_URL_PRODUCTOS}/${productoActual._id}` : API_URL_PRODUCTOS;
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchProductos(); // Recargar lista para ver cambios
        setShowProductoModal(false);
        alert("Producto guardado correctamente");
      } else {
        alert("Error al guardar producto");
      }
    } catch (error) { console.error(error); }
  };

  // ==========================================
  // 4. HANDLERS (LÓGICA DE INVENTARIO)
  // ==========================================

  // Maneja lo que escribes en los inputs de inventario
  const handleChangeInventario = (e) => {
    const { name, value } = e.target;
    setNuevoInventario((prev) => ({ ...prev, [name]: value }));
  };

  // Envía el nuevo registro de inventario al backend (MongoDB Atlas vía API)
  const handleSubmitInventario = async (e) => {
    e.preventDefault();
    const cantidad = Number(nuevoInventario.cantidad);
    const precio = Number(nuevoInventario.precio);
    const pago = Number(nuevoInventario.pago);
    if ([cantidad, precio, pago].some((n) => Number.isNaN(n) || n < 0)) {
      alert("Cantidad, precio y pago deben ser números válidos (≥ 0).");
      return;
    }
    const payload = {
      proveedor: nuevoInventario.proveedor.trim(),
      producto: nuevoInventario.producto.trim(),
      cantidad,
      precio,
      pago,
      fecha: nuevoInventario.fecha ? new Date(nuevoInventario.fecha).toISOString() : undefined,
      numeroPuesto: nuevoInventario.numeroPuesto?.trim() || undefined,
      tipo: nuevoInventario.tipo?.trim() || undefined,
      tamano: nuevoInventario.tamano?.trim() || undefined,
      detalle: nuevoInventario.detalle?.trim() || undefined,
    };
    try {
      const res = await fetch(API_URL_INVENTARIO, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchInventario();
        setShowRegistroInventarioModal(false);
        setNuevoInventario({
          fecha: "",
          proveedor: "",
          numeroPuesto: "",
          producto: "",
          tipo: "",
          tamano: "",
          detalle: "",
          cantidad: "",
          precio: "",
          pago: "",
        });
        alert("Registro guardado en la base de datos.");
      } else {
        let msg = "Error al guardar inventario.";
        try {
          const errBody = await res.json();
          if (errBody?.message) msg = errBody.message;
        } catch {
          /* ignore */
        }
        alert(msg);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo conectar con el servidor. ¿Está el backend en marcha?");
    }
  };

  // ==========================================
  // 5. RENDER Y UI (VISUALIZACIÓN)
  // ==========================================
  const handleBack = () => {
    if (window.opener) window.close();
    else window.history.back();
  };
  
  const handleLogout = () => window.location.href = "/";
  
  // Clases CSS para el menú lateral
  const menuBtnClasses = (section) => `w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${selectedSection === section ? "bg-emerald-800 text-lime-50" : "hover:bg-emerald-800/70"}`;
  
  const getHeaderTitle = () => {
  const titles = {
    dashboard: "Dashboard",
    usuarios: "Usuarios",
    productos: "Productos",
    inventario: "Inventario",
    proveedores: "Proveedores",
    ventas: "Ventas",
    prediccion: "Predicción",
  };
  return titles[selectedSection] || selectedSection;
};

  // Función que decide qué mostrar en la pantalla principal
  const renderContent = () => {
    // --- DASHBOARD ---
    if (selectedSection === "dashboard") {
      return (
        <section className="flex-1 p-8">
          <div className="bg-lime-50 rounded-3xl shadow-lg shadow-lime-900/10 border border-lime-200 p-8">
            <h2 className="text-lg font-semibold text-emerald-900 mb-4">
              Bienvenida, Admin
            </h2>
            <p className="text-sm text-emerald-900/80">
              Aquí podrás ver un resumen general de tu frutería (gráficos, KPIs,
              avisos de stock bajo, etc.). Por ahora este espacio es solo una
              tarjeta de ejemplo.
            </p>
          </div>
        </section>
      );
    }
    
    // --- SECCIÓN USUARIOS (RESTAURADA COMPLETA) ---
    if (selectedSection === "usuarios") {
      return (
        <section className="flex-1 p-8 space-y-8">
          {/* Tarjeta general */}
          <div className="bg-lime-50 rounded-3xl shadow-lg shadow-lime-900/10 border border-lime-200">
            <div className="px-8 py-4 border-b border-lime-200 bg-lime-50 rounded-t-3xl">
              <h2 className="text-sm font-semibold text-emerald-900">
                Lista de clientes y empleados
              </h2>
            </div>

            <div className="px-8 py-6 space-y-10">
              {/* Tabla de CLIENTES */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-900 mb-3">
                  Clientes
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-lime-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-900 text-lime-50 text-left">
                        <th className="px-4 py-3 font-semibold">Nombres</th>
                        <th className="px-4 py-3 font-semibold">Apellidos</th>
                        <th className="px-4 py-3 font-semibold">Tipo de cliente</th>
                        <th className="px-4 py-3 font-semibold">Teléfono</th>
                        <th className="px-4 py-3 font-semibold">Correo</th>
                        <th className="px-4 py-3 font-semibold">Dirección</th>
                        <th className="px-4 py-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesDemo.map((c) => (
                        <tr key={c._id} className="bg-white border-t">
                          <td className="px-4 py-2">{c.nombres}</td>
                          <td className="px-4 py-2">{c.apellidos}</td>
                          <td className="px-4 py-2">{c.tipoCliente}</td>
                          <td className="px-4 py-2">{c.telefono}</td>
                          <td className="px-4 py-2">{c.correo}</td>
                          <td className="px-4 py-2">{c.direccion}</td>
                          <td className="px-4 py-2">{c.estado}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-emerald-900/70">
                   * Datos de ejemplo (Demo).
                </p>
              </div>

              {/* Tabla de EMPLEADOS */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-900 mb-3">
                  Empleados
                </h3>

                {/* Botón Añadir nuevo registro */}
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => setShowEmpleadoModal(true)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 text-lime-50 hover:bg-emerald-600 shadow-sm"
                  >
                    + Añadir nuevo registro
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-lime-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-900 text-lime-50 text-left">
                        <th className="px-4 py-3 font-semibold">Nombres</th>
                        <th className="px-4 py-3 font-semibold">Apellidos</th>
                        <th className="px-4 py-3 font-semibold">Correo</th>
                        <th className="px-4 py-3 font-semibold">Teléfono</th>
                        <th className="px-4 py-3 font-semibold">Rol</th>
                        <th className="px-4 py-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empleadosDemo.map((e) => (
                        <tr key={e._id} className="bg-white border-t">
                          <td className="px-4 py-2">{e.nombres}</td>
                          <td className="px-4 py-2">{e.apellidos}</td>
                          <td className="px-4 py-2">{e.correo}</td>
                          <td className="px-4 py-2">{e.telefono}</td>
                          <td className="px-4 py-2">{e.rol}</td>
                          <td className="px-4 py-2">{e.estado}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Nuevo Usuario (Diseño completo) */}
          {showEmpleadoModal && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h2 className="text-base font-semibold text-gray-900">
                    Nuevo usuario
                  </h2>
                  <button
                    onClick={() => setShowEmpleadoModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="px-6 py-4 space-y-4 text-sm">
                  <div>
                    <label className="block mb-1 font-medium text-gray-800">
                      Nombre de usuario<span className="text-red-500"> *</span>
                    </label>
                    <input type="text" className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="demo." />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-800">Email</label>
                    <input type="email" className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="correo@ejemplo.com" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-800">Nombres</label>
                    <input type="text" className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-800">Apellidos</label>
                    <input type="text" className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-800">Tipo</label>
                    <select className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                      <option>Vendedor</option>
                      <option>Administrador</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-800">Contraseña<span className="text-red-500"> *</span></label>
                    <input type="password" className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-800">Repite contraseña<span className="text-red-500"> *</span></label>
                    <input type="password" className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t">
                  <button onClick={() => setShowEmpleadoModal(false)} className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100">
                    Cancelar
                  </button>
                  <button className="px-4 py-2 rounded-full text-sm font-semibold bg-red-600 text-white hover:bg-red-500">
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      );
    }

    // --- SECCIÓN PRODUCTOS (CONECTADA Y RESTAURADA COMPLETA) ---
    if (selectedSection === "productos") {
      return (
        <section className="flex-1 p-8">
          <div className="bg-lime-50 rounded-3xl shadow-lg border border-lime-200 overflow-hidden">
            <div className="px-8 py-4 border-b border-lime-200 flex justify-between items-center">
              <h2 className="font-semibold text-emerald-900">Listado de productos</h2>
              <button onClick={abrirModalNuevoProducto} className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-700 text-lime-50 hover:bg-emerald-800">
                Añadir producto
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-emerald-900 text-lime-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nombre</th>
                    <th className="px-4 py-3 font-semibold">Categoría</th>
                    <th className="px-4 py-3 font-semibold">Unidad</th>
                    <th className="px-4 py-3 font-semibold">P. Compra</th>
                    <th className="px-4 py-3 font-semibold">P. Venta</th>
                    <th className="px-4 py-3 font-semibold">Stock Min.</th>
                    <th className="px-4 py-3 font-semibold">Stock Sem.</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => (
                    <tr key={p._id} className="border-b hover:bg-lime-100">
                      <td className="px-4 py-2">{p.nombre}</td>
                      <td className="px-4 py-2">{p.categoriaId}</td>
                      <td className="px-4 py-2">{p.unidadMedida}</td>
                      <td className="px-4 py-2">S/ {p.precioCompra}</td>
                      <td className="px-4 py-2">S/ {p.precioVenta}</td>
                      <td className="px-4 py-2">{p.stockMinimo}</td>
                      <td className="px-4 py-2">{p.stockSemanal}</td>
                      <td className="px-4 py-2">{p.estado}</td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => abrirModalEditarProducto(p)} className="px-3 py-1 text-xs rounded-full bg-yellow-500 text-white hover:bg-yellow-600">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {productos.length === 0 && (
                     <tr><td colSpan="9" className="text-center py-4 text-gray-500">No hay productos registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Modal Productos (Restaurado con todos los campos) */}
          {showProductoModal && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
                <h2 className="text-lg font-bold mb-4 text-emerald-900">{modoEditarProducto ? "Editar" : "Nuevo"} Producto</h2>
                <form onSubmit={handleSubmitProducto} className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold mb-1 text-gray-700">Nombre</label>
                     <input className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" name="nombre" value={productoActual.nombre} onChange={handleChangeProducto} required />
                  </div>
                  
                  <div>
                     <label className="block text-xs font-bold mb-1 text-gray-700">Categoría ID</label>
                     <input className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" name="categoriaId" value={productoActual.categoriaId} onChange={handleChangeProducto} />
                  </div>

                  <div>
                     <label className="block text-xs font-bold mb-1 text-gray-700">Unidad de Medida</label>
                     <input className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" name="unidadMedida" value={productoActual.unidadMedida} onChange={handleChangeProducto} />
                  </div>

                  <div>
                     <label className="block text-xs font-bold mb-1 text-gray-700">Precio Compra</label>
                     <input className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" type="number" step="0.01" name="precioCompra" value={productoActual.precioCompra} onChange={handleChangeProducto} />
                  </div>

                  <div>
                     <label className="block text-xs font-bold mb-1 text-gray-700">Precio Venta</label>
                     <input className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" type="number" step="0.01" name="precioVenta" value={productoActual.precioVenta} onChange={handleChangeProducto} />
                  </div>

                  <div>
                     <label className="block text-xs font-bold mb-1 text-gray-700">Stock Mínimo</label>
                     <input className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" type="number" name="stockMinimo" value={productoActual.stockMinimo} onChange={handleChangeProducto} />
                  </div>

                  <div>
                     <label className="block text-xs font-bold mb-1 text-gray-700">Stock Semanal (Actual)</label>
                     <input className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" type="number" name="stockSemanal" value={productoActual.stockSemanal} onChange={handleChangeProducto} />
                  </div>

                  <div>
                     <label className="block text-xs font-bold mb-1 text-gray-700">Estado</label>
                     <select className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" name="estado" value={productoActual.estado} onChange={handleChangeProducto}>
                       <option value="ACTIVO">ACTIVO</option>
                       <option value="INACTIVO">INACTIVO</option>
                     </select>
                  </div>
                  
                  <div className="col-span-2">
                     <label className="block text-xs font-bold mb-1 text-gray-700">Descripción</label>
                     <textarea className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" name="descripcion" value={productoActual.descripcion} onChange={handleChangeProducto} rows={2} />
                  </div>
                  
                  <div className="col-span-2 flex justify-end gap-2 mt-4 pt-4 border-t">
                    <button type="button" onClick={() => setShowProductoModal(false)} className="px-4 py-2 border rounded-full text-gray-600 hover:bg-gray-100">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-700 text-white rounded-full hover:bg-emerald-800">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      );
    }

    // --- SECCIÓN INVENTARIO (CONECTADA) ---
    if (selectedSection === "inventario") {
      return (
        <section className="flex-1 p-8">
          <div className="bg-lime-50 rounded-3xl shadow-lg border border-lime-200 overflow-hidden">
            <div className="px-8 py-4 border-b border-lime-200 flex justify-between items-center">
              <h2 className="font-semibold text-emerald-900">Inventario de paltas</h2>
              <button onClick={() => setShowRegistroInventarioModal(true)} className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-700 text-lime-50 hover:bg-emerald-800">
                + Agregar registro
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-emerald-900 text-lime-50">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Tamaño</th>
                    <th className="px-4 py-3">Detalle</th>
                    <th className="px-4 py-3">Cant.</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.length === 0 ? (
                    <tr><td colSpan="10" className="p-4 text-center text-gray-500">No hay registros de inventario.</td></tr>
                  ) : (
                    inventario.map((inv) => (
                      <tr key={inv._id} className="border-b hover:bg-lime-100 bg-white">
                        <td className="px-4 py-2">{inv.fecha ? new Date(inv.fecha).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-2">{inv.proveedor}</td>
                        <td className="px-4 py-2">{inv.numeroPuesto}</td>
                        <td className="px-4 py-2">{inv.producto}</td>
                        <td className="px-4 py-2">{inv.tipo}</td>
                        <td className="px-4 py-2">{inv.tamano}</td>
                        <td className="px-4 py-2">{inv.detalle}</td>
                        <td className="px-4 py-2 font-bold">{inv.cantidad}</td>
                        <td className="px-4 py-2">S/ {inv.precio}</td>
                        <td className="px-4 py-2 text-green-700 font-bold">S/ {inv.pago}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MODAL INVENTARIO */}
          {showRegistroInventarioModal && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
                <h2 className="text-lg font-bold mb-4 text-emerald-900">Nuevo registro de inventario</h2>
                <form onSubmit={handleSubmitInventario} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Fecha</label>
                    <input type="date" name="fecha" className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={nuevoInventario.fecha} onChange={handleChangeInventario} required />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold mb-1 text-gray-700">Datos del proveedor</label>
                    <input type="text" name="proveedor" className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ej. proveedor de palta — nombre o razón social" value={nuevoInventario.proveedor} onChange={handleChangeInventario} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Número de puesto</label>
                    <input type="text" name="numeroPuesto" className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={nuevoInventario.numeroPuesto} onChange={handleChangeInventario} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Producto</label>
                    <input type="text" name="producto" className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ej. Palta Hass, Palta Fuerte" value={nuevoInventario.producto} onChange={handleChangeInventario} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Tipo</label>
                    <input type="text" name="tipo" className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ej. Hass, Fuerte, Criolla" value={nuevoInventario.tipo} onChange={handleChangeInventario} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Tamaño</label>
                    <input type="text" name="tamano" className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ej. calibre, tamaño de caja" value={nuevoInventario.tamano} onChange={handleChangeInventario} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold mb-1 text-gray-700">Detalle</label>
                    <input type="text" name="detalle" className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={nuevoInventario.detalle} onChange={handleChangeInventario} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Cantidad</label>
                    <input type="number" name="cantidad" className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={nuevoInventario.cantidad} onChange={handleChangeInventario} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Precio</label>
                    <input type="number" step="0.01" name="precio" className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={nuevoInventario.precio} onChange={handleChangeInventario} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Pago</label>
                    <input type="number" step="0.01" name="pago" className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={nuevoInventario.pago} onChange={handleChangeInventario} required />
                  </div>
                  
                  <div className="col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t">
                    <button type="button" onClick={() => setShowRegistroInventarioModal(false)} className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100">Cancelar</button>
                    <button type="submit" className="px-4 py-2 rounded-full bg-emerald-700 text-white hover:bg-emerald-600">Guardar Registro</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      );
    }

    // --- SECCIÓN PROVEEDORES (RESTAURADA) ---
    if (selectedSection === "proveedores") {
      return (
        <section className="flex-1 p-8">
          <div className="bg-lime-50 rounded-3xl shadow-lg shadow-lime-900/10 border border-lime-200 p-8">
            <h2 className="text-sm font-semibold text-emerald-900 mb-4">
              Proveedores
            </h2>
            <p className="text-sm text-emerald-900/80">
              Aquí podrás registrar y gestionar tus proveedores de palta
              (contacto, número de puesto, condiciones de pago, etc.).
            </p>
          </div>
        </section>
      );
    }

    // --- SECCIÓN PREDICCIÓN ---
    if (selectedSection === "prediccion") {
       return <Prediccion />;
      // return (
      //   <section className="flex-1 p-8">
      //     <div className="bg-lime-50 rounded-3xl shadow-lg shadow-lime-900/10 border border-lime-200 p-8">
      //       <h2 className="text-sm font-semibold text-emerald-900 mb-4">
      //         Predicción de demanda
      //       </h2>
      //       <p className="text-sm text-emerald-900/80">
      //         Aquí podrás visualizar predicciones de ventas y demanda de productos
      //         basadas en datos históricos. Esta sección permitirá anticipar
      //         necesidades de stock y mejorar la toma de decisiones.
      //       </p>

      //       {/* Aquí luego puedes poner gráficos o resultados de tu modelo */}
      //       <div className="mt-6 p-4 bg-white rounded-2xl border border-lime-200 text-sm text-gray-500 text-center">
      //         (Próximamente: gráficos de predicción, análisis y recomendaciones)
      //       </div>
      //     </div>
      //   </section>
      // );
    }

    // --- SECCIÓN VENTAS (RESTAURADA COMPLETA) ---
    if (selectedSection === "ventas") {
      return (
        <section className="flex-1 p-8 space-y-8">
          {/* BLOQUE NUEVA VENTA (solo si modoNuevaVenta === true) */}
          {modoNuevaVenta && (
            <div className="bg-lime-50 rounded-3xl shadow-lg shadow-lime-900/10 border border-lime-200 p-6 grid lg:grid-cols-[2fr,1fr] gap-6">
              {/* Izquierda: búsqueda y lista de productos de la venta */}
              <div>
                {/* Fila de búsqueda */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center border border-emerald-200 rounded-lg overflow-hidden flex-1 bg-white">
                    <span className="px-3 text-emerald-700 text-lg">🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar producto (ej. palta)..."
                      className="flex-1 px-2 py-2 text-sm outline-none"
                    />
                  </div>

                  <input
                    type="number"
                    min="1"
                    className="w-24 border border-emerald-200 rounded-lg px-2 py-2 text-sm"
                    placeholder="Cant."
                  />

                  <input
                    type="number"
                    step="0.01"
                    className="w-28 border border-emerald-200 rounded-lg px-2 py-2 text-sm"
                    placeholder="Precio"
                  />

                  <button className="px-3 py-2 rounded-lg bg-emerald-700 text-lime-50 text-sm font-semibold hover:bg-emerald-600">
                    +
                  </button>
                </div>

                {/* Lista de ítems (por ahora vacía) */}
                <div className="bg-white border border-lime-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2 border-b border-lime-200 text-xs font-semibold text-emerald-900 grid grid-cols-[2fr,1fr,1fr,1fr]">
                    <span>Producto</span>
                    <span className="text-center">Cantidad</span>
                    <span className="text-right">Precio</span>
                    <span className="text-right">Importe</span>
                  </div>

                  <div className="px-4 py-8 text-sm text-center text-gray-500">
                    No hay productos agregados a la venta.
                  </div>
                </div>
              </div>

              {/* Derecha: resumen de la venta */}
              <div className="bg-white border border-lime-200 rounded-2xl p-4 flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-900 mb-2">
                    Comprobante
                  </p>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 rounded-full bg-emerald-700 text-lime-50 text-xs font-semibold">
                      Boleta
                    </button>
                    <button className="flex-1 px-3 py-2 rounded-full border border-emerald-300 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">
                      Factura
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-emerald-900 mb-1">
                    Cliente
                  </p>
                  <input
                    type="text"
                    placeholder="Buscar / registrar cliente"
                    className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-emerald-900 mb-1">
                    Fecha
                  </p>
                  <input
                    type="date"
                    className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div className="mt-2 border-t border-lime-200 pt-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-emerald-900">
                    Total
                  </span>
                  <span className="text-xl font-bold text-emerald-900">
                    S/ 0.00
                  </span>
                </div>

                <button className="mt-2 w-full bg-emerald-700 hover:bg-emerald-600 text-lime-50 text-sm font-semibold py-2.5 rounded-full shadow-md shadow-emerald-700/60 transition">
                  Registrar venta
                </button>
              </div>
            </div>
          )}

          {/* HISTORIAL DE VENTAS */}
          <div className="bg-lime-50 rounded-3xl shadow-lg shadow-lime-900/10 border border-lime-200 overflow-hidden">
            <div className="px-8 py-4 border-b border-lime-200 bg-lime-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-emerald-900">
                Historial de ventas
              </h2>
              <div className="flex items-center gap-2 text-xs text-emerald-900">
                <span>Buscar:</span>
                <input
                  type="text"
                  className="border border-emerald-200 rounded-lg px-2 py-1 text-xs"
                  placeholder="Cliente, doc, fecha..."
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-emerald-900 text-lime-50 text-left">
                    <th className="px-6 py-3 font-semibold">Venta</th>
                    <th className="px-6 py-3 font-semibold">Cliente</th>
                    <th className="px-6 py-3 font-semibold">Total</th>
                    <th className="px-6 py-3 font-semibold">Fecha</th>
                    <th className="px-6 py-3 font-semibold">Docs</th>
                    <th className="px-6 py-3 font-semibold">Usuario</th>
                    <th className="px-6 py-3 font-semibold text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white border-b border-lime-100">
                    <td className="px-6 py-3 text-gray-500">—</td>
                    <td className="px-6 py-3 text-gray-500">—</td>
                    <td className="px-6 py-3 text-gray-500">S/ 0.00</td>
                    <td className="px-6 py-3 text-gray-500">—</td>
                    <td className="px-6 py-3 text-gray-500">—</td>
                    <td className="px-6 py-3 text-gray-500">—</td>
                    <td className="px-6 py-3 text-right text-gray-500">
                      <button className="px-2 py-1 rounded-full border border-emerald-200 text-xs hover:bg-emerald-50">
                        ⋮
                      </button>
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td
                      colSpan={7}
                      className="px-6 py-6 text-center text-gray-500"
                    >
                      Todavía no se han registrado ventas.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      );
    }

    return null;
  };
  
  // ==========================================
  // 6. RENDER PRINCIPAL (LAYOUT)
  // ==========================================
  return (
    <div className="min-h-screen flex bg-lime-100 font-sans">
      {/* SIDEBAR */}
      <aside className="w-72 bg-emerald-950 text-lime-50 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-emerald-800 flex items-center gap-3">
           <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center font-bold">A</div>
           <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {["dashboard", "usuarios", "productos", "inventario", "proveedores", "ventas", "prediccion"].map((sec) => (
            <button key={sec} className={menuBtnClasses(sec)} onClick={() => {
                setSelectedSection(sec);
                // Si cambiamos de sección, reseteamos el modo nueva venta
                setModoNuevaVenta(false);
            }}>
              {sec.charAt(0).toUpperCase() + sec.slice(1)}
            </button>
          ))}
        </nav>
        
        <div className="p-6 border-t border-emerald-800">
          <button onClick={handleLogout} className="w-full bg-red-600/90 hover:bg-red-600 py-2 rounded-xl text-white font-semibold shadow-lg transition">
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col bg-lime-50 h-screen overflow-y-auto">
        <header className="flex justify-between p-5 bg-white border-b sticky top-0 z-10 shadow-sm items-center">
          <h1 className="text-2xl font-bold text-emerald-900">{getHeaderTitle()}</h1>
          
          <div className="flex items-center gap-3">
            {/* Botón Nueva venta / Cancelar solo cuando estás en Ventas */}
            {selectedSection === "ventas" &&
              (modoNuevaVenta ? (
                <button
                  onClick={() => setModoNuevaVenta(false)}
                  className="px-5 py-2 rounded-full border border-emerald-700 text-emerald-800 text-sm font-semibold hover:bg-emerald-700 hover:text-lime-50 shadow-sm transition"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  onClick={() => setModoNuevaVenta(true)}
                  className="px-5 py-2 rounded-full bg-emerald-700 hover:bg-emerald-600 text-lime-50 text-sm font-semibold shadow-md shadow-emerald-700/60 transition"
                >
                  + Nueva venta
                </button>
              ))}

            <button
              onClick={handleBack}
              className="text-emerald-700 font-bold hover:underline"
            >
              ← Volver
            </button>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;