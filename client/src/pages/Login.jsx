import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useBgImage } from "../hooks/useBgImage";

export default function Login() {
  const navigate = useNavigate();
  const { login, user, loading, isAuthenticated } = useAuth();
  const bgImage = useBgImage("login");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Credenciales incorrectas. Inténtalo de nuevo.";
      setError(typeof msg === "string" ? msg : "Error al iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !user?.roles) return;
    navigate("/user", { replace: true });
  }, [isAuthenticated, user, navigate]);

  const hasBg = !!bgImage;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative transition-all duration-700"
      style={
        hasBg
          ? {
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { background: "linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 50%, #1e3a5f 100%)" }
      }
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-2xl p-8 shadow-2xl space-y-5"
        style={{ background: "rgba(255,255,255,0.96)" }}
      >
        {/* Header */}
        <div className="text-center space-y-2 pb-1">
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
          <p className="text-sm text-gray-500">
            Accede con tu usuario o correo electrónico
          </p>
        </div>

        {error && (
          <div className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Usuario o correo
          </label>
          <input
            className="border border-gray-200 rounded-xl px-4 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            placeholder="usuario o correo@ejemplo.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            type="password"
            className="border border-gray-200 rounded-xl px-4 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting || loading}
          className="w-full py-2.5 rounded-xl font-semibold text-white text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)" }}
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
