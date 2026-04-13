// src/components/LoginPage.js - CORREGIDO

import React, { useState } from "react";  // ← Eliminado useEffect

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  // ---- ESTADO REGISTRO (solo para clientes) ----
  const [regNombre, setRegNombre] = useState("");
  const [regApellidos, setRegApellidos] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regTelefono, setRegTelefono] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Admins de prueba (solo acceden con @muruhuay.com)
  const fakeAdmins = [
    { email: "maria@muruhuay.com", password: "123456", role: "ADMIN_ALMACEN", nombre: "María" },
  ];

  // Detectar si es admin por el correo
  const isAdminEmail = (emailStr) => emailStr.endsWith("@muruhuay.com");

  const handleSubmit = (e) => {
    e.preventDefault();

    // ===================== REGISTRO (solo clientes) =====================
    if (isRegister) {
      // Los que se registran NUNCA pueden ser admin
      if (isAdminEmail(regEmail)) {
        alert("No puedes registrarte con un correo @muruhuay.com. Este dominio es solo para administradores.");
        return;
      }

      if (!regNombre || !regApellidos || !regEmail || !regTelefono || !regPassword) {
        alert("Completa todos los campos para crear tu cuenta.");
        return;
      }

      const nuevoCliente = {
        nombre: regNombre,
        apellidos: regApellidos,
        email: regEmail,
        telefono: regTelefono,
        password: regPassword,
      };

      localStorage.setItem("cliente_actual", JSON.stringify(nuevoCliente));
      localStorage.setItem("cliente_logueado", "true");

      alert(`Cuenta de cliente creada para ${nuevoCliente.nombre}.`);
      window.location.href = "/cliente/perfil";
      return;
    }

    // ===================== LOGIN (deteccion automatica) =====================
    if (isAdminEmail(email)) {
      // ---------- LOGIN ADMIN (por correo @muruhuay.com) ----------
      const admin = fakeAdmins.find((u) => u.email === email && u.password === password);
      if (!admin) {
        alert("Correo o contrasena de administrador incorrectos.");
        return;
      }
      alert(`Bienvenida ${admin.nombre}, acceso de administrador concedido.`);
      window.location.href = "/admin-dashboard";
    } else {
      // ---------- LOGIN CLIENTE NORMAL ----------
      const stored = localStorage.getItem("cliente_actual");
      if (!stored) {
        alert("No hay ningun cliente registrado con ese correo. Registrate primero.");
        return;
      }
      const cliente = JSON.parse(stored);
      if (cliente.email === email && cliente.password === password) {
        localStorage.setItem("cliente_logueado", "true");
        alert(`Bienvenido/a ${cliente.nombre}`);
        window.location.href = "/cliente/perfil";
      } else {
        alert("Correo o contrasena de cliente incorrectos.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-lime-200 flex flex-col">
      <header className="bg-lime-400 text-emerald-900 px-10 py-4 flex items-center justify-between shadow-md">
        <h1 className="font-mono text-lg md:text-xl font-semibold">
          Fruteria Señor de Muruhuay - Acceso
        </h1>
        <button
          onClick={() => (window.location.href = "/")}
          className="bg-emerald-700 hover:bg-emerald-600 text-lime-50 font-semibold px-6 py-2 rounded-full text-sm shadow-md"
        >
          Volver a la tienda
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-[#E9FFF2] rounded-3xl shadow-2xl w-full max-w-xl p-8 md:p-10">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-emerald-100">
            <button
              className={`flex-1 py-2 text-center font-semibold ${
                !isRegister
                  ? "text-emerald-900 border-b-4 border-emerald-500"
                  : "text-emerald-700"
              }`}
              onClick={() => setIsRegister(false)}
            >
              Iniciar sesion
            </button>
            <button
              className={`flex-1 py-2 text-center font-semibold ${
                isRegister
                  ? "text-emerald-900 border-b-4 border-emerald-500"
                  : "text-emerald-700"
              }`}
              onClick={() => setIsRegister(true)}
            >
              Registrarse (Clientes)
            </button>
          </div>

          {/* LOGIN */}
          {!isRegister && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">
                  Correo electronico
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-emerald-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  * Los correos @muruhuay.com acceden como administrador
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">
                  Contrasena
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-emerald-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs text-emerald-800">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded"
                  />
                  <span>Mantener sesion iniciada</span>
                </label>
                <button type="button" className="hover:underline" onClick={() => alert("Contacta con soporte para recuperar tu contrasena")}>
                  ¿Olvidaste tu contrasena?
                </button>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-full shadow-lg transition"
              >
                Iniciar sesion
              </button>
            </form>
          )}

          {/* REGISTRO (solo clientes) */}
          {isRegister && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg mb-2">
                Nota: Los correos @muruhuay.com no pueden registrarse como clientes.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-emerald-900 mb-1">Nombres</label>
                  <input type="text" className="w-full rounded-xl border border-emerald-100 px-4 py-2" value={regNombre} onChange={(e) => setRegNombre(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-900 mb-1">Apellidos</label>
                  <input type="text" className="w-full rounded-xl border border-emerald-100 px-4 py-2" value={regApellidos} onChange={(e) => setRegApellidos(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">Correo electronico</label>
                <input type="email" className="w-full rounded-xl border border-emerald-100 px-4 py-2" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">Telefono</label>
                <input type="tel" className="w-full rounded-xl border border-emerald-100 px-4 py-2" value={regTelefono} onChange={(e) => setRegTelefono(e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">Contrasena</label>
                <input type="password" className="w-full rounded-xl border border-emerald-100 px-4 py-2" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
              </div>

              <button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-full shadow-lg transition">
                Crear cuenta
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default LoginPage;