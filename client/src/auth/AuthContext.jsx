import { createContext, useContext, useEffect, useState } from "react";
import  api  from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!accessToken;

  // 🔁 Restore login on page reload
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");

    if (token && role) {
      setAccessToken(token);
      setUser({ role });
    }

    setLoading(false);
  }, []);

  // 🔐 LOGIN
  async function login(identifier, password) {
    const res = await api.post("/auth/login", {
      identifier,
      password,
    });

    const { access_token, role } = res.data;

    localStorage.setItem("access_token", access_token);
    localStorage.setItem("user_role", role);

    setAccessToken(access_token);
    setUser({ role });
  }

  // 🚪 LOGOUT
  async function logout() {
    try {
      // optional – Backend-Logout
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch (_) {
      // egal – wir loggen lokal trotzdem aus
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
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
