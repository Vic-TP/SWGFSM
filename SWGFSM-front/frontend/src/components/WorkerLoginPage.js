import React, { useState } from "react";
import { Toaster, toast } from "sonner";
import PasswordInput from "./PasswordInput";

const API_LOGIN = "http://localhost:5000/api/empleados/login";

const inputClass =
  "w-full rounded-xl border border-[#d4e9e2] bg-white px-4 py-2.5 text-[#1e3932] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006241]/35 focus:border-[#006241]/45";

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
        toast.error(data.message || "Correo o contraseña incorrectos.");
        return;
      }
      if (data.empleado) {
        // Guardar token JWT en sessionStorage
        if (data.token) {
          sessionStorage.setItem("auth_token", data.token);
        }
        // Guardar datos del empleado en sessionStorage (mismo lugar que en LoginPage)
        sessionStorage.setItem("user_profile", JSON.stringify(data.empleado));
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#d4e9e2]/55 via-white to-[#f6f4ef]">
      <Toaster position="bottom-center" richColors success/>
      <header className="flex items-center justify-between bg-[#1e3932] px-6 py-4 shadow-md md:px-10">
        <h1 className="text-base font-semibold tracking-tight text-white md:text-xl">
          Frutería Señor de Muruhuay — Acceso trabajador
        </h1>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          className="rounded-full bg-[#006241] px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#004d33]"
        >
          Volver a la tienda
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-[#d4e9e2]/90 bg-white p-8 shadow-[0_24px_60px_-12px_rgba(30,57,50,0.18)] md:p-10">
          <p className="mb-6 text-sm leading-relaxed text-[#1e3932]/85">
            Usa el correo y la contraseña que te asignó el administrador en la
            sección Empleados.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1e3932]">
                Correo electrónico
              </label>
              <input
                type="email"
                className={inputClass}
                placeholder="tu@email.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                autoComplete="username"
              />
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
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-[#006241] py-3 font-semibold text-white shadow-lg transition hover:bg-[#004d33] disabled:opacity-60"
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
