// src/components/CajaRegistradora.js

import React, { useState, useEffect } from "react";

const API_URL_PRODUCTOS = "http://localhost:5000/api/productos";
const API_URL_VENTAS = "http://localhost:5000/api/ventas";

const CajaRegistradora = () => {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [cliente, setCliente] = useState({ nombre: "", email: "", telefono: "", documento: "" });
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [comprobante, setComprobante] = useState("Boleta");
  const [mostrarModalEnvio, setMostrarModalEnvio] = useState(false);
  const [ventaActual, setVentaActual] = useState(null);
  const [tipoEnvio, setTipoEnvio] = useState("email");
  const [destinoEnvio, setDestinoEnvio] = useState("");

  // Cargar productos
  useEffect(() => {
    fetchProductos();
  }, []);

  useEffect(() => {
    const filtered = productos.filter(p =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setProductosFiltrados(filtered);
  }, [searchTerm, productos]);

  const fetchProductos = async () => {
    try {
      const res = await fetch(API_URL_PRODUCTOS);
      const data = await res.json();
      setProductos(data);
      setProductosFiltrados(data);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  // Agregar producto al carrito
  const agregarAlCarrito = (producto, cantidad = 1) => {
    setCarrito(prev => {
      const existente = prev.find(item => item.productoId === producto._id);
      if (existente) {
        return prev.map(item =>
          item.productoId === producto._id
            ? { ...item, cantidad: item.cantidad + cantidad, subtotal: (item.cantidad + cantidad) * item.precioUnitario }
            : item
        );
      }
      return [...prev, {
        productoId: producto._id,
        nombre: producto.nombre,
        cantidad: cantidad,
        precioUnitario: producto.precioVenta,
        medida: producto.unidadMedida || "1kg",
        subtotal: cantidad * producto.precioVenta
      }];
    });
    setSearchTerm("");
  };

  // Actualizar cantidad
  const actualizarCantidad = (index, nuevaCantidad) => {
    if (nuevaCantidad < 1) {
      eliminarDelCarrito(index);
      return;
    }
    setCarrito(prev => prev.map((item, i) =>
      i === index
        ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precioUnitario }
        : item
    ));
  };

  // Eliminar del carrito
  const eliminarDelCarrito = (index) => {
    setCarrito(prev => prev.filter((_, i) => i !== index));
  };

  // Calcular total
  const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  // Registrar venta
  const registrarVenta = async () => {
    if (carrito.length === 0) {
      alert("Agrega productos al carrito");
      return;
    }
    if (!cliente.nombre) {
      alert("Ingresa el nombre del cliente");
      return;
    }

    const venta = {
      cliente: cliente.nombre,
      clienteEmail: cliente.email,
      clienteTelefono: cliente.telefono,
      clienteDocumento: cliente.documento,
      productos: carrito,
      subtotal: total,
      total: total,
      metodoPago: metodoPago,
      comprobante: comprobante
    };

    try {
      const res = await fetch(API_URL_VENTAS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(venta)
      });
      const data = await res.json();
      setVentaActual(data);
      setMostrarModalEnvio(true);
    } catch (error) {
      console.error("Error al registrar venta:", error);
      alert("Error al registrar la venta");
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
      const data = await res.json();
      alert(data.message);
      
      // Abrir comprobante en nueva ventana
      const ventana = window.open();
      ventana.document.write(data.comprobanteHTML);
      
      // Resetear todo
      setCarrito([]);
      setCliente({ nombre: "", email: "", telefono: "", documento: "" });
      setMostrarModalEnvio(false);
      setVentaActual(null);
      setDestinoEnvio("");
    } catch (error) {
      console.error("Error al enviar comprobante:", error);
      alert("Error al enviar el comprobante");
    }
  };

  // Saltar envío (solo imprimir)
  const saltarEnvio = () => {
    // Abrir comprobante para imprimir
    const ventana = window.open();
    ventana.document.write(`
      <html>
      <head><title>Comprobante de Venta</title></head>
      <body onload="window.print()">
        <pre>${JSON.stringify(ventaActual, null, 2)}</pre>
      </body>
      </html>
    `);
    
    setCarrito([]);
    setCliente({ nombre: "", email: "", telefono: "", documento: "" });
    setMostrarModalEnvio(false);
    setVentaActual(null);
    alert("Venta registrada exitosamente");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-emerald-900">Caja Registradora</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo: Buscador y productos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-3">Productos disponibles</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {productosFiltrados.map(producto => (
                <button
                  key={producto._id}
                  onClick={() => agregarAlCarrito(producto, 1)}
                  className="p-3 bg-gray-50 rounded-xl text-left hover:bg-emerald-50 transition border border-transparent hover:border-emerald-200"
                >
                  <p className="font-semibold text-gray-800">{producto.nombre}</p>
                  <p className="text-sm text-emerald-600 font-bold">S/ {producto.precioVenta}</p>
                  <p className="text-xs text-gray-400">Stock: {producto.stockSemanal}</p>
                </button>
              ))}
              {productosFiltrados.length === 0 && (
                <p className="text-gray-400 col-span-full text-center py-4">No hay productos</p>
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
              <input
                type="text"
                placeholder="Nombre completo *"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                value={cliente.nombre}
                onChange={(e) => setCliente({...cliente, nombre: e.target.value})}
              />
              <input
                type="email"
                placeholder="Correo electrónico (para boleta)"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                value={cliente.email}
                onChange={(e) => setCliente({...cliente, email: e.target.value})}
              />
              <input
                type="tel"
                placeholder="Teléfono / WhatsApp"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                value={cliente.telefono}
                onChange={(e) => setCliente({...cliente, telefono: e.target.value})}
              />
              <input
                type="text"
                placeholder="Documento (DNI/RUC) - opcional"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                value={cliente.documento}
                onChange={(e) => setCliente({...cliente, documento: e.target.value})}
              />
            </div>
          </div>

          {/* Carrito */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-3">Carrito de venta</h2>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {carrito.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No hay productos agregados</p>
              ) : (
                carrito.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.nombre}</p>
                      <p className="text-xs text-gray-400">S/ {item.precioUnitario} / {item.medida}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => actualizarCantidad(index, item.cantidad - 1)}
                        className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold">{item.cantidad}</span>
                      <button
                        onClick={() => actualizarCantidad(index, item.cantidad + 1)}
                        className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 font-bold"
                      >
                        +
                      </button>
                      <button
                        onClick={() => eliminarDelCarrito(index)}
                        className="text-red-500 ml-2"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-xl text-emerald-700">S/ {total.toFixed(2)}</span>
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
              Registrar Venta - S/ {total.toFixed(2)}
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
                onClick={() => setTipoEnvio("email")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold ${tipoEnvio === "email" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                📧 Email
              </button>
              <button
                onClick={() => setTipoEnvio("whatsapp")}
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