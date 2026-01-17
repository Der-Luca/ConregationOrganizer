import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SelectRole() {
  const { setRole } = useAuth();
  const navigate = useNavigate();

  function choose(role) {
    setRole(role);
    navigate(role === "admin" ? "/admin/carts" : "/user/carts");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="bg-white rounded-2xl border p-6 space-y-4 w-full max-w-sm">
        <h1 className="text-lg font-semibold text-center">
          JWCO Demo
        </h1>

        <button
          onClick={() => choose("admin")}
          className="w-full rounded-xl bg-neutral-900 text-white py-2"
        >
          Als Admin starten
        </button>

        <button
          onClick={() => choose("user")}
          className="w-full rounded-xl border py-2"
        >
          Als User starten
        </button>
      </div>
    </div>
  );
}
