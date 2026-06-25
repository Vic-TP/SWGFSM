// src/App.js
import React from "react";
import HomePage from "./components/Homepage";
import LoginPage from "./components/LoginPage";          // login clientes (y legado)
import WorkerLoginPage from "./components/WorkerLoginPage";
import AdminDashboard from "./components/AdminDashboard";
import ClientProfilePage from "./components/ClientProfilePage"; // perfil cliente (opcional)
import RecetasPaltaPage from "./components/RecetasPaltaPage";

const checkAuthOnStartup = () => {
  try {
    const token = localStorage.getItem("auth_token");
    if (token) {
      // Decode JWT token to check expiration
      const parts = token.split('.');
      let isExpired = false;
      if (parts.length === 3) {
        try {
          let payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const pad = payloadBase64.length % 4;
          if (pad) {
            payloadBase64 += '='.repeat(4 - pad);
          }
          const payload = JSON.parse(atob(payloadBase64));
          if (payload.exp) {
            const currentTime = Math.floor(Date.now() / 1000);
            if (payload.exp < currentTime) {
              isExpired = true;
            }
          }
        } catch (e) {
          console.error("Error decoding token on startup:", e);
          isExpired = true;
        }
      } else {
        isExpired = true;
      }

      if (isExpired) {
        console.warn("Token de sesión expirado en inicio de aplicación. Limpiando sesión...");
        // Clear all storage if token is expired
        sessionStorage.clear();
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_profile");
        localStorage.removeItem("cliente_logueado");
        localStorage.removeItem("cliente_actual");
        localStorage.removeItem("trabajador_logueado");
        localStorage.removeItem("trabajador_actual");
      } else {
        // Restore to sessionStorage for backward compatibility
        sessionStorage.setItem("auth_token", token);
        const profile = localStorage.getItem("user_profile");
        if (profile) {
          sessionStorage.setItem("user_profile", profile);
        }
      }
    } else {
      // If no token in localStorage, but cliente_logueado is still "true", clear it
      if (localStorage.getItem("cliente_logueado") === "true") {
        sessionStorage.clear();
        localStorage.removeItem("cliente_logueado");
        localStorage.removeItem("cliente_actual");
      }
    }
  } catch (err) {
    console.error("Error in checkAuthOnStartup:", err);
  }
};

// Ejecutar validación de sesión al cargar la aplicación
checkAuthOnStartup();

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

  // Recetas con palta
  if (path === "/recetas-palta") {
    return <RecetasPaltaPage />;
  }

  // Página principal
  return <HomePage />;
}

export default App;

