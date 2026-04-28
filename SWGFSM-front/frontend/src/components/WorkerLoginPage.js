import React, { useState } from "react";
import PasswordInput from "./PasswordInput";

const API_LOGIN = "http://localhost:5000/api/empleados/login";

const WorkerLoginPage = () => {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(API_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "No se pudo iniciar sesión.");
        return;
      }
      if (data.empleado) {
        localStorage.setItem("trabajador_logueado", "true");
        localStorage.setItem("trabajador_actual", JSON.stringify(data.empleado));
      }
      window.location.href = "/admin-dashboard";
    } catch (err) {
      console.error(err);
      alert("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lime-200 flex flex-col">
      <header className="bg-lime-400 text-emerald-900 px-10 py-4 flex items-center justify-between shadow-md">
        <h1 className="font-mono text-lg md:text-xl font-semibold">
          Frutería Señor de Muruhuay — Acceso trabajador
        </h1>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          className="bg-emerald-700 hover:bg-emerald-600 text-lime-50 font-semibold px-6 py-2 rounded-full text-sm shadow-md"
        >
          Volver a la tienda
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-[#E9FFF2] rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10">
          <p className="text-sm text-emerald-800 mb-6">
            Usa el correo y la contraseña que te asignó el administrador en la sección
            Empleados.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-emerald-900 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-emerald-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="tu@email.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-900 mb-1">
                Contraseña
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3 rounded-full shadow-lg transition"
            >
              {loading ? "Entrando…" : "Entrar al panel"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default WorkerLoginPage;
