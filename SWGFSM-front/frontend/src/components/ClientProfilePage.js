// src/components/ClientProfilePage.js
import React, { useEffect, useState } from "react";

const formatDate = (isoString) => {
  try {
    return new Date(isoString).toLocaleString("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return isoString;
  }
};

const ClientProfilePage = () => {
  const [client, setClient] = useState(null);
  const [activeSection, setActiveSection] = useState("perfil");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    try {
      const storedClient = localStorage.getItem("cliente_actual");
      if (!storedClient) {
        window.location.href = "/";
        return;
      }

      const c = JSON.parse(storedClient);
      setClient(c);

      const raw = localStorage.getItem("cliente_pedidos");
      if (raw) {
        const allOrders = JSON.parse(raw);
        if (c.email && allOrders[c.email]) {
          setOrders(allOrders[c.email]);
        }
      }
    } catch (e) {
      console.error("Error cargando perfil de cliente:", e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("cliente_logueado");
    localStorage.setItem("login_mode", "client");
    window.location.href = "/";
  };

  if (!client) {
    return (
      <div className="min-h-screen bg-lime-100 flex items-center justify-center">
        <p className="text-emerald-900 font-semibold">
          Cargando perfil de cliente...
        </p>
      </div>
    );
  }

  // ---------- Secciones ----------

  const renderPerfil = () => (
    <div>
      <h2 className="text-2xl font-bold text-emerald-900 mb-2">
        Datos personales
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Actualiza tus datos de sesión, correo electrónico y contraseña.
      </p>

      <div className="space-y-4 text-sm">
        <div>
          <p className="font-semibold text-gray-600">Nombre</p>
          <p className="font-bold text-gray-900">
            {client.nombre} {client.apellidos}
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-600">Email</p>
          <p className="font-bold text-gray-900">{client.email}</p>
        </div>

        <div>
          <p className="font-semibold text-gray-600">Documento de identidad</p>
          <p className="font-bold text-gray-900">
            {client.documento || "—"}
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-600">Teléfono</p>
          <p className="font-bold text-gray-900">
            {client.telefono || "—"}
          </p>
        </div>
      </div>

      <button className="mt-6 px-6 py-2 rounded-full bg-emerald-700 text-white font-semibold text-sm hover:bg-emerald-800">
        Editar datos
      </button>
    </div>
  );

  const renderDirecciones = () => (
    <div>
      <h2 className="text-2xl font-bold text-emerald-900 mb-2">Direcciones</h2>
      <p className="text-gray-500 text-sm mb-4">
        Próximamente podrás gestionar tus direcciones de entrega desde aquí.
      </p>
      <p className="text-sm text-gray-700">
        Por ahora, las direcciones se coordinarán por WhatsApp luego de hacer tu
        pedido.
      </p>
    </div>
  );

  const renderCuenta = () => (
    <div>
      <h2 className="text-2xl font-bold text-emerald-900 mb-2">
        Gestión de la cuenta
      </h2>
      <p className="text-gray-500 text-sm mb-4">
        Aquí podrás cambiar tu contraseña, correo o eliminar tu cuenta (sección
        en construcción).
      </p>
      <p className="text-sm text-gray-700">
        Si necesitas cambiar algún dato urgente, contáctanos por nuestros
        canales de atención.
      </p>
    </div>
  );

  const renderPedidos = () => {
    if (!orders || orders.length === 0) {
      return (
        <div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">Pedidos</h2>
          <p className="text-gray-500 text-sm">
            Aún no has realizado ningún pedido.
          </p>
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-2xl font-bold text-emerald-900 mb-4">Pedidos</h2>
        <p className="text-gray-500 text-sm mb-4">
          Estos son los pedidos que has realizado en la frutería.
        </p>

        <div className="space-y-4">
          {orders
            .slice()
            .reverse()
            .map((order, index) => (
              <div
                key={order.id || index}
                className="border border-emerald-100 rounded-2xl p-4 bg-white shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Pedido #{orders.length - index}
                    </p>
                    <p className="text-xs text-gray-500">
                      Fecha: {formatDate(order.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-emerald-900">
                      S/ {order.total?.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-2 border-t border-emerald-50 pt-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    Detalle del pedido:
                  </p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {order.items?.map((item, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>
                          {item.name} ({item.measure}) x {item.quantity}
                        </span>
                        <span>
                          S/ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  // ---------- Render principal con header + botón volver ----------

  return (
    <div className="min-h-screen bg-lime-100 flex flex-col">
      {/* Barra superior con botón de volver */}
      <header className="bg-lime-400 text-emerald-900 px-10 py-4 flex items-center justify-between shadow-md">
        <h1 className="font-mono text-lg md:text-xl font-semibold">
          Área de cliente - Frutería Señor de Muruhuay
        </h1>

        <button
          onClick={() => (window.location.href = "/")}
          className="bg-emerald-700 hover:bg-emerald-600 text-lime-50 font-semibold px-6 py-2 rounded-full text-sm shadow-md"
        >
          Volver a la tienda
        </button>
      </header>

      {/* Contenido */}
      <main className="flex-1 flex justify-center py-10 px-4">
        <div className="w-full max-w-5xl flex gap-6">
          {/* Columna izquierda: menú */}
          <aside className="w-64 bg-white rounded-3xl shadow-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gray-200 mb-3" />
                <p className="text-sm text-gray-500">
                  Hola, {client.nombre} !
                </p>
              </div>

              <nav className="space-y-2 text-sm">
                <button
                  className={`w-full text-left px-3 py-2 rounded-xl ${
                    activeSection === "perfil"
                      ? "bg-lime-100 text-emerald-900 font-semibold"
                      : "text-gray-700 hover:bg-lime-50"
                  }`}
                  onClick={() => setActiveSection("perfil")}
                >
                  Perfil
                </button>
                <button
                  className={`w-full text-left px-3 py-2 rounded-xl ${
                    activeSection === "direcciones"
                      ? "bg-lime-100 text-emerald-900 font-semibold"
                      : "text-gray-700 hover:bg-lime-50"
                  }`}
                  onClick={() => setActiveSection("direcciones")}
                >
                  Direcciones
                </button>
                <button
                  className={`w-full text-left px-3 py-2 rounded-xl ${
                    activeSection === "cuenta"
                      ? "bg-lime-100 text-emerald-900 font-semibold"
                      : "text-gray-700 hover:bg-lime-50"
                  }`}
                  onClick={() => setActiveSection("cuenta")}
                >
                  Gestión de la cuenta
                </button>
                <button
                  className={`w-full text-left px-3 py-2 rounded-xl ${
                    activeSection === "pedidos"
                      ? "bg-lime-100 text-emerald-900 font-semibold"
                      : "text-gray-700 hover:bg-lime-50"
                  }`}
                  onClick={() => setActiveSection("pedidos")}
                >
                  Pedidos
                </button>
              </nav>
            </div>

            <button
              className="mt-6 text-sm text-red-600 font-semibold hover:underline text-left"
              onClick={handleLogout}
            >
              Salir
            </button>
          </aside>

          {/* Columna derecha: contenido */}
          <section className="flex-1 bg-white rounded-3xl shadow-lg p-8">
            {activeSection === "perfil" && renderPerfil()}
            {activeSection === "direcciones" && renderDirecciones()}
            {activeSection === "cuenta" && renderCuenta()}
            {activeSection === "pedidos" && renderPedidos()}
          </section>
        </div>
      </main>
    </div>
  );
};

export default ClientProfilePage;
