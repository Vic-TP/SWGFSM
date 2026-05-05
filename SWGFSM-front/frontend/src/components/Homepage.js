// src/components/Homepage.js — catálogo desde API producto (inventario) + ventas online

import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import Footer from "./Footer";
import CartSidebar from "./CartSidebar";
import ProductDetail from "./ProductDetail";
import PaymentGateway from "./PaymentGateway";
import { categoriaCatalogo, imagenCatalogo, descripcionCortaTarjeta } from "../utils/tiendaProducto";

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

/** Títulos uniformes en catálogo (evita mezcla PALTA / palta). */
const tituloCatalogo = (s) => {
  const t = (s || "").trim();
  if (!t) return "Producto";
  return t
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
};

const normalizarProductos = (lista) =>
  lista
    .filter((p) => String(p.estado || "ACTIVO").toUpperCase() !== "INACTIVO")
    .map((p) => ({
      ...p,
      imagen: imagenCatalogo(p, IMG_DEFAULTS),
      precio: precioNum(p.precioVenta),
      description: (p.detalle || p.descripcion || "").trim(),
      descripcionCorta: descripcionCortaTarjeta(p),
      categoria: categoriaCatalogo(p),
      rating: 5,
    }));

/** Pin de ubicación: gota roja, círculo blanco y base ovalada. */
const IconoPinEntrega = () => (
  <svg
    width="32"
    height="42"
    viewBox="0 0 24 36"
    className="shrink-0 text-red-600 block"
    aria-hidden
  >
    <ellipse cx="12" cy="32" rx="5" ry="2" fill="currentColor" />
    <path
      fill="currentColor"
      d="M12 0C5.38 0 0 5.12 0 11.5 0 17.75 12 28 12 28S24 17.5 24 11.5C24 5.12 18.62 0 12 0z"
    />
    <circle cx="12" cy="10.5" r="3.2" fill="#ffffff" />
  </svg>
);

const LINEAS_METROPOLITANO_ENTREGA = [
  "ESTACION CAQUETA",
  "ESTACION UNI",
  "ESTACION TACNA",
  "ESTACION JIRON DE LA UNION",
  "ESTACION CENTRAL",
];

/** Filtros del catálogo que muestran panel informativo (sin grilla de tarjetas). */
const FILTROS_PANEL_VARIEDAD = new Set(["hass", "fuerte", "naval", "selva"]);

