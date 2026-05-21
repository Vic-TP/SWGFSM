// src/components/AdminPage.js
import React from "react";
import paltas from "../assets/paltas.png";

const AdminPage = () => {
  const handleIngresarClick = () => {
    window.location.href = "/admin-dashboard";
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#d4e9e2]/55 via-white to-[#f6f4ef]">
      <header className="flex items-center justify-between bg-[#1e3932] px-6 py-4 shadow-md md:px-10">
        <h1 className="text-lg font-semibold tracking-tight text-white md:text-2xl">
          FRUTERÍA SEÑOR DE MURUHUAY
        </h1>

        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="rounded-full bg-[#006241] px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#004d33]"
        >
          Volver a la página principal
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-8 py-10">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="mb-6 text-5xl font-extrabold leading-tight text-[#1e3932] md:text-6xl">
              FRUTERÍA SEÑOR DE MURUHUAY
            </h2>

            <p className="mb-6 text-xl text-[#1e3932]/85">Ingresar al sistema</p>

            <button
              type="button"
              onClick={handleIngresarClick}
              className="rounded-full bg-[#006241] px-10 py-4 text-2xl font-extrabold tracking-[0.25em] text-white shadow-[0_16px_0_rgba(0,77,51,0.85)] transition hover:bg-[#004d33]"
            >
              INGRESAR
            </button>
          </div>

          <div className="flex justify-center">
            <img src={paltas} alt="Ilustración de paltas" className="max-w-full rounded-3xl shadow-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
