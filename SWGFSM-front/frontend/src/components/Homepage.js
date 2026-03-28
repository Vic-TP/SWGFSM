// src/components/Homepage.js
import React, { useState, useEffect } from "react";
import Header from "./Header";
import ProductList from "./ProductList";
import Footer from "./Footer";
import ProductDetail from "./ProductDetail";
import CartSidebar from "./CartSidebar";

const HomePage = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [client, setClient] = useState(null); // info del usuario logueado

  // Leer cliente logueado desde localStorage cuando se carga la página
  useEffect(() => {
    try {
      const logged = localStorage.getItem("cliente_logueado") === "true";
      if (logged) {
        const stored = localStorage.getItem("cliente_actual");
        if (stored) {
          setClient(JSON.parse(stored));
        }
      } else {
        setClient(null);
      }
    } catch (err) {
      console.error("Error leyendo cliente de localStorage", err);
      setClient(null);
    }
  }, []);

  const handleViewProduct = (product) => setSelectedProduct(product);
  const handleCloseDetail = () => setSelectedProduct(null);

  const handleAddToCart = (product, quantity, measure) => {
    setCartItems((prev) => {
      const index = prev.findIndex(
        (item) => item.id === product.id && item.measure === measure
      );
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          quantity: updated[index].quantity + quantity,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          measure,
          quantity,
        },
      ];
    });

    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-lime-200 flex flex-col">
      {/* Header: le pasamos el cliente y el carrito */}
      <Header
        onCartClick={() => setIsCartOpen(true)}
        cartCount={cartCount}
        client={client}
      />

      {/* Productos */}
      <ProductList onViewProduct={handleViewProduct} />

      {/* Footer */}
      <Footer />

      {/* Detalle producto */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={handleCloseDetail}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Carrito lateral */}
     <CartSidebar
  isOpen={isCartOpen}
  items={cartItems}
  onClose={() => setIsCartOpen(false)}
  onCheckout={(items) => {
    const logged = localStorage.getItem("cliente_logueado") === "true";

    // Si NO ha iniciado sesión → lo mandamos a login cliente
    if (!logged) {
      alert("Para pagar debes iniciar sesión o registrarte como cliente.");
      localStorage.setItem("login_mode", "client");
      window.location.href = "/login";
      return;
    }

    // Obtenemos los datos del cliente actual
    const storedClient = localStorage.getItem("cliente_actual");
    let email = "invitado";
    if (storedClient) {
      try {
        const c = JSON.parse(storedClient);
        if (c.email) {
          email = c.email;
        }
      } catch (e) {
        console.error("Error leyendo cliente_actual:", e);
      }
    }

    // Calculamos el total del pedido
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Construimos el objeto pedido
    const order = {
      id: Date.now(), // ID simple
      date: new Date().toISOString(),
      total,
      items: items.map((item) => ({
        name: item.name,
        measure: item.measure,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    // Guardamos por cliente en localStorage
    let ordersByClient = {};
    try {
      const raw = localStorage.getItem("cliente_pedidos");
      if (raw) {
        ordersByClient = JSON.parse(raw);
      }
    } catch (e) {
      console.error("Error leyendo cliente_pedidos:", e);
      ordersByClient = {};
    }

    if (!ordersByClient[email]) {
      ordersByClient[email] = [];
    }
    ordersByClient[email].push(order);

    localStorage.setItem("cliente_pedidos", JSON.stringify(ordersByClient));

    // Feedback y limpieza del carrito
    alert("Gracias por tu compra (demo).");
    setCartItems([]);
    setIsCartOpen(false);
  }}
/>




 


      
    </div>
  );
};

export default HomePage;





