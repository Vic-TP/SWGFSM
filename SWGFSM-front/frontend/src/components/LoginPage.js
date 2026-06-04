// src/components/LoginPage.js - CORREGIDO

import React, { useState } from "react"; // ← Eliminado useEffect
import PasswordInput from "./PasswordInput";

const API_URL_CLIENTES = "http://localhost:5000/api/clientes";

const inputClass =
  "w-full rounded-xl border border-[#d4e9e2] bg-white px-4 py-2.5 text-[#1e3932] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006241]/35 focus:border-[#006241]/45";

/** Respuesta del API (nombres/correo) → forma usada en el front (nombre/email) */
const mapServerCliente = (doc) => {
  if (!doc) return null;
  return {
    _id: doc._id,
    nombre: doc.nombres,
    apellidos: doc.apellidos || "",
    email: doc.correo,
    telefono: doc.telefono || "",
    documento: doc.documento || "",
    tipoCliente: doc.tipoCliente,
    estado: doc.estado,
  };
};

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
    {
      email: "maria@muruhuay.com",
      password: "123456",
      role: "ADMIN_ALMACEN",
      nombre: "María",
    },
  ];

  // Detectar si es admin por el correo
  const isAdminEmail = (emailStr) => emailStr.endsWith("@muruhuay.com");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ===================== REGISTRO (solo clientes) → MongoDB =====================
    if (isRegister) {
      if (isAdminEmail(regEmail)) {
        alert(
          "No puedes registrarte con un correo @muruhuay.com. Este dominio es solo para administradores.",
        );
        return;
      }

      if (
        !regNombre ||
        !regApellidos ||
        !regEmail ||
        !regTelefono ||
        !regPassword
      ) {
        alert("Completa todos los campos para crear tu cuenta.");
        return;
      }

      try {
        const res = await fetch(API_URL_CLIENTES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombres: regNombre,
            apellidos: regApellidos,
            correo: regEmail,
            telefono: regTelefono,
            password: regPassword,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.message || "No se pudo crear la cuenta.");
          return;
        }
        const clienteFront = mapServerCliente(data.cliente || data);

        // Guardar token de forma segura
        if (data.token) {
          sessionStorage.setItem("auth_token", data.token);
        }
        sessionStorage.setItem("user_profile", JSON.stringify(clienteFront));

        alert(
          `Cuenta creada para ${clienteFront.nombre}. Tus datos quedaron guardados en el servidor.`,
        );
        window.location.href = "/cliente/perfil";
      } catch (err) {
        console.error(err);
        alert(
          "No se pudo conectar con el servidor. ¿Está el backend en marcha?",
        );
      }
      return;
    }

    // ===================== LOGIN (deteccion automatica) =====================
    if (isAdminEmail(email)) {
      const admin = fakeAdmins.find(
        (u) => u.email === email && u.password === password,
      );
      if (!admin) {
        alert("Correo o contrasena de administrador incorrectos.");
        return;
      }

      // Guardar admin en sessionStorage
      const adminData = {
        nombres: admin.nombre,
        apellidos: "",
        correo: admin.email,
        rol: "Administrador de almacén",
        estado: "ACTIVO",
        _id: "legacy-muruhuay",
      };
      sessionStorage.setItem("user_profile", JSON.stringify(adminData));

      // Generar token JWT fake para el admin (válido por 24 horas)
      // Este es un token válido firmado con una clave conocida para desarrollo
      const fakeAdminToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImxlZ2FjeS1tdXJ1aHVheSIsImNvcnJlbyI6Im1hcmlhQG11cnVodWF5LmNvbSIsInJvbCI6IkFkbWluaXN0cmFkb3IgZGUgYWxtYWNlbiIsIm5vbWJyZXMiOiJNYXLDrWEiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.mock-signature";
      sessionStorage.setItem("auth_token", fakeAdminToken);

      alert(`Bienvenida ${admin.nombre}, acceso de administrador concedido.`);
      window.location.href = "/admin-dashboard";
      return;
    }

    // ---------- LOGIN CLIENTE (MongoDB) ----------
    try {
      const res = await fetch(`${API_URL_CLIENTES}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: email,
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "Correo o contraseña incorrectos.");
        return;
      }
      const clienteFront = mapServerCliente(data.cliente);

      // Guardar token JWT
      if (data.token) {
        sessionStorage.setItem("auth_token", data.token);
      }
      sessionStorage.setItem("user_profile", JSON.stringify(clienteFront));

      alert(`Bienvenido/a ${clienteFront.nombre}`);
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("No se pudo conectar con el servidor. ¿Está el backend en marcha?");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#d4e9e2]/55 via-white to-[#f6f4ef]">
      <header className="flex items-center justify-between bg-[#1e3932] px-6 py-4 shadow-md md:px-10">
        <h1 className="text-base font-semibold tracking-tight text-white md:text-xl">
          Frutería Señor de Muruhuay — Acceso
        </h1>
        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="rounded-full bg-[#006241] px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#004d33]"
        >
          Volver a la tienda
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-3xl border border-[#d4e9e2]/90 bg-white p-8 shadow-[0_24px_60px_-12px_rgba(30,57,50,0.18)] md:p-10">
          {/* Tabs */}
          <div className="mb-6 flex border-b border-[#006241]/15">
            <button
              type="button"
              className={`flex-1 py-2 text-center text-sm font-semibold transition md:text-base ${
                !isRegister
                  ? "border-b-[3px] border-[#006241] text-[#1e3932]"
                  : "border-b-[3px] border-transparent text-[#1e3932]/50 hover:text-[#1e3932]/75"
              }`}
              onClick={() => setIsRegister(false)}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-center text-sm font-semibold transition md:text-base ${
                isRegister
                  ? "border-b-[3px] border-[#006241] text-[#1e3932]"
                  : "border-b-[3px] border-transparent text-[#1e3932]/50 hover:text-[#1e3932]/75"
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
                <label className="mb-1 block text-sm font-medium text-[#1e3932]">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  * Los correos @muruhuay.com acceden como administrador
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1e3932]">
                  Contraseña
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#1e3932]/80">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-[#d4e9e2] text-[#006241] focus:ring-[#006241]/40"
                  />
                  <span>Mantener sesión iniciada</span>
                </label>
                <button
                  type="button"
                  className="hover:text-[#006241] hover:underline"
                  onClick={() =>
                    alert("Contacta con soporte para recuperar tu contraseña")
                  }
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                className="mt-4 w-full rounded-full bg-[#006241] py-3 font-semibold text-white shadow-lg transition hover:bg-[#004d33]"
              >
                Iniciar sesión
              </button>
            </form>
          )}

          {/* REGISTRO (solo clientes) */}
          {isRegister && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#1e3932]">
                    Nombres
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={regNombre}
                    onChange={(e) => setRegNombre(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#1e3932]">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={regApellidos}
                    onChange={(e) => setRegApellidos(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1e3932]">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1e3932]">
                  Teléfono
                </label>
                <input
                  type="tel"
                  className={inputClass}
                  value={regTelefono}
                  onChange={(e) => setRegTelefono(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1e3932]">
                  Contraseña
                </label>
                <PasswordInput
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="mt-4 w-full rounded-full bg-[#006241] py-3 font-semibold text-white shadow-lg transition hover:bg-[#004d33]"
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
