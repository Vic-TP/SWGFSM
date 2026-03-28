// src/components/AdminPage.js
import React from "react";
import paltas from "../assets/paltas.png";

const AdminPage = () => {
  const handleIngresarClick = () => {
    // Redirige a /admin-dashboard (Página de administración)
    window.location.href = "/admin-dashboard"; 
  };

  return (
    <div className="min-h-screen bg-lime-200 flex flex-col">
      <header className="bg-lime-400 text-emerald-900 px-10 py-4 flex items-center justify-between shadow-md">
        <h1 className="font-mono text-xl md:text-2xl font-semibold">
          FRUTERIA SEÑOR DE MURUHUAY
        </h1>

        <button
          onClick={() => (window.location.href = "/")}
          className="bg-emerald-700 hover:bg-emerald-600 text-lime-50 font-semibold px-6 py-2 rounded-full text-sm shadow-md"
        >
          Volver a la página principal
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-8 py-10">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-10 items-center">
          {/* Texto + botón */}
          <div>
            <h2 className="text-5xl md:text-6xl font-extrabold text-emerald-900 leading-tight mb-6">
              FRUTERIA SEÑOR DE MURUHUAY
            </h2>

            <p className="font-mono text-xl text-emerald-900 mb-6">
              Ingresar al sistema
            </p>

            <button
              onClick={handleIngresarClick}
              className="bg-emerald-700 hover:bg-emerald-600 text-lime-50 font-extrabold text-2xl tracking-[0.25em] px-10 py-4 rounded-full shadow-[0_16px_0_rgba(0,100,60,0.7)]"
            >
              INGRESAR
            </button>
          </div>

          {/* Imagen */}
          <div className="flex justify-center">
            <img
              src={paltas}
              alt="Ilustración de paltas"
              className="max-w-full rounded-3xl shadow-2xl"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
