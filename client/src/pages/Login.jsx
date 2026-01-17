import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, user, loading, isAuthenticated } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await login(identifier, password); // identifier = email OR username
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Login failed. Please check your credentials and try again.";
      setError(typeof msg === "string" ? msg : "Login failed.");
    }
  }

  // Redirect as soon as auth state is available
useEffect(() => {
  if (!isAuthenticated || !user?.role) return;
  navigate("/user", { replace: true });
}, [isAuthenticated, user, navigate]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-sm rounded-xl p-6 space-y-4 border"
      >
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Login</h1>
          <p className="text-sm text-black/60">
            Sign in with your email or username.
          </p>
        </div>

        {error && (
          <div className="text-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Email or Username</label>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="e.g. system@jwco.local or congregation-admin"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            className="border rounded px-3 py-2 w-full"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded w-full disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="text-xs text-black/50">
          Tip: Use your username (e.g. <span className="font-mono">congregation-admin</span>) for local setups.
        </div>
      </form>
    </div>
  );
}
