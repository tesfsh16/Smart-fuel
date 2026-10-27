import { api } from "./client.js";
import { getRefreshToken } from "./tokens.js";

export function login(email, password) {
  return api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(data) {
  return api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function me() {
  return api("/api/auth/me");
}

export function refresh(refreshToken) {
  return api("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function logout() {
  return api("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken: getRefreshToken() }),
  });
}
