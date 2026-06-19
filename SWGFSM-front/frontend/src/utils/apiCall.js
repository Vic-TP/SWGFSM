  // frontend/src/utils/apiCall.js

  const API_BASE_URL = "http://localhost:5000/api";

  /**
   * Hacer un request a la API incluyendo JWT automáticamente
   *
   * @param {string} endpoint - Ruta del endpoint (ej: '/empleados', '/clientes')
   * @param {object} options - Opciones de fetch (method, body, headers, etc)
   * @returns {Promise} Respuesta del servidor
   *
   * Ejemplo:
   *   const data = await apiCall('/empleados', { method: 'GET' });
   *   const result = await apiCall('/producto', {
   *     method: 'POST',
   *     body: JSON.stringify({ nombre: 'Palta' })
   *   });
   */
  export const apiCall = async (endpoint, options = {}) => {
    const token = sessionStorage.getItem("auth_token");

    // Headers por defecto
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Agregar JWT si existe
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Si token expiró (401), limpiar y redirigir a login
      if (response.status === 401) {
        console.warn("Token expirado, redirigiendo a login...");
        sessionStorage.clear();
        window.location.href = "/login";
        return;
      }

      // Si no autorizado (403), mostrar error
      if (response.status === 403) {
        throw new Error("No tienes permisos para esta acción");
      }

      return await response.json();
    } catch (error) {
      console.error("Error en request API:", error);
      throw error;
    }
  };

  /**
   * Verificar si el usuario está autenticado
   */
  export const isAuthenticated = () => {
    return sessionStorage.getItem("auth_token") !== null;
  };

  /**
   * Obtener datos del usuario actual
   */
  export const getCurrentUser = () => {
    const userProfile = sessionStorage.getItem("user_profile");
    return userProfile ? JSON.parse(userProfile) : null;
  };

  /**
   * Cerrar sesión
   */
  export const logout = () => {
    sessionStorage.clear();
    window.location.href = "/login";
  };
