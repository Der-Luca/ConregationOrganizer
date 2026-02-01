import { createContext, useContext, useEffect, useState } from "react";
import  api  from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!accessToken;

  function parseJwtPayload(token) {
    try {
      const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  // Restore login on page reload
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const rolesJson = localStorage.getItem("user_roles");

    if (token && rolesJson) {
      setAccessToken(token);
      try {
        const payload = parseJwtPayload(token);
        setUser({ roles: JSON.parse(rolesJson), id: payload?.sub || null });
      } catch {
        localStorage.removeItem("user_roles");
      }
    }

    setLoading(false);
  }, []);

  // LOGIN
  async function login(identifier, password) {
    const res = await api.post("/auth/login", {
      identifier,
      password,
    });

    const { access_token, roles } = res.data;

    localStorage.setItem("access_token", access_token);
    localStorage.setItem("user_roles", JSON.stringify(roles));

    setAccessToken(access_token);
    const payload = parseJwtPayload(access_token);
    setUser({ roles, id: payload?.sub || null });
  }

  // LOGOUT
  async function logout() {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch (_) {
      // ignore – log out locally regardless
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("user_roles");
    localStorage.removeItem("refresh_token");

    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        user,
        loading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
