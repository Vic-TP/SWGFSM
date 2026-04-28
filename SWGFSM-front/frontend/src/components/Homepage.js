// src/components/Homepage.js — catálogo desde API producto (inventario) + ventas online

import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import Footer from "./Footer";
import CartSidebar from "./CartSidebar";
import ProductDetail from "./ProductDetail";
import PaymentGateway from "./PaymentGateway";
import { categoriaCatalogo, imagenCatalogo } from "../utils/tiendaProducto";

import paltaHass from "../assets/palta-hass.png";
import paltaFuerte from "../assets/palta-fuerte.png";
import paltaNaval from "../assets/palta-naval.png";
import paltaSelva from "../assets/palta-selva.png";
import paltasVariadas from "../assets/paltas.png";
import logoPaltas from "../assets/logopaltasinterior.png";

const API_URL_PRODUCTOS = "http://localhost:5000/api/producto";
const API_URL_VENTAS = "http://localhost:5000/api/ventas";

const IMG_DEFAULTS = {
  hass: paltaHass,
  fuerte: paltaFuerte,
  naval: paltaNaval,
  selva: paltaSelva,
  variadas: paltasVariadas,
};

const idProducto = (v) => {
  if (v == null) return "";
  if (typeof v === "object" && typeof v.toString === "function") return String(v.toString());
  return String(v);
};

const precioNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalizarProductos = (lista) =>
  lista
    .filter((p) => String(p.estado || "ACTIVO").toUpperCase() !== "INACTIVO")
    .map((p) => ({
      ...p,
      imagen: imagenCatalogo(p, IMG_DEFAULTS),
      precio: precioNum(p.precioVenta),
      description: (p.detalle || p.descripcion || "").trim(),
      categoria: categoriaCatalogo(p),
      rating: 5,
    }));

