import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, requireRole }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole) {
    const roles = user?.roles || [];
    // admin has access to everything
    if (!roles.includes(requireRole) && !roles.includes("admin")) {
      return <Navigate to="/user" replace />;
    }
  }

  return children;
}
