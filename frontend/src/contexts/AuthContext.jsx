import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth.js";
import {
  clearTokens,
  getRefreshToken,
  setTokens,
} from "../api/tokens.js";

const AuthContext = createContext(null);

// Maps a user's primary role to the portal they should land in.
export function homePathForUser(user) {
  if (!user?.roles?.length) return "/login";
  const role = user.roles[0].name;
  const map = {
    DRIVER:          "/driver",
    STATION_STAFF:   "/station",
    STATION_MANAGER: "/station",
    DISTRIBUTOR_USER:"/distributor",
    AUTHORITY:       "/government",
    PLATFORM_ADMIN:  "/admin",
  };
  return map[role] || "/login";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on mount using the stored refresh token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        setLoading(false);
        return;
      }
      try {
        const { accessToken } = await authApi.refresh(refreshToken);
        setTokens(accessToken, refreshToken);
        const { user } = await authApi.me();
        if (!cancelled) setUser(user);
      } catch {
        clearTokens();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const { user, accessToken, refreshToken } = await authApi.login(email, password);
    setTokens(accessToken, refreshToken);
    setUser(user);
    return user;
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // ignore — clear locally regardless
    }
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
