import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./tokens.js";

// In development the Vite proxy forwards /api → localhost:4000.
// In production (Vercel) we call the Render backend directly.
// Set VITE_API_URL in your Vercel environment variables to point to Render.
const BASE =
  import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
    : "";

// Build the full URL. In dev, BASE is "" so paths like "/api/auth/login" work
// with the Vite proxy. In production, BASE is the Render URL.
function url(path) {
  return BASE + path;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(url("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    setTokens(data.accessToken, refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers["Content-Type"] = headers["Content-Type"] || "application/json";

  let res = await fetch(url(path), { ...options, headers });

  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url(path), { ...options, headers });
    }
  }

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data.error || message;
    } catch { /* no json body */ }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return res.json();
}
