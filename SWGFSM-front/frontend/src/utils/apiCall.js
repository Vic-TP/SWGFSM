// frontend/src/utils/apiCall.js

import { getAuthToken, syncAuthStorage } from "./authToken";

import { API_BASE_URL } from "../config/api";

/**
 * Request a la API con JWT automático.
 * @param {string} endpoint
 * @param {object} options - fetch options + redirectOn401 (default true)
 */
export const apiCall = async (endpoint, options = {}) => {
  syncAuthStorage();
  const { redirectOn401 = true, ...fetchOptions } = options;
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (response.status === 401) {
      if (redirectOn401) {
        console.warn("Token expirado, redirigiendo a login...");
        sessionStorage.clear();
        window.location.href = "/login";
        return null;
      }
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || "Sesión expirada. Vuelve a iniciar sesión.");
    }

    if (response.status === 403) {
      throw new Error("No tienes permisos para esta acción");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if (!response.ok) {
        throw new Error(`Error del servidor (${response.status})`);
      }
      return null;
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data?.message || `Error del servidor (${response.status})`,
      );
    }

    return data;
  } catch (error) {
    console.error("Error en request API:", error);
    throw error;
  }
};

export const isAuthenticated = () => Boolean(getAuthToken());

export const getCurrentUser = () => {
  syncAuthStorage();
  const userProfile =
    sessionStorage.getItem("user_profile") ||
    localStorage.getItem("user_profile");
  return userProfile ? JSON.parse(userProfile) : null;
};

export const logout = () => {
  sessionStorage.clear();
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_profile");
  localStorage.removeItem("cliente_logueado");
  localStorage.removeItem("cliente_actual");
  localStorage.removeItem("trabajador_logueado");
  localStorage.removeItem("trabajador_actual");
  window.location.href = "/login";
};
