/** Token JWT del cliente/admin — sessionStorage con respaldo en localStorage. */

export const getAuthToken = () =>
  sessionStorage.getItem("auth_token") ||
  localStorage.getItem("auth_token") ||
  null;

export const syncAuthStorage = () => {
  const token = localStorage.getItem("auth_token");
  if (token && !sessionStorage.getItem("auth_token")) {
    sessionStorage.setItem("auth_token", token);
  }
  const profile = localStorage.getItem("user_profile");
  if (profile && !sessionStorage.getItem("user_profile")) {
    sessionStorage.setItem("user_profile", profile);
  }
};
