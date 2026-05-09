// src/components/Homepage.js — catálogo desde API producto (inventario) + ventas online

import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import Footer from "./Footer";
import CartSidebar from "./CartSidebar";
import ProductDetail from "./ProductDetail";
import PaymentGateway from "./PaymentGateway";
import {
  categoriaCatalogo,
  imagenCatalogo,
  descripcionCortaTarjeta,
  tipoProductoLabel,
  MEASURE_CARRITO_BUCKETS,
  clampKgPorMadurezUi,
  totalKgBuckets,
} from "../utils/tiendaProducto";

import paltaHassVerde from "../assets/palta-hass-verde.png";
import paltaHassMadura from "../assets/palta-hass-madura.png";
import paltaHassCarousel from "../assets/palta-hass.png";
import paltaFuerte from "../assets/palta-fuerte.png";
import paltaFuerteMostrador from "../assets/palta-fuerte-mostrador.png";
import paltaNaval from "../assets/palta-naval.png";
import paltaSelva from "../assets/palta-selva.png";
import paltasVariadas from "../assets/paltas.png";
import logoPaltas from "../assets/logopaltasinterior.png";
import paltaHall from "../assets/palta-hall.png";
import infoNutri from "../assets/info_nutri.png";
import procesoChacra from "../assets/proceso/chacra.png";
import procesoCosecha from "../assets/proceso/cosecha.png";
import procesoTraslado from "../assets/proceso/traslado.png";
import procesoClasificacion from "../assets/proceso/clasificacion.png";
import procesoLocal from "../assets/proceso/local.png";
import iconProductoFresco from "../assets/iconos/producto_fresco.png";
import iconMejorPrecio from "../assets/iconos/mejor_precio.png";
import iconCalidad from "../assets/iconos/calidad.png";

const API_URL_PRODUCTOS = "http://localhost:5000/api/producto";
const API_URL_VENTAS = "http://localhost:5000/api/ventas";

/** Carrusel hero: rutas empaquetadas por Webpack (siempre visibles en dev y build). Para tus fotos, sustituye los PNG en src/assets (o public/hero-carousel vía código). */
const HERO_CAROUSEL_SLIDES = [
  { key: "hass", src: paltaHassCarousel, alt: "Palta Hass seleccionada", label: "Palta Hass" },
  { key: "naval", src: paltaNaval, alt: "Palta Naval en cultivo", label: "Palta Naval" },
  { key: "chacra", src: procesoChacra, alt: "Chacra y origen peruano", label: "Del campo a tu mesa" },
  { key: "selva", src: paltaSelva, alt: "Palta de la selva peruana", label: "Palta de la selva" },
];

