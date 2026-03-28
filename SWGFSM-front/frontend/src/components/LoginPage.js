// src/components/LoginPage.js
import React, { useState, useEffect } from "react";

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loginMode, setLoginMode] = useState("client"); // "client" o "admin"

  // ---- ESTADO LOGIN (ambos) ----
  const [email, setEmail] = useState("maria@muruhuay.com");
  const [password, setPassword] = useState("123456");
  const [remember, setRemember] = useState(false);

  // ---- ESTADO REGISTRO (cliente) ----
  const [regNombre, setRegNombre] = useState("");
  const [regApellidos, setRegApellidos] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regTelefono, setRegTelefono] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Cargar modo de login desde localStorage
  useEffect(() => {
    const storedMode = localStorage.getItem("login_mode");
    if (storedMode === "admin" || storedMode === "client") {
      setLoginMode(storedMode);
    } else {
      setLoginMode("client"); // por defecto cliente
    }
  }, []);

  // Admins de prueba
  const fakeAdmins = [
    {
      email: "maria@muruhuay.com",
      password: "123456",
      role: "ADMIN_ALMACEN",
      nombre: "María",
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    // ===================== REGISTRO CLIENTE =====================
    if (isRegister) {
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
      localStorage.setItem("login_mode", "client");

      alert(`Cuenta de cliente creada para ${nuevoCliente.nombre}.`);

      window.location.href = "/cliente/perfil";
      return;
    }

    // ===================== LOGIN (depende del modo) =====================
    if (loginMode === "admin") {
      // ---------- LOGIN ADMIN ----------
      const admin = fakeAdmins.find(
        (u) => u.email === email && u.password === password
      );

      if (!admin) {
        alert("Correo o contraseña de administrador incorrectos.");
        return;
      }

      alert(`Bienvenida ${admin.nombre}, acceso de administrador concedido ✅`);
      window.location.href = "/admin-dashboard";
    } else {
      // ---------- LOGIN CLIENTE ----------
      const stored = localStorage.getItem("cliente_actual");

      if (!stored) {
        alert("No hay ningún cliente registrado con ese correo.");
        return;
      }

      const cliente = JSON.parse(stored);
      if (cliente.email === email && cliente.password === password) {
        localStorage.setItem("cliente_logueado", "true");
        localStorage.setItem("login_mode", "client");
        alert(`Bienvenido/a ${cliente.nombre} 🥑`);
        window.location.href = "/cliente/perfil";
      } else {
        alert("Correo o contraseña de cliente incorrectos.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-lime-200 flex flex-col">
      {/* Barra superior */}
      <header className="bg-lime-400 text-emerald-900 px-10 py-4 flex items-center justify-between shadow-md">
        <h1 className="font-mono text-lg md:text-xl font-semibold">
          {loginMode === "admin"
            ? "Acceso administrador - Frutería Señor de Muruhuay"
            : "Acceso cliente - Frutería Señor de Muruhuay"}
        </h1>

        <button
          onClick={() => (window.location.href = "/")}
          className="bg-emerald-700 hover:bg-emerald-600 text-lime-50 font-semibold px-6 py-2 rounded-full text-sm shadow-md"
        >
          Volver a la tienda
        </button>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-[#E9FFF2] rounded-3xl shadow-2xl w-full max-w-xl p-8 md:p-10">
          {/* Tabs: Iniciar / Registrarse (registro solo cliente) */}
          <div className="flex mb-6 border-b border-emerald-100">
            <button
              className={`flex-1 py-2 text-center font-semibold ${
                !isRegister
                  ? "text-emerald-900 border-b-4 border-emerald-500"
                  : "text-emerald-700"
              }`}
              onClick={() => setIsRegister(false)}
            >
              Iniciar sesión
            </button>
            <button
              className={`flex-1 py-2 text-center font-semibold ${
                isRegister
                  ? "text-emerald-900 border-b-4 border-emerald-500"
                  : "text-emerald-700"
              }`}
              onClick={() => {
                setIsRegister(true);
                setLoginMode("client"); // registro siempre es cliente
              }}
            >
              Registrarse
            </button>
          </div>

          {/* ================= FORMULARIO LOGIN ================= */}
          {!isRegister && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Correo */}
              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">
                  Correo o usuario
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-emerald-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="correo@muruhuay.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">
                  Contraseña
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

              {/* Mantener sesión + olvidaste (solo visual) */}
              <div className="flex items-center justify-between text-xs text-emerald-800">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded"
                  />
                  <span>Mantener sesión iniciada</span>
                </label>
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() =>
                    alert("Función de recuperar contraseña pendiente ")
                  }
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Botón principal */}
              <button
                type="submit"
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-full shadow-lg transition"
              >
                Iniciar sesión
              </button>
            </form>
          )}

          {/* ================= FORMULARIO REGISTRO (CLIENTE) ================= */}
          {isRegister && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-emerald-900 mb-1">
                    Nombres
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-emerald-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={regNombre}
                    onChange={(e) => setRegNombre(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-900 mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-emerald-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={regApellidos}
                    onChange={(e) => setRegApellidos(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-emerald-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="correo@muruhuay.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="w-full rounded-xl border border-emerald-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={regTelefono}
                  onChange={(e) => setRegTelefono(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-emerald-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-full shadow-lg transition"
              >
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
