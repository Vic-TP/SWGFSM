// src/components/Homepage.js - VERSIÓN COMPLETA CON CONEXIÓN A MONGODB

import React, { useState, useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import CartSidebar from "./CartSidebar";
import ProductDetail from "./ProductDetail";
import PaymentGateway from "./PaymentGateway";

// IMPORTANDO TUS IMÁGENES
import paltaHass from "../assets/palta-hass.png";
import paltaFuerte from "../assets/palta-fuerte.png";
import paltaNaval from "../assets/palta-naval.png";
import paltaSelva from "../assets/palta-selva.png";
import paltasVariadas from "../assets/paltas.png";
import logoPaltas from "../assets/logopaltasinterior.png";

// API URL
const API_URL_VENTAS = "http://localhost:5000/api/ventas";

// Configuración de productos de temporada
const PRODUCTOS_TEMPORADA = [
  { 
    id: 1, 
    nombre: "Palta Hass", 
    precio: 4.20, 
    unidad: "unidad", 
    imagen: paltaHass, 
    destacado: true, 
    rating: 5, 
    reviews: 128,
    description: "Palta Hass de alta calidad, pulpa cremosa y sabor inigualable. Perfecta para guacamole y ensaladas."
  },
  { 
    id: 2, 
    nombre: "Palta Fuerte", 
    precio: 3.80, 
    unidad: "unidad", 
    imagen: paltaFuerte, 
    destacado: false, 
    rating: 4, 
    reviews: 95,
    description: "Palta Fuerte, textura suave y sabor delicado. Ideal para jugos y ensaladas."
  },
  { 
    id: 3, 
    nombre: "Palta Naval", 
    precio: 5.00, 
    unidad: "unidad", 
    imagen: paltaNaval, 
    destacado: false, 
    rating: 5, 
    reviews: 67,
    description: "Palta Naval, cremosa y ligera, baja en grasas. Ideal para consumo diario."
  },
];

const PRODUCTOS_CATALOGO = [
  { id: 4, nombre: "Palta Selva", precio: 4.50, unidad: "unidad", categoria: "selva", imagen: paltaSelva, stock: 60, description: "Palta de la selva peruana, orgánica y baja en grasas." },
  { id: 5, nombre: "Pack Variado (6 unid)", precio: 22.00, unidad: "pack", categoria: "packs", imagen: paltasVariadas, descuento: true, precioOriginal: 26.00, description: "6 unidades de paltas variadas: Hass, Fuerte y Naval." },
  { id: 6, nombre: "Palta Hass Premium", precio: 6.00, unidad: "unidad", categoria: "premium", imagen: paltaHass, description: "Palta Hass de primera calidad, seleccionada a mano." },
  { id: 7, nombre: "Pack Hass (3 unid)", precio: 11.50, unidad: "pack", categoria: "packs", imagen: paltaHass, description: "3 unidades de Palta Hass premium." },
  { id: 8, nombre: "Palta Fuerte Gigante", precio: 7.50, unidad: "unidad", categoria: "gigante", imagen: paltaFuerte, description: "Palta Fuerte de tamaño gigante, ideal para compartir." },
];

const HomePage = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [client, setClient] = useState(null);
  const [filterCategoria, setFilterCategoria] = useState("todos");
  const [showPayment, setShowPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("efectivo");

  useEffect(() => {
    try {
      const logged = localStorage.getItem("cliente_logueado") === "true";
      if (logged) {
        const stored = localStorage.getItem("cliente_actual");
        if (stored) setClient(JSON.parse(stored));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleAddToCart = (product, quantity = 1, measure = "1kg") => {
    setCartItems((prev) => {
      const existing = prev.find(i => i.id === product.id && i.measure === measure);
      if (existing) {
        return prev.map(i => i.id === product.id && i.measure === measure 
          ? { ...i, quantity: i.quantity + quantity } 
          : i
        );
      }
      return [...prev, { 
        id: product.id, 
        name: product.nombre, 
        price: product.precio, 
        image: product.imagen, 
        measure: measure, 
        quantity 
      }];
    });
    setIsCartOpen(true);
  };

  const handleCheckout = () => {
    const logged = localStorage.getItem("cliente_logueado") === "true";
    if (!logged) {
      alert("Para pagar debes iniciar sesión o crear una cuenta.");
      window.location.href = "/login";
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    
    // Obtener datos del cliente desde localStorage
    const storedClient = localStorage.getItem("cliente_actual");
    let cliente = "Invitado";
    let clienteEmail = "";
    let clienteTelefono = "";
    
    if (storedClient) {
      try {
        const clientData = JSON.parse(storedClient);
        cliente = clientData.nombre || "Invitado";
        clienteEmail = clientData.email || "";
        clienteTelefono = clientData.telefono || "";
      } catch {}
    }

    // Preparar los productos para el backend
    const productos = cartItems.map(item => ({
      nombre: item.name,
      cantidad: item.quantity,
      precioUnitario: item.price,
      medida: item.measure || "1kg",
      subtotal: item.price * item.quantity
    }));

    // Crear objeto de venta
    const ventaData = {
  cliente: cliente,
  clienteEmail: clienteEmail,
  clienteTelefono: clienteTelefono,
  productos: productos,  // ← IMPORTANTE: "productos" no "producto"
  subtotal: total,
  total: total,
  metodoPago: selectedPaymentMethod,
  comprobante: "Boleta",
  estado: "Pendiente"
};

    try {
      console.log("Enviando venta al backend:", ventaData);
      
      // Enviar venta al backend
      const response = await fetch(API_URL_VENTAS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ventaData)
      });

      if (response.ok) {
        const ventaGuardada = await response.json();
        console.log("Venta guardada en MongoDB:", ventaGuardada);
        
        // También guardar en localStorage para el área de cliente
        const order = {
          id: ventaGuardada._id,
          numeroVenta: ventaGuardada.numeroVenta,
          date: new Date().toISOString(),
          total,
          items: cartItems.map(({ name, measure, quantity, price }) => ({ 
            name, 
            measure, 
            quantity, 
            price 
          })),
          estado: "Pendiente"
        };

        let byClient = {};
        try {
          const raw = localStorage.getItem("cliente_pedidos");
          if (raw) byClient = JSON.parse(raw);
        } catch {}
        
        const emailKey = clienteEmail || "invitado";
        if (!byClient[emailKey]) byClient[emailKey] = [];
        byClient[emailKey].push(order);
        localStorage.setItem("cliente_pedidos", JSON.stringify(byClient));

        setCartItems([]);
        setIsCartOpen(false);
        alert("¡Pedido realizado con éxito! Se ha guardado en el sistema.");
      } else {
        const error = await response.json();
        console.error("Error al guardar venta:", error);
        alert("Error al procesar el pedido. Intenta nuevamente.");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("Error de conexión con el servidor. Verifica que el backend esté corriendo.");
    }
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const productosFiltrados = PRODUCTOS_CATALOGO.filter(p => {
    const matchCategoria = filterCategoria === "todos" || p.categoria === filterCategoria;
    const matchSearch = searchTerm === "" || p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategoria && matchSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      
      <Header 
        onCartClick={() => setIsCartOpen(true)} 
        cartCount={cartCount} 
        client={client}
        onLoginClick={() => window.location.href = "/login"}
        logo={logoPaltas}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-amber-50"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20 z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="lg:w-1/2 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-emerald-100 rounded-full px-4 py-1.5 mb-6">
                <span className="text-emerald-700 text-sm font-semibold">Producto Peruano</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
                Las mejores
                <span className="text-emerald-600 block">paltas peruanas</span>
              </h1>
              <p className="text-gray-500 text-lg mb-8 max-w-lg mx-auto lg:mx-0">
                Directo del campo a tu mesa. Frescura, calidad y sabor que solo nuestra tierra puede ofrecer.
              </p>
              <div className="flex gap-4 justify-center lg:justify-start">
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  Comprar ahora
                </button>
                <button className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-semibold px-8 py-3 rounded-full transition-all duration-300">
                  Ver ofertas
                </button>
              </div>
              
              <div className="flex gap-8 justify-center lg:justify-start mt-12">
                <div>
                  <div className="text-2xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-400">Clientes felices</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">50+</div>
                  <div className="text-sm text-gray-400">Productos frescos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">24h</div>
                  <div className="text-sm text-gray-400">Entrega rápida</div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-2xl"></div>
                <img src={paltasVariadas} alt="Paltas frescas" className="relative w-80 lg:w-96 drop-shadow-2xl animate-float" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Productos de Temporada */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-emerald-600 text-sm font-semibold uppercase tracking-wider">Temporada</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-3">Productos de Temporada</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Los mejores productos de la cosecha actual</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PRODUCTOS_TEMPORADA.map(product => (
              <div key={product.id} className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300">
                <div className="relative h-64 bg-gradient-to-br from-emerald-50 to-amber-50 flex items-center justify-center p-6">
                  {product.destacado && (
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10 shadow-md">
                      Destacado
                    </div>
                  )}
                  <img src={product.imagen} alt={product.nombre} className="h-48 object-contain group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl text-gray-900">{product.nombre}</h3>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">★</span>
                      <span className="text-sm text-gray-500">{product.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <span className="text-2xl font-bold text-emerald-600">S/ {product.precio.toFixed(2)}</span>
                      <span className="text-gray-400 text-sm ml-1">/{product.unidad}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedProduct(product)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 transform hover:scale-105"
                    >
                      Ver producto
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promoción Especial */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-emerald-800"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-1 text-white text-sm font-semibold mb-3">
              Oferta Especial
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">Día de la Palta Madura</h2>
            <p className="text-emerald-200 text-lg">Aprovecha estos precios increíbles</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 text-center shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">🥑</span>
              </div>
              <h3 className="font-bold text-xl text-gray-900">Pack Familiar</h3>
              <p className="text-gray-400 text-sm">6 unidades premium</p>
              <div className="mt-3">
                <span className="text-3xl font-bold text-emerald-600">S/ 18.00</span>
                <span className="text-sm text-gray-400 line-through ml-2">S/ 24.00</span>
              </div>
              <button 
                onClick={() => setSelectedProduct({ 
                  id: 5, 
                  nombre: "Pack Familiar (6 unid)", 
                  precio: 18.00, 
                  unidad: "pack", 
                  imagen: paltasVariadas,
                  description: "6 unidades de paltas premium seleccionadas."
                })}
                className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-full transition-all duration-300"
              >
                Ver producto
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 text-center shadow-xl transform scale-105 border-2 border-emerald-400 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Más vendido
              </div>
              <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">🥑</span>
              </div>
              <h3 className="font-bold text-xl text-gray-900">Pack Mediano</h3>
              <p className="text-gray-400 text-sm">3 unidades</p>
              <div className="mt-3">
                <span className="text-3xl font-bold text-emerald-600">S/ 10.50</span>
              </div>
              <button 
                onClick={() => setSelectedProduct({ 
                  id: 7, 
                  nombre: "Pack Mediano (3 unid)", 
                  precio: 10.50, 
                  unidad: "pack", 
                  imagen: paltasVariadas,
                  description: "3 unidades de paltas Hass premium."
                })}
                className="mt-5 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-full transition-all duration-300"
              >
                Ver producto
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 text-center shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <img src={paltaNaval} alt="Palta Gigante" className="w-16 h-16 object-contain" />
              </div>
              <h3 className="font-bold text-xl text-gray-900">Palta Gigante</h3>
              <p className="text-gray-400 text-sm">1 unidad premium</p>
              <div className="mt-3">
                <span className="text-3xl font-bold text-emerald-600">S/ 8.50</span>
              </div>
              <button 
                onClick={() => setSelectedProduct({ 
                  id: 8, 
                  nombre: "Palta Gigante", 
                  precio: 8.50, 
                  unidad: "unidad", 
                  imagen: paltaNaval,
                  description: "Palta de tamaño gigante, ideal para compartir."
                })}
                className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-full transition-all duration-300"
              >
                Ver producto
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo General */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-emerald-600 text-sm font-semibold uppercase tracking-wider">Nuestra colección</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-3">Todos los productos</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Selecciona la mejor palta para ti</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {[
              { id: "todos", label: "Todos" },
              { id: "hass", label: "Hass" },
              { id: "fuerte", label: "Fuerte" },
              { id: "selva", label: "Selva" },
              { id: "premium", label: "Premium" },
              { id: "packs", label: "Packs" },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setFilterCategoria(filter.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  filterCategoria === filter.id
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {productosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🥑</div>
              <p className="text-gray-400">No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {productosFiltrados.map(product => (
                <div key={product.id} className="group bg-gray-50 rounded-xl p-4 text-center hover:bg-white hover:shadow-lg transition-all duration-300">
                  <div className="h-32 flex items-center justify-center mb-3">
                    <img src={product.imagen} alt={product.nombre} className="h-28 object-contain group-hover:scale-105 transition duration-300" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{product.nombre}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{product.description}</p>
                  <div className="mt-2">
                    <span className="text-xl font-bold text-emerald-600">S/ {product.precio.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedProduct(product)}
                    className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-full text-sm transition-all duration-300"
                  >
                    Ver producto
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: "📦", title: "Envío a domicilio", desc: "Entregas rápidas" },
              { icon: "🥑", title: "Producto fresco", desc: "Directo del campo" },
              { icon: "💰", title: "Mejor precio", desc: "Sin IGV" },
              { icon: "✅", title: "Calidad garantizada", desc: "Selección premium" },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">{item.title}</h3>
                <p className="text-gray-400 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {selectedProduct && (
        <ProductDetail 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onAddToCart={handleAddToCart} 
        />
      )}

      <CartSidebar
        isOpen={isCartOpen}
        items={cartItems}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
        total={cartTotal}
      />

      {showPayment && (
        <PaymentGateway 
          total={cartTotal} 
          onSuccess={handlePaymentSuccess} 
          onCancel={() => setShowPayment(false)}
          onMethodSelect={setSelectedPaymentMethod}
        />
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default HomePage;