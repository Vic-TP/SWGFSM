// src/components/ClientProfilePage.js - VERSIÓN CON CONEXIÓN A MONGODB

import React, { useEffect, useState } from "react";

const API_URL_VENTAS = "http://localhost:5000/api/ventas";

const formatDate = (isoString) => {
  try {
    return new Date(isoString).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
  } catch { return isoString; }
};

const Icon = ({ name }) => {
  const icons = {
    perfil: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    pedidos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
    direcciones: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />,
    cuenta: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[name]}
    </svg>
  );
};

const LogoutModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Cerrar sesión</h3>
      <p className="text-sm text-gray-500 mb-6">¿Seguro que quieres salir de tu cuenta?</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-full text-sm hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-full text-sm transition">
          Salir
        </button>
      </div>
    </div>
  </div>
);

const ClientProfilePage = () => {
  const [client, setClient] = useState(null);
  const [activeSection, setActiveSection] = useState("perfil");
  const [orders, setOrders] = useState([]);
  const [showLogout, setShowLogout] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientAndOrders();
  }, []);

  const loadClientAndOrders = async () => {
    try {
      setLoading(true);
      
      // Cargar cliente desde localStorage
      const stored = localStorage.getItem("cliente_actual");
      if (!stored) { 
        window.location.href = "/"; 
        return; 
      }
      const c = JSON.parse(stored);
      setClient(c);
      setEditForm(c);
      
      // Cargar pedidos desde MongoDB
      await fetchClientOrders(c.email);
      
    } catch (e) { 
      console.error(e); 
    } finally {
      setLoading(false);
    }
  };

  const fetchClientOrders = async (email) => {
    try {
      // Obtener todas las ventas del cliente por email
      const response = await fetch(`${API_URL_VENTAS}?clienteEmail=${email}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Pedidos del cliente desde MongoDB:", data);
        setOrders(data);
        
        // También guardar en localStorage como respaldo
        const byClient = { [email]: data };
        localStorage.setItem("cliente_pedidos", JSON.stringify(byClient));
      } else {
        // Fallback a localStorage si hay error
        const raw = localStorage.getItem("cliente_pedidos");
        if (raw) {
          const all = JSON.parse(raw);
          if (email && all[email]) setOrders(all[email]);
        }
      }
    } catch (error) {
      console.error("Error al cargar pedidos desde MongoDB:", error);
      // Fallback a localStorage
      const raw = localStorage.getItem("cliente_pedidos");
      if (raw) {
        const all = JSON.parse(raw);
        if (email && all[email]) setOrders(all[email]);
      }
    }
  };

  const confirmLogout = () => {
    localStorage.removeItem("cliente_logueado");
    window.location.href = "/";
  };

  const handleSaveProfile = () => {
    const updatedClient = { ...client, ...editForm };
    localStorage.setItem("cliente_actual", JSON.stringify(updatedClient));
    setClient(updatedClient);
    setEditing(false);
    alert("Perfil actualizado correctamente");
  };

  const handleChangePassword = () => {
    if (passwordData.new !== passwordData.confirm) {
      alert("Las nuevas contraseñas no coinciden");
      return;
    }
    const updatedClient = { ...client, password: passwordData.new };
    localStorage.setItem("cliente_actual", JSON.stringify(updatedClient));
    setClient(updatedClient);
    setShowChangePassword(false);
    setPasswordData({ current: "", new: "", confirm: "" });
    alert("Contraseña actualizada correctamente");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-lime-100 flex items-center justify-center">
        <p className="text-emerald-900 font-semibold">Cargando perfil...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-lime-100 flex items-center justify-center">
        <p className="text-emerald-900 font-semibold">No se encontró el cliente</p>
      </div>
    );
  }

  const navItems = [
    { id: "perfil", label: "Mis Datos", icon: "perfil" },
    { id: "pedidos", label: "Mis Pedidos", icon: "pedidos" },
    { id: "direcciones", label: "Direcciones", icon: "direcciones" },
    { id: "cuenta", label: "Seguridad", icon: "cuenta" },
  ];

  const getEstadoColor = (estado) => {
    switch(estado) {
      case "Entregado": return "bg-green-100 text-green-700";
      case "Enviado": return "bg-blue-100 text-blue-700";
      case "Pendiente": return "bg-amber-100 text-amber-700";
      case "Cancelado": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const renderPerfil = () => (
    <div>
      <h2 className="text-2xl font-bold text-emerald-900 mb-1">Mis Datos</h2>
      <p className="text-sm text-gray-400 mb-6">Información personal de tu cuenta</p>

      <div className="bg-gradient-to-r from-emerald-50 to-lime-50 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-white">
              {client.nombre?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{client.nombre} {client.apellidos}</p>
            <p className="text-sm text-gray-500">{client.email}</p>
            <p className="text-xs text-emerald-600 mt-1">Cliente desde {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
              <input type="text" className="w-full rounded-xl border border-gray-200 px-4 py-2" value={editForm.nombre || ""} onChange={(e) => setEditForm({...editForm, nombre: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
              <input type="text" className="w-full rounded-xl border border-gray-200 px-4 py-2" value={editForm.apellidos || ""} onChange={(e) => setEditForm({...editForm, apellidos: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="tel" className="w-full rounded-xl border border-gray-200 px-4 py-2" value={editForm.telefono || ""} onChange={(e) => setEditForm({...editForm, telefono: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Documento</label>
              <input type="text" className="w-full rounded-xl border border-gray-200 px-4 py-2" value={editForm.documento || ""} onChange={(e) => setEditForm({...editForm, documento: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setEditing(false)} className="px-6 py-2 rounded-full border border-gray-300 text-gray-600 font-semibold">Cancelar</button>
            <button onClick={handleSaveProfile} className="px-6 py-2 rounded-full bg-emerald-600 text-white font-semibold">Guardar cambios</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Nombre completo", value: `${client.nombre} ${client.apellidos || ""}` },
              { label: "Correo electrónico", value: client.email },
              { label: "Teléfono", value: client.telefono || "No registrado" },
              { label: "Documento", value: client.documento || "No registrado" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition">
                <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setEditing(true)} className="mt-6 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-md">
            Editar perfil
          </button>
        </>
      )}
    </div>
  );

  const renderPedidos = () => {
    if (orders.length === 0) {
      return (
        <div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-1">Mis pedidos</h2>
          <div className="mt-8 text-center py-12">
            <div className="text-6xl mb-4">🥑</div>
            <p className="text-gray-400 text-sm">Aún no has realizado ningún pedido.</p>
            <button onClick={() => window.location.href = "/"} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-full text-sm">Ir a la tienda</button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-2xl font-bold text-emerald-900 mb-1">Mis pedidos</h2>
        <p className="text-sm text-gray-400 mb-5">{orders.length} pedido(s) realizados.</p>
        <div className="space-y-4">
          {[...orders].reverse().map((order, index) => (
            <div key={order._id || index} className="border border-lime-200 rounded-2xl p-5 bg-white hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    Pedido #{order.numeroVenta || orders.length - index}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.fecha || order.date)}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getEstadoColor(order.estado || "Pendiente")}`}>
                    {order.estado || "Pendiente"}
                  </span>
                  <p className="text-lg font-extrabold text-emerald-800 mt-2">S/ {(order.total || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="border-t border-lime-200 pt-3 space-y-1">
                {(order.productos || order.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-gray-600">
                    <span>{item.nombre || item.name} ({item.medida || item.measure}) x{item.cantidad || item.quantity}</span>
                    <span className="font-semibold">S/ {((item.precioUnitario || item.price) * (item.cantidad || item.quantity)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDirecciones = () => (
    <div>
      <h2 className="text-2xl font-bold text-emerald-900 mb-1">Direcciones de entrega</h2>
      <p className="text-sm text-gray-400 mb-4">Administra tus direcciones de envío</p>
      
      <div className="bg-lime-50 border border-lime-200 rounded-2xl p-5 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold text-gray-800">Dirección principal</p>
            <p className="text-sm text-gray-600 mt-1">Av. Mercado Caqueta N° 800, RIMAC</p>
            <p className="text-xs text-gray-400 mt-1">Referencia: Cerca al mercado</p>
          </div>
          <button className="text-emerald-600 text-sm font-semibold">Editar</button>
        </div>
      </div>
      
      <button className="w-full py-3 rounded-full border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 transition">
        + Agregar nueva dirección
      </button>
    </div>
  );

  const renderCuenta = () => (
    <div>
      <h2 className="text-2xl font-bold text-emerald-900 mb-1">Seguridad</h2>
      <p className="text-sm text-gray-400 mb-6">Administra tu contraseña y datos de acceso</p>

      {showChangePassword ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <input type="password" className="w-full rounded-xl border border-gray-200 px-4 py-2" value={passwordData.current} onChange={(e) => setPasswordData({...passwordData, current: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input type="password" className="w-full rounded-xl border border-gray-200 px-4 py-2" value={passwordData.new} onChange={(e) => setPasswordData({...passwordData, new: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
            <input type="password" className="w-full rounded-xl border border-gray-200 px-4 py-2" value={passwordData.confirm} onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowChangePassword(false)} className="px-6 py-2 rounded-full border border-gray-300 text-gray-600 font-semibold">Cancelar</button>
            <button onClick={handleChangePassword} className="px-6 py-2 rounded-full bg-emerald-600 text-white font-semibold">Actualizar contraseña</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowChangePassword(true)} className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-md">
          Cambiar contraseña
        </button>
      )}
    </div>
  );

  const sectionRender = {
    perfil: renderPerfil,
    pedidos: renderPedidos,
    direcciones: renderDirecciones,
    cuenta: renderCuenta,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 to-emerald-50 flex flex-col">
      <header className="bg-white shadow-md px-8 py-4 flex items-center justify-between">
        <h1 className="font-bold text-xl text-emerald-800">Frutería Señor de Muruhuay</h1>
        <button onClick={() => window.location.href = "/"} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-full text-sm shadow-md transition">
          Volver a la tienda
        </button>
      </header>

      <main className="flex-1 flex justify-center py-10 px-4">
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6 items-start">
          <aside className="w-full md:w-72 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-col items-center mb-6 pb-5 border-b border-gray-100">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-3 shadow-lg">
                <span className="text-3xl font-bold text-white">{client.nombre?.charAt(0)?.toUpperCase()}</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{client.nombre} {client.apellidos}</p>
              <p className="text-xs text-gray-400 mt-0.5">{client.email}</p>
            </div>

            <nav className="space-y-1">
              {navItems.map(({ id, label, icon }) => (
                <button key={id} onClick={() => setActiveSection(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeSection === id ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50"}`}>
                  <Icon name={icon} />
                  {label}
                </button>
              ))}
            </nav>

            <button onClick={() => setShowLogout(true)} className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium transition py-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </aside>

          <section className="flex-1 bg-white rounded-2xl shadow-lg p-8 min-h-[500px]">
            {sectionRender[activeSection]?.()}
          </section>
        </div>
      </main>

      {showLogout && <LogoutModal onConfirm={confirmLogout} onCancel={() => setShowLogout(false)} />}
    </div>
  );
};

export default ClientProfilePage;