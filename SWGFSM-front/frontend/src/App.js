// src/App.js
import React from "react";
import HomePage from "./components/Homepage";
import LoginPage from "./components/LoginPage";          // login clientes (y legado)
import WorkerLoginPage from "./components/WorkerLoginPage";
import AdminDashboard from "./components/AdminDashboard";
import ClientProfilePage from "./components/ClientProfilePage"; // perfil cliente (opcional)

function App() {
  const path = window.location.pathname;

  // Login cliente
  if (path === "/login") {
    return <LoginPage />;
  }

  // Acceso trabajador (empleados en base de datos)
  if (path === "/login-trabajador") {
    return <WorkerLoginPage />;
  }

  // Dashboard ADMIN
  if (path === "/admin-dashboard") {
    return <AdminDashboard />;
  }

  // Perfil CLIENTE
  if (path === "/cliente/perfil") {
    return <ClientProfilePage />;
  }

  // Página principal
  return <HomePage />;
}

export default App;
