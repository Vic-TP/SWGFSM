// src/App.js
import React from "react";
import HomePage from "./components/Homepage";
import LoginPage from "./components/LoginPage";          // login para admin y cliente
import AdminDashboard from "./components/AdminDashboard";
import ClientProfilePage from "./components/ClientProfilePage"; // perfil cliente (opcional)

function App() {
  const path = window.location.pathname;

  // Login (ADMIN o CLIENTE)
  if (path === "/login") {
    return <LoginPage />;
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
