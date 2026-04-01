// api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original.url?.includes("/auth/");

    if (error.response?.status !== 401 || original._retry || isAuthRoute) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      isRefreshing = false;
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(error);
    }

    try {
      const res = await api.post("/auth/refresh", { refresh_token: refreshToken });
      const { access_token, refresh_token: newRefreshToken } = res.data;

      localStorage.setItem("access_token", access_token);
      if (newRefreshToken) localStorage.setItem("refresh_token", newRefreshToken);
      api.defaults.headers.common.Authorization = `Bearer ${access_token}`;

      processQueue(null, access_token);
      original.headers.Authorization = `Bearer ${access_token}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_roles");
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
