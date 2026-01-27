import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api";

export default function Register() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userFirstname, setUserFirstname] = useState("");
  const [error, setError] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await api.get(`/register/${token}`);
        if (res.data.valid) {
          setTokenValid(true);
          setUserFirstname(res.data.user_firstname);
        } else {
          setError(res.data.error || "Invalid invitation link");
        }
      } catch {
        setError("Failed to validate invitation link");
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters");
      return;
    }

    if (password !== passwordConfirm) {
      setSubmitError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/register/${token}`, {
        password,
        password_confirm: passwordConfirm,
      });
      setSuccess(true);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Registration failed";
      setSubmitError(typeof msg === "string" ? msg : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="text-black/60">Validating invitation...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white w-full max-w-sm rounded-xl p-6 space-y-4 border text-center">
          <div className="text-green-600 text-4xl mb-2">✓</div>
          <h1 className="text-xl font-semibold">Registration Complete!</h1>
          <p className="text-sm text-black/60">
            Your account is ready. You can now log in with your credentials.
          </p>
          <Link
            to="/login"
            className="block bg-black text-white px-4 py-2 rounded w-full text-center"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white w-full max-w-sm rounded-xl p-6 space-y-4 border text-center">
          <div className="text-red-500 text-4xl mb-2">!</div>
          <h1 className="text-xl font-semibold">Invalid Invitation</h1>
          <p className="text-sm text-black/60">{error}</p>
          <p className="text-sm text-black/40">
            Please contact your administrator for a new invitation link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-sm rounded-xl p-6 space-y-4 border"
      >
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Welcome, {userFirstname}!</h1>
          <p className="text-sm text-black/60">
            Set your password to complete registration.
          </p>
        </div>

        {submitError && (
          <div className="text-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            {submitError}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            className="border rounded px-3 py-2 w-full"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Confirm Password</label>
          <input
            type="password"
            className="border rounded px-3 py-2 w-full"
            placeholder="Repeat your password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white px-4 py-2 rounded w-full disabled:opacity-60"
        >
          {submitting ? "Registering..." : "Complete Registration"}
        </button>
      </form>
    </div>
  );
}