/** Textos fijos: historia breve, nutrición aproximada y exportación por variedad. */
const PANEL_VARIEDAD = {
  hass: {
    titulo: "Palta Hass",
    etiquetaSinStock: "Hass",
    historia:
      "La variedad Hass toma su nombre del horticultor californiano Rudolph Hass (1926). Su piel rugosa que ennegrece al madurar y su pulpa cremosa la convirtieron en la más cultivada del mundo. En el Perú la Hass se desarrolla en la costa y sierra apta, aprovechando suelos y clima; hoy es columna vertebral de la agroexportación peruana y símbolo de calidad en mesas de todo el planeta.",
    nutricion: [
      "Calorías: unas 160 kcal, principalmente de grasas saludables.",
      "Grasas: ~15 g, en su mayoría monoinsaturadas (ácido oleico).",
      "Fibra: ~7 g, favorece la saciedad y el tránsito intestinal.",
      "Potasio, vitamina E, vitamina K, folato y antioxidantes naturales.",
    ],
    exportacion:
      "El Perú exporta palta Hass a mercados como Estados Unidos, la Unión Europea, Chile, China, Japón y Corea del Sur, entre otros, cumpliendo estándares fitosanitarios y de trazabilidad de primer nivel.",
  },
  fuerte: {
    titulo: "Palta Fuerte",
    etiquetaSinStock: "Fuerte",
    historia:
      "La Fuerte desciende de la raza mexicana y se fijó como variedad en California hacia 1911 a partir de semillas tipo Puebla; su nombre alude a su rusticidad. En el Perú marcó generaciones de exportación de “palta verde” antes del auge de la Hass: fruto en forma de pera, piel fina y lustrosa y pulpa cremosa de sabor intenso, muy apreciada en cocina y ensaladas.",
    nutricion: [
      "Calorías: ~160 kcal por 100 g, con perfil lipídico cardiosaludable.",
      "Grasas: ~15 g, en su mayoría monoinsaturadas.",
      "Fibra: ~7 g; potasio, vitaminas E y C y folato en buena proporción.",
      "Aporta saciedad y combina bien con dietas equilibradas.",
    ],
    exportacion:
      "Perú comercializa Fuerte en ventanas complementarias a la Hass hacia Estados Unidos, Europa, Chile y otros mercados gourmet o regionales que valoran sabor clásico y piel verde brillante.",
  },
  naval: {
    titulo: "Palta Naval",
    etiquetaSinStock: "Naval",
    historia:
      "La Naval (también conocida como Nabal) es una variedad española tradicional, de fruto redondeado u ovalado, cáscara más gruesa y verde brillante y pulpa cremosa de sabor suave. En el Perú se cultiva en valles costeros con buen riego, a menudo asociada a calendarios de cosecha distintos a la Hass y muy valorada en mesas que buscan pulpa firme al corte.",
    nutricion: [
      "Calorías: ~150–167 kcal por 100 g según madurez y tamaño.",
      "Grasas: ~14–15 g, mayoritariamente monoinsaturadas.",
      "Fibra y potasio; vitaminas E y K en cantidades apreciables.",
      "Textura cremosa con aceite moderado según el punto de maduración.",
    ],
    exportacion:
      "La oferta Naval peruana puede orientarse a Europa, Estados Unidos y mercados de Latinoamérica que demandan piel más verde y fruta firme para transporte y retail.",
  },
  selva: {
    titulo: "Palta de selva",
    etiquetaSinStock: "palta de selva",
    historia:
      "Las paltas de selva corresponden a material criollo y mejorado en la Amazonía peruana (San Martín, Ucayali y regiones afines), en clima cálido húmedo y suelos profundos. Combinan razas antillanas y guatemalteco-antillanas: frutos a menudo generosos, formas variadas y sabores marcados, con fuerte arraigo en ferias locales y cocina regional.",
    nutricion: [
      "Calorías: ~140–160 kcal por 100 g según tipo y madurez.",
      "Grasas saludables, fibra dietética y potasio.",
      "Vitaminas del complejo B y antioxidantes asociados a pulpa verde.",
      "Ideal como complemento en dietas variadas y activas.",
    ],
    exportacion:
      "El canal nacional es el principal; programas orgánicos y de origen llevan selva a Europa y nichos de Estados Unidos, destacando trazabilidad y prácticas sostenibles.",
  },
};

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
    } finally {
      setShowPayment(false);
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

  const primerProductoVariedad = useMemo(() => {
    const list = productosActivos.filter((p) => precioNum(p.precioVenta) > 0);
    const pick = (slug) => {
      const byCat = list.find((p) => categoriaCatalogo(p) === slug);
      if (byCat) return byCat;
      const hint = slug === "naval" ? "naval" : slug;
      return list.find((p) => String(p.nombre || "").toLowerCase().includes(hint)) || null;
    };
    return {
      hass: pick("hass"),
      fuerte: pick("fuerte"),
      naval: pick("naval"),
      selva: pick("selva"),
    };
  }, [productosActivos]);

  const promoCards = useMemo(() => {
    const list = productosActivos.filter((p) => precioNum(p.precioVenta) > 0);
    const pickFuerte =
      list.find((p) => categoriaCatalogo(p) === "fuerte") ||
      list.find((p) => String(p.nombre || "").toLowerCase().includes("fuerte")) ||
      null;
    const pickHass =
      list.find((p) => categoriaCatalogo(p) === "hass") ||
      list.find((p) => String(p.nombre || "").toLowerCase().includes("hass")) ||
      null;
    const pickSelva =
      list.find((p) => categoriaCatalogo(p) === "selva") ||
      list.find((p) => String(p.nombre || "").toLowerCase().includes("selva")) ||
      null;
    return [
      {
        slot: 0,
        img: paltaFuerte,
        etiqueta: "PALTA FUERTE",
        precioFijo: 9,
        product: pickFuerte,
      },
      {
        slot: 1,
        img: paltaHass,
        etiqueta: "PALTA HASS",
        precioFijo: null,
        product: pickHass,
      },
      {
        slot: 2,
        img: paltaSelva,
        etiqueta: "PALTA DE LA SELVA",
        precioFijo: null,
        product: pickSelva,
      },
    ];
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
                    const el = document.getElementById("catalogo-destacado");
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

      <section
        id="catalogo-destacado"
        className="border-y border-emerald-100/80 bg-gradient-to-b from-emerald-50/70 via-white to-amber-50/30 py-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 border-b border-emerald-200/50 pb-10 text-center sm:text-left">
            <span className="inline-block text-sm font-bold uppercase tracking-[0.18em] text-emerald-700 sm:text-base">
              CATALOGO
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Productos de Temporada
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg lg:text-xl">
              Los mejores productos de la cosecha actual
            </p>
          </div>

          {loadingProductos ? (
            <div className="py-20 text-center text-sm text-slate-400">Cargando catálogo…</div>
          ) : productosTemporada.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-slate-500">
              No hay productos activos con precio en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {productosTemporada.map((product, idx) => (
                <article
                  key={idProducto(product._id)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-emerald-100/90 bg-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/80 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-b from-white to-emerald-50/50">
                    {idx === 0 && (
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-700 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                        Destacado
                      </span>
                    )}
                    <img
                      src={product.imagen}
                      alt={tituloCatalogo(product.nombre)}
                      className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col border-t border-emerald-100/80 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900">
                        {tituloCatalogo(product.nombre)}
                      </h3>
                      <div className="flex shrink-0 items-center gap-0.5 text-amber-500" aria-hidden>
                        <span className="text-base">★</span>
                        <span className="text-sm font-semibold text-slate-600">{product.rating}</span>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-snug text-slate-700 sm:text-base">
                      {product.descripcionCorta}
                    </p>
                    <div className="mt-auto flex items-baseline gap-1 border-t border-emerald-50 pt-4">
                      <span className="text-xl font-bold tabular-nums text-emerald-600">
                        S/ {product.precio.toFixed(2)}
                      </span>
                      <span className="text-sm text-slate-500">/ kg</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="mt-4 w-full rounded-full bg-emerald-600 py-3 text-center text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-emerald-700 hover:shadow-lg"
                    >
                      Ver ficha de producto
                    </button>
                  </div>
                </article>
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
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              31 de julio Día Internacional de la Palta
            </h2>
            <p className="text-emerald-200 text-lg max-w-4xl mx-auto">
              Todos los dias celebramos el placer de una buena palta
              <br />
              <span className="block mt-4 sm:mt-5 text-3xl sm:text-4xl font-bold leading-tight tracking-tight px-1">
                POR ESO TRAEMOS ESTAS PROMOCIONES PARA TI
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-2 md:pt-6">
            {promoCards.map(({ slot, img, etiqueta, precioFijo, product }) => {
              const precioPack =
                precioFijo != null
                  ? precioFijo
                  : product
                    ? precioNum(product.precioVenta ?? product.precio)
                    : NaN;
              const precioOk = Number.isFinite(precioPack) && precioPack > 0;
              return (
                <div
                  key={slot}
                  className="transform bg-white rounded-2xl p-6 text-center shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <div
                    className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-100 to-amber-200/90 p-2 shadow-inner ring-2 ring-amber-800/20"
                    aria-hidden
                  >
                    <div className="grid grid-cols-2 gap-1 rounded-md bg-amber-50/80 p-1.5 shadow-sm">
                      {[0, 1, 2, 3].map((i) => (
                        <img
                          key={i}
                          src={img}
                          alt=""
                          className="h-10 w-10 object-contain drop-shadow-sm"
                        />
                      ))}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-gray-900">PACK FAMILIAR</h3>
                  <p className="mt-1 text-lg font-bold uppercase tracking-tight text-gray-800">
                    {etiqueta}
                  </p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-emerald-600">
                      {precioOk ? `S/ ${precioPack.toFixed(2)}` : "S/ —"}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!product}
                    onClick={() => product && setSelectedProduct(product)}
                    className={`mt-5 w-full rounded-full py-2.5 font-semibold transition-all duration-300 ${
                      product
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "cursor-not-allowed bg-gray-200 text-gray-500"
                    }`}
                  >
                    Ver producto
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="catalogo-productos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              Conoce nuestros productos
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {[
              { id: "todos", label: "Todos" },
              { id: "hass", label: "Hass" },
              { id: "fuerte", label: "Fuerte" },
              { id: "naval", label: "Naval" },
              { id: "selva", label: "Selva" },
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

          {FILTROS_PANEL_VARIEDAD.has(filterCategoria) && PANEL_VARIEDAD[filterCategoria] && (
            <div className="mb-10 flex flex-col gap-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm lg:flex-row lg:items-stretch lg:gap-10 lg:p-8">
              <div className="min-w-0 flex-1 space-y-5 text-left text-sm leading-relaxed text-gray-700">
                <h3 className="text-xl font-bold text-emerald-900">{PANEL_VARIEDAD[filterCategoria].titulo}</h3>
                <div>
                  <h4 className="mb-1 font-semibold text-gray-900">Historia breve</h4>
                  <p>{PANEL_VARIEDAD[filterCategoria].historia}</p>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-gray-900">Valor nutricional (aprox. por 100 g)</h4>
                  <ul className="list-inside list-disc space-y-0.5 text-gray-600">
                    {PANEL_VARIEDAD[filterCategoria].nutricion.map((linea) => (
                      <li key={linea}>{linea}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-gray-900">Exportación</h4>
                  <p>{PANEL_VARIEDAD[filterCategoria].exportacion}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col justify-center border-t border-emerald-100 pt-6 lg:w-52 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <button
                  type="button"
                  disabled={!primerProductoVariedad[filterCategoria]}
                  onClick={() => {
                    const p = primerProductoVariedad[filterCategoria];
                    if (p) setSelectedProduct(p);
                  }}
                  className={`w-full rounded-full px-6 py-3 text-center text-base font-semibold shadow-md transition-all duration-300 lg:w-auto ${
                    primerProductoVariedad[filterCategoria]
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg"
                      : "cursor-not-allowed bg-gray-200 text-gray-500"
                  }`}
                >
                  Comprar ahora
                </button>
                {!primerProductoVariedad[filterCategoria] && !loadingProductos && (
                  <p className="mt-2 text-center text-xs text-gray-500 lg:text-left">
                    Pronto habrá {PANEL_VARIEDAD[filterCategoria].etiquetaSinStock} disponible en catálogo.
                  </p>
                )}
              </div>
            </div>
          )}

          {loadingProductos ? (
            <div className="text-center py-12 text-gray-400">Cargando catálogo…</div>
          ) : FILTROS_PANEL_VARIEDAD.has(filterCategoria) ? null : productosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🥑</div>
              <p className="text-gray-400">No se encontraron productos</p>
            </div>
          ) : (
            <div
              id="lista-productos-catalogo"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
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
                  <div className="mt-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
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

          <div className="mt-14 pt-12 border-t border-neutral-200 bg-white">
            <div className="text-center text-black uppercase">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                PUNTOS DE ENTREGA
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl font-bold mt-2 md:mt-3">
                ESTACION METROPOLITANO
              </p>
            </div>
            <ul className="mt-10 md:mt-12 flex flex-row flex-nowrap items-start justify-between gap-2 sm:gap-3 md:gap-4 max-w-6xl mx-auto px-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] md:overflow-visible">
              {LINEAS_METROPOLITANO_ENTREGA.map((linea) => (
                <li
                  key={linea}
                  className="flex flex-col items-center text-center shrink-0 w-[19vw] min-w-[88px] max-w-[170px] md:shrink md:w-auto md:min-w-0 md:flex-1 md:max-w-[200px]"
                >
                  <IconoPinEntrega />
                  <span className="mt-2 px-0.5 font-bold text-black text-[9px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wide leading-tight">
                    {linea}
                  </span>
                </li>
              ))}
            </ul>
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