const HomePage = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [client, setClient] = useState(null);
  const [filterCategoria, setFilterCategoria] = useState("todos");
  const [showPayment, setShowPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("efectivo");
  const [productosActivos, setProductosActivos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);

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

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingProductos(true);
      try {
        const res = await fetch(API_URL_PRODUCTOS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const raw = Array.isArray(data) ? data : [];
        if (!cancel) setProductosActivos(normalizarProductos(raw));
      } catch (e) {
        console.error("Error al cargar productos:", e);
        if (!cancel) setProductosActivos([]);
      } finally {
        if (!cancel) setLoadingProductos(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const productosTemporada = useMemo(
    () => productosActivos.filter((p) => precioNum(p.precioVenta) > 0).slice(0, 3),
    [productosActivos]
  );

  const handleAddToCart = (product, quantity = 1, measure = "1kg", meta = {}) => {
    const productoId = idProducto(product._id);
    const precioUnitario = precioNum(product.precioVenta ?? product.precio);
    const precioLinea = precioNum(
      meta.precioLinea ?? (measure === "1/2kg" ? precioUnitario / 2 : precioUnitario)
    );
    const cantidadKg = Math.max(1, Math.floor(Number(meta.cantidadKg)) || 1);

    setCartItems((prev) => {
      const ix = prev.findIndex(
        (i) => idProducto(i.productoId) === productoId && i.measure === measure
      );
      if (ix >= 0) {
        return prev.map((i, idx) => {
          if (idx !== ix) return i;
          const q = i.quantity + quantity;
          return { ...i, quantity: q, cantidadKg: q };
        });
      }
      return [
        ...prev,
        {
          productoId,
          id: productoId,
          name: product.nombre,
          price: precioLinea,
          image: product.imagen,
          measure,
          quantity,
          precioUnitario,
          cantidadKg,
        },
      ];
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

    const productos = cartItems.map((item) => {
      const cantidad = Math.max(1, Math.floor(Number(item.cantidadKg ?? item.quantity)) || 1);
      const pu = precioNum(item.precioUnitario);
      const subtotalLinea = precioNum(item.price) * precioNum(item.quantity);
      return {
        productoId: idProducto(item.productoId),
        nombre: item.name,
        cantidad,
        precioUnitario: pu,
        medida: item.measure || "1kg",
        subtotal: subtotalLinea,
      };
    });

    const total = productos.reduce((s, x) => s + x.subtotal, 0);

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
      } catch {
        /* ignore */
      }
    }

    const ventaData = {
      cliente,
      clienteEmail,
      clienteTelefono,
      productos,
      subtotal: total,
      total,
      metodoPago: selectedPaymentMethod,
      comprobante: "Boleta",
      estado: "Pendiente",
      origen: "ONLINE",
    };

    try {
      const response = await fetch(API_URL_VENTAS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ventaData),
      });

      if (response.ok) {
        const ventaGuardada = await response.json();

        const order = {
          id: ventaGuardada._id,
          numeroVenta: ventaGuardada.numeroVenta,
          date: new Date().toISOString(),
          total,
          items: cartItems.map(({ name, measure, quantity, price, productoId }) => ({
            name,
            measure,
            quantity,
            price,
            productoId,
          })),
          estado: "Pendiente",
        };

        let byClient = {};
        try {
          const raw = localStorage.getItem("cliente_pedidos");
          if (raw) byClient = JSON.parse(raw);
        } catch {
          /* ignore */
        }

        const emailKey = clienteEmail || "invitado";
        if (!byClient[emailKey]) byClient[emailKey] = [];
        byClient[emailKey].push(order);
        localStorage.setItem("cliente_pedidos", JSON.stringify(byClient));

        setCartItems([]);
        setIsCartOpen(false);
        alert("¡Pedido realizado con éxito! Se ha guardado en el sistema.");
        try {
          window.dispatchEvent(new Event("swgfsm-stock-actualizado"));
        } catch {
          /* ignore */
        }
      } else {
        const error = await response.json().catch(() => ({}));
        console.error("Error al guardar venta:", error);
        alert(error?.message || "Error al procesar el pedido. Intenta nuevamente.");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("Error de conexión con el servidor. Verifica que el backend esté corriendo.");
    }
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const productosFiltrados = productosActivos.filter((p) => {
    const matchCategoria = filterCategoria === "todos" || p.categoria === filterCategoria;
    const matchSearch =
      searchTerm === "" || p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategoria && matchSearch;
  });

  const promoCards = useMemo(() => {
    const list = productosActivos.filter((p) => precioNum(p.precioVenta) > 0);
    return [
      { slot: 0, highlight: false },
      { slot: 1, highlight: true },
      { slot: 2, highlight: false },
    ].map((x) => ({
      ...x,
      product: list[x.slot] || null,
    }));
  }, [productosActivos]);

  return (
    <div className="min-h-screen bg-white">
      <Header
        onCartClick={() => setIsCartOpen(true)}
        cartCount={cartCount}
        client={client}
        onLoginClick={() => (window.location.href = "/login")}
        logo={logoPaltas}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

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
                Directo del campo a tu mesa. Frescura, calidad y sabor que solo nuestra tierra puede
                ofrecer.
              </p>
              <div className="flex gap-4 justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("catalogo-productos");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Comprar ahora
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("temporada");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-semibold px-8 py-3 rounded-full transition-all duration-300"
                >
                  Ver ofertas
                </button>
              </div>

              <div className="flex gap-8 justify-center lg:justify-start mt-12">
                <div>
                  <div className="text-2xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-400">Clientes felices</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {loadingProductos ? "…" : productosActivos.length}
                  </div>
                  <div className="text-sm text-gray-400">Productos en catálogo</div>
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
                <img
                  src={paltasVariadas}
                  alt="Paltas frescas"
                  className="relative w-80 lg:w-96 drop-shadow-2xl animate-float"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="temporada" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-emerald-600 text-sm font-semibold uppercase tracking-wider">
              Temporada
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-3">
              Productos de Temporada
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Los mejores productos de la cosecha actual (según inventario)
            </p>
          </div>

          {loadingProductos ? (
            <div className="text-center py-16 text-gray-400">Cargando productos…</div>
          ) : productosTemporada.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No hay productos activos con precio en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {productosTemporada.map((product, idx) => (
                <div
                  key={idProducto(product._id)}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300"
                >
                  <div className="relative h-64 bg-gradient-to-br from-emerald-50 to-amber-50 flex items-center justify-center p-6">
                    {idx === 0 && (
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10 shadow-md">
                        Destacado
                      </div>
                    )}
                    <img
                      src={product.imagen}
                      alt={product.nombre}
                      className="h-48 object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-xl text-gray-900">{product.nombre}</h3>
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400">★</span>
                        <span className="text-sm text-gray-500">{product.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {product.description || "Palta fresca de nuestra selección."}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <span className="text-2xl font-bold text-emerald-600">
                          S/ {product.precio.toFixed(2)}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">/kg</span>
                      </div>
                      <button
                        type="button"
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
          )}
        </div>
      </section>

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
            <p className="text-emerald-200 text-lg">Productos reales del inventario</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {promoCards.map(({ slot, highlight, product }) => (
              <div
                key={slot}
                className={`bg-white rounded-2xl p-6 text-center shadow-xl transition-all duration-300 ${
                  highlight ? "transform scale-105 border-2 border-emerald-400 relative" : "transform hover:scale-105"
                }`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Más vendido
                  </div>
                )}
                {product ? (
                  <>
                    <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                      <img
                        src={product.imagen}
                        alt={product.nombre}
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                    <h3 className="font-bold text-xl text-gray-900">{product.nombre}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mt-1">
                      {product.description || "Selección del catálogo."}
                    </p>
                    <div className="mt-3">
                      <span className="text-3xl font-bold text-emerald-600">
                        S/ {product.precio.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-400"> /kg</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className={`mt-5 w-full font-semibold py-2.5 rounded-full transition-all duration-300 ${
                        highlight
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      Ver producto
                    </button>
                  </>
                ) : (
                  <div className="py-8 text-gray-400 text-sm">Próximamente más variedades</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="catalogo-productos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-emerald-600 text-sm font-semibold uppercase tracking-wider">
              Nuestra colección
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-3">
              Todos los productos
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Selecciona la mejor palta para ti</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {[
              { id: "todos", label: "Todos" },
              { id: "hass", label: "Hass" },
              { id: "fuerte", label: "Fuerte" },
              { id: "naval", label: "Naval" },
              { id: "selva", label: "Selva" },
              { id: "premium", label: "Premium" },
              { id: "packs", label: "Packs" },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
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

          {loadingProductos ? (
            <div className="text-center py-12 text-gray-400">Cargando catálogo…</div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🥑</div>
              <p className="text-gray-400">No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {productosFiltrados.map((product) => (
                <div
                  key={idProducto(product._id)}
                  className="group bg-gray-50 rounded-xl p-4 text-center hover:bg-white hover:shadow-lg transition-all duration-300"
                >
                  <div className="h-32 flex items-center justify-center mb-3">
                    <img
                      src={product.imagen}
                      alt={product.nombre}
                      className="h-28 object-contain group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{product.nombre}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {product.description || "—"}
                  </p>
                  <div className="mt-2">
                    <span className="text-xl font-bold text-emerald-600">
                      S/ {product.precio.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400"> /kg</span>
                  </div>
                  <button
                    type="button"
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