const IMG_DEFAULTS = {
  hassVerde: paltaHassVerde,
  hassMadura: paltaHassMadura,
  hass: paltaHassVerde,
  fuerte: paltaFuerte,
  fuerteMostrador: paltaFuerteMostrador,
  hall: paltaHall,
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

const tituloConTipo = (p) => {
  const nombre = tituloCatalogo(p?.nombre);
  const tipo = String(p?.tipo || "").trim();
  if (!tipo) return nombre;
  const n = nombre.toLowerCase();
  const t = tipo.toLowerCase();
  if (n.includes(t)) return nombre;
  return `${nombre} ${tituloCatalogo(tipo)}`;
};

const normalizarProductos = (lista) =>
  lista
    .filter((p) => String(p.estado || "ACTIVO").toUpperCase() !== "INACTIVO")
    .map((p) => {
      const img = imagenCatalogo(p, IMG_DEFAULTS);
      const nt = `${p?.nombre || ""} ${p?.tipo || ""}`.toLowerCase();
      const esHass = nt.includes("hass");
      const esFuerte = nt.includes("fuerte");
      const imagen =
        esHass ? IMG_DEFAULTS.hassVerde : esFuerte ? IMG_DEFAULTS.fuerte : img;
      return {
        ...p,
        imagen,
        imagenesFichaExtra: esHass
          ? [IMG_DEFAULTS.hassMadura]
          : esFuerte
            ? [IMG_DEFAULTS.fuerteMostrador]
            : [],
        precio: precioNum(p.precioVenta),
        description: (p.detalle || p.descripcion || "").trim(),
        descripcionCorta: descripcionCortaTarjeta(p),
        categoria: categoriaCatalogo(p),
        rating: 5,
      };
    });

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

const IconoProductoFresco = () => (
  <img
    src={iconProductoFresco}
    alt=""
    className="h-14 w-14 rounded-2xl object-cover shadow-sm ring-1 ring-[#d4e9e2]/90"
    loading="lazy"
  />
);

const IconoMejorPrecio = () => (
  <img
    src={iconMejorPrecio}
    alt=""
    className="h-14 w-14 object-contain"
    style={{
      filter:
        "brightness(0) saturate(100%) invert(35%) sepia(92%) saturate(560%) hue-rotate(70deg) brightness(95%) contrast(95%)",
    }}
    loading="lazy"
  />
);

const IconoCalidad = () => (
  <img
    src={iconCalidad}
    alt=""
    className="h-14 w-14 object-contain mix-blend-multiply"
    loading="lazy"
  />
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
  const [heroSlide, setHeroSlide] = useState(0);

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

  useEffect(() => {
    const n = HERO_CAROUSEL_SLIDES.length;
    if (n < 2) return undefined;
    const id = setInterval(() => {
      setHeroSlide((i) => (i + 1) % n);
    }, 5500);
    return () => clearInterval(id);
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

    const bucketMeta =
      meta.kgPorMadurez != null && typeof meta.kgPorMadurez === "object" ? meta.kgPorMadurez : null;
    if (bucketMeta && measure === MEASURE_CARRITO_BUCKETS) {
      const clamped = clampKgPorMadurezUi(product, bucketMeta);
      const totalKg = totalKgBuckets(clamped);
      if (totalKg < 1) {
        window.alert("Indica al menos 1 kg en total entre verde, sazón y maduro.");
        return;
      }
      setCartItems((prev) => {
        const existe = prev.some(
          (i) =>
            idProducto(i.productoId) === productoId &&
            (i.measure === MEASURE_CARRITO_BUCKETS || i.esBuckets === true)
        );
        if (existe) {
          queueMicrotask(() =>
            window.alert(
              `«${product.nombre}» ya está en el carrito. Abre el carrito para quitarlo si quieres cambiar las cantidades por madurez, o ajusta desde el detalle del producto más adelante.`
            )
          );
          return prev;
        }
        return [
          ...prev,
          {
            productoId,
            id: productoId,
            name: product.nombre,
            tipo: tipoProductoLabel(product),
            price: precioUnitario,
            image: product.imagen,
            measure: MEASURE_CARRITO_BUCKETS,
            esBuckets: true,
            quantity: totalKg,
            precioUnitario,
            cantidadKg: totalKg,
            kgPorMadurez: clamped,
          },
        ];
      });
      setIsCartOpen(true);
      return;
    }

    setCartItems((prev) => {
      const ix = prev.findIndex(
        (i) => idProducto(i.productoId) === productoId && i.measure === measure
      );
      if (ix >= 0) {
        return prev.map((i, idx) => {
          if (idx !== ix) return i;
          const q = i.quantity + quantity;
          return { ...i, quantity: q, cantidadKg: q, tipo: tipoProductoLabel(product) };
        });
      }
      return [
        ...prev,
        {
          productoId,
          id: productoId,
          name: product.nombre,
          tipo: tipoProductoLabel(product),
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

  const handleRemoveCartItem = (itemToRemove) => {
    const pid = idProducto(itemToRemove?.productoId ?? itemToRemove?.id);
    const measure = itemToRemove?.measure ?? "1kg";
    setCartItems((prev) =>
      prev.filter(
        (i) => !(idProducto(i.productoId ?? i.id) === pid && (i.measure ?? "1kg") === measure)
      )
    );
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
    const lineasDesdeItem = (item) => {
      const pu = precioNum(item.precioUnitario);
      const tipoStr =
        item.tipo != null && String(item.tipo).trim() !== "" && String(item.tipo).trim() !== "—"
          ? String(item.tipo).trim()
          : "";
      const base = {
        productoId: idProducto(item.productoId),
        nombre: item.name,
        ...(tipoStr ? { tipo: tipoStr } : {}),
        precioUnitario: pu,
      };

      if (item.esBuckets && item.kgPorMadurez && typeof item.kgPorMadurez === "object") {
        const kg = item.kgPorMadurez;
        const filas = [];
        for (const mad of ["verde", "sazon", "maduro"]) {
          const c = Math.max(0, Math.floor(Number(kg[mad]) || 0));
          if (c < 1) continue;
          filas.push({
            ...base,
            cantidad: c,
            precioUnitario: pu,
            medida: "1kg",
            subtotal: c * pu,
            madurez: mad,
          });
        }
        return filas;
      }

      const cantidad = Math.max(1, Math.floor(Number(item.cantidadKg ?? item.quantity)) || 1);
      const subtotalLinea = precioNum(item.price) * precioNum(item.quantity);
      return [
        {
          ...base,
          cantidad,
          precioUnitario: pu,
          medida: item.measure || "1kg",
          subtotal: subtotalLinea,
        },
      ];
    };

    const productos = cartItems.flatMap(lineasDesdeItem);

    if (!productos.length) {
      alert("El carrito no tiene líneas válidas para enviar.");
      return;
    }

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
          items: cartItems.map(({ name, measure, quantity, price, productoId, esBuckets, kgPorMadurez }) => ({
            name,
            measure,
            quantity,
            price,
            productoId,
            ...(esBuckets && kgPorMadurez ? { esBuckets: true, kgPorMadurez } : {}),
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
        img: paltaHassVerde,
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
        {/* Tonos inspirados en Starbucks: menta suave #d4e9e2 + neutros cálidos */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#d4e9e2]/75 via-white to-[#f6f4ef]"></div>
        <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-[#006241]/14 blur-3xl"></div>
        <div className="absolute bottom-10 left-10 h-96 w-96 rounded-full bg-[#1e3932]/10 blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="lg:w-1/2 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#006241]/20 bg-[#006241]/10 px-4 py-1.5 mb-6">
                <span className="text-sm font-semibold text-[#006241]">Producto Peruano</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight text-[#1e3932] mb-6">
                Las mejores
                <span className="block text-[#006241]">paltas peruanas</span>
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
                  className="bg-[#006241] font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#004d33] hover:shadow-xl transform hover:scale-105 rounded-full px-8 py-3"
                >
                  Comprar ahora
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("catalogo-destacado");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-full border-2 border-[#006241] px-8 py-3 font-semibold text-[#006241] transition-all duration-300 hover:bg-[#006241]/10"
                >
                  Ver ofertas
                </button>
              </div>

              <p className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#006241] lg:text-left">
                MUY PRONTO DISPONIBLE EN TIENDA
              </p>

              <div className="flex gap-8 justify-center lg:justify-start mt-10">
                <div>
                  <div className="text-2xl font-bold text-[#1e3932]">500+</div>
                  <div className="text-sm text-gray-400">Clientes felices</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1e3932]">
                    {loadingProductos ? "…" : productosActivos.length}
                  </div>
                  <div className="text-sm text-gray-400">Productos en catálogo</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1e3932]">24h</div>
                  <div className="text-sm text-gray-400">Entrega rápida</div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 flex w-full justify-center px-2">
              <div className="relative w-full max-w-lg lg:max-w-2xl">
                <div
                  className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#006241]/20 via-[#1e3932]/12 to-[#d4e9e2]/40 blur-3xl"
                  aria-hidden
                />
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-[#006241]/25 bg-[#1e3932]/[0.03] shadow-[0_28px_80px_-12px_rgba(0,98,65,0.35)] ring-1 ring-[#006241]/15 sm:aspect-[5/4] lg:min-h-[min(52vh,440px)]">
                  {HERO_CAROUSEL_SLIDES.map((slide, i) => (
                    <img
                      key={slide.key}
                      src={slide.src}
                      alt={slide.alt}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out ${
                        i === heroSlide
                          ? "z-10 opacity-100"
                          : "z-0 opacity-0 pointer-events-none"
                      }`}
                      loading={i === 0 ? "eager" : "lazy"}
                      draggable={false}
                    />
                  ))}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#1e3932]/95 via-[#1e3932]/50 to-transparent px-5 pb-5 pt-20 sm:px-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4e9e2]">
                      {HERO_CAROUSEL_SLIDES[heroSlide].label}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Imagen anterior"
                    onClick={() =>
                      setHeroSlide((s) =>
                        (s - 1 + HERO_CAROUSEL_SLIDES.length) % HERO_CAROUSEL_SLIDES.length
                      )
                    }
                    className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-lg backdrop-blur-md transition hover:bg-white/25"
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      ‹
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Siguiente imagen"
                    onClick={() =>
                      setHeroSlide((s) => (s + 1) % HERO_CAROUSEL_SLIDES.length)
                    }
                    className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-lg backdrop-blur-md transition hover:bg-white/25"
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      ›
                    </span>
                  </button>
                  <div
                    className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2"
                    role="tablist"
                    aria-label="Seleccionar imagen"
                  >
                    {HERO_CAROUSEL_SLIDES.map((_, i) => (
                      <button
                        key={String(i)}
                        type="button"
                        role="tab"
                        aria-selected={i === heroSlide}
                        aria-label={`Ir a imagen ${i + 1}`}
                        onClick={() => setHeroSlide(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === heroSlide ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#d4e9e2]/80 bg-gradient-to-b from-white via-[#eef7f3]/95 to-white py-18 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#006241]/25 bg-[#006241]/10 px-7 py-3 shadow-sm">
                <span className="text-lg font-bold text-[#006241]">Modo saludable</span>
              </span>
              <h2 className="mt-5 text-4xl lg:text-5xl font-extrabold text-[#1e3932]">
                Beneficios de la palta
              </h2>
              <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0">
                Información rápida para que incluyas la palta en tus comidas diarias.
              </p>
              <div className="mt-7 flex justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={() => (window.location.href = "/recetas-palta")}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#006241] px-7 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-[#004d33] hover:shadow-xl"
                >
                  <span>Mira las recetas con palta</span>
                  <span aria-hidden>→</span>
                </button>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <img
                src={infoNutri}
                alt="Beneficios de la palta"
                className="w-full max-w-lg rounded-3xl border border-[#d4e9e2]/90 bg-white shadow-xl"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="catalogo-destacado"
        className="border-y border-[#d4e9e2]/90 bg-gradient-to-b from-[#eef7f3]/90 via-white to-[#f6f4ef]/80 py-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 border-b border-[#006241]/15 pb-10 text-center sm:text-left">
            <span className="inline-block text-sm font-bold uppercase tracking-[0.18em] text-[#006241] sm:text-base">
              CATALOGO
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1e3932] sm:text-4xl lg:text-5xl">
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
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#d4e9e2] bg-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#006241]/35 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-b from-white to-[#eef7f3]/80">
                    {idx === 0 && (
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-[#006241] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                        Destacado
                      </span>
                    )}
                    <img
                      src={product.imagen}
                      alt={tituloConTipo(product)}
                      className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col border-t border-[#d4e9e2]/90 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900">
                        {tituloConTipo(product)}
                      </h3>
                      <div className="flex shrink-0 items-center gap-0.5 text-amber-500" aria-hidden>
                        <span className="text-base">★</span>
                        <span className="text-sm font-semibold text-slate-600">{product.rating}</span>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-snug text-slate-700 sm:text-base">
                      {product.descripcionCorta}
                    </p>
                    <div className="mt-auto flex items-baseline gap-1 border-t border-[#eef7f3] pt-4">
                      <span className="text-xl font-bold tabular-nums text-[#006241]">
                        S/ {product.precio.toFixed(2)}
                      </span>
                      <span className="text-sm text-slate-500">/ kg</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="mt-4 w-full rounded-full bg-[#006241] py-3 text-center text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-[#004d33] hover:shadow-lg"
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#006241] to-[#1e3932]"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              31 de julio Día Internacional de la Palta
            </h2>
            <p className="max-w-4xl mx-auto text-lg text-[#d4e9e2]">
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
                    <span className="text-3xl font-bold text-[#006241]">
                      {precioOk ? `S/ ${precioPack.toFixed(2)}` : "S/ —"}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!product}
                    onClick={() => product && setSelectedProduct(product)}
                    className={`mt-5 w-full rounded-full py-2.5 font-semibold transition-all duration-300 ${
                      product
                        ? "bg-[#006241] text-white hover:bg-[#004d33]"
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

      <section className="relative overflow-hidden bg-white py-16 lg:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#eef7f3]/70 to-white" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#006241]/25 bg-[#006241]/10 px-5 py-2">
              <span className="text-sm font-bold uppercase tracking-wide text-[#006241]">
                Del campo a tu mesa
              </span>
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              ¿Cómo llega la palta al local?
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Te mostramos el proceso de cosecha y cuidado para que recibas paltas frescas y de calidad.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                n: "01",
                t: "Sembrío",
                d: "Cultivo y cuidado en el campo.",
                img: procesoChacra,
              },
              {
                n: "02",
                t: "Cosecha",
                d: "Selección y recolección en el punto ideal.",
                img: procesoCosecha,
              },
              {
                n: "03",
                t: "Traslado",
                d: "Transporte seguro para mantener frescura.",
                img: procesoTraslado,
              },
              {
                n: "04",
                t: "Clasificación",
                d: "Revisión, pesaje y orden por calidad.",
                img: procesoClasificacion,
              },
              {
                n: "05",
                t: "Venta en local",
                d: "Listas para tu compra en el mercado.",
                img: procesoLocal,
              },
            ].map((step) => (
              <div
                key={step.n}
                className="group overflow-hidden rounded-3xl border border-[#d4e9e2] bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="relative aspect-[4/3] bg-gradient-to-b from-[#eef7f3] to-white">
                  <img
                    src={step.img}
                    alt={step.t}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-[#006241] shadow">
                    {step.n}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {step.t}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {step.d}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 hidden lg:block">
            <div className="relative mx-auto max-w-6xl">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#006241]/25" />
              <div className="grid grid-cols-5 gap-6">
                {["Sembrío", "Cosecha", "Traslado", "Clasificación", "Local"].map((label) => (
                  <div key={label} className="flex flex-col items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-[#006241] ring-4 ring-[#d4e9e2]/80" />
                    <span className="text-xs font-bold uppercase tracking-wide text-[#1e3932]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="catalogo-productos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="mb-3 text-3xl font-bold text-[#1e3932] lg:text-4xl">
              Conoce nuestros productos
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {[
              { id: "todos", label: "Todos" },
              { id: "hass", label: "Hass" },
              { id: "fuerte", label: "Fuerte" },
              { id: "naval", label: "Naval" },
              { id: "selva", label: "Hall" },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setFilterCategoria(filter.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  filterCategoria === filter.id
                    ? "bg-[#006241] text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {FILTROS_PANEL_VARIEDAD.has(filterCategoria) && PANEL_VARIEDAD[filterCategoria] && (
            <div className="mb-10 flex flex-col gap-6 rounded-2xl border border-[#006241]/20 bg-gradient-to-br from-[#eef7f3]/95 to-white p-6 shadow-sm lg:flex-row lg:items-stretch lg:gap-10 lg:p-8">
              <div className="min-w-0 flex-1 space-y-5 text-left text-sm leading-relaxed text-gray-700">
                <h3 className="text-xl font-bold text-[#1e3932]">{PANEL_VARIEDAD[filterCategoria].titulo}</h3>
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
              <div className="flex shrink-0 flex-col justify-center border-t border-[#d4e9e2] pt-6 lg:w-52 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <button
                  type="button"
                  disabled={!primerProductoVariedad[filterCategoria]}
                  onClick={() => {
                    const p = primerProductoVariedad[filterCategoria];
                    if (p) setSelectedProduct(p);
                  }}
                  className={`w-full rounded-full px-6 py-3 text-center text-base font-semibold shadow-md transition-all duration-300 lg:w-auto ${
                    primerProductoVariedad[filterCategoria]
                      ? "bg-[#006241] text-white hover:bg-[#004d33] hover:shadow-lg"
                      : "cursor-not-allowed bg-gray-200 text-gray-500"
                  }`}
                >
                  Comprar ahora
                </button>
                <p className="mt-2 text-center text-xs font-semibold tracking-wide text-[#006241] lg:text-left">
                  MUY PRONTO DISPONIBLE EN TIENDA
                </p>
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
                  <h3 className="font-semibold text-gray-900 text-sm">{tituloConTipo(product)}</h3>
                  <div className="mt-3">
                    <span className="text-xl font-bold text-[#006241]">
                      S/ {product.precio.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400"> /kg</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="mt-3 w-full rounded-full bg-[#006241] py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#004d33]"
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
              { icon: <IconoProductoFresco />, title: "Producto fresco", desc: "Directo del campo" },
              { icon: <IconoMejorPrecio />, title: "Mejor precio", desc: "Sin IGV" },
              { icon: <IconoCalidad />, title: "Calidad garantizada", desc: "Selección premium" },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="mb-4 flex justify-center">{item.icon}</div>
                <h3 className="font-semibold text-gray-800 text-base mb-1">{item.title}</h3>
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
        onRemoveItem={handleRemoveCartItem}
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
