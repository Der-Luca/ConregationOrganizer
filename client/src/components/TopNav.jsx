import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ROLE_LABELS = {
    admin: "Administrador",
    cartplanner: "Planificador de carritos",
    fieldserviceplanner: "Planificador de servicio",
    publisher: "Publicador",
  };

  const roleLabel = (user?.roles || [])
    .map((r) => ROLE_LABELS[r] || r)
    .join(", ") || "Usuario";

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* LEFT: Logo & Brand */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                C
              </div>
              <span className="font-semibold text-lg tracking-tight text-gray-900">
                Congregation Organizer
              </span>
            </div>
          </div>

          {/* RIGHT: User Profile Dropdown */}
          <div className="flex items-center gap-4">

            {/* Desktop User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-3 focus:outline-none group"
              >
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                    {user?.username || "User"}
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {roleLabel}
                  </p>
                </div>
                {/* Avatar Circle */}
                <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 group-hover:border-gray-300 transition-all">
                  <span className="text-lg font-semibold">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              </button>

              {/* The Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-sm border border-gray-200 py-1 origin-top-right animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                    <p className="text-xs text-gray-500 truncate">{roleLabel}</p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
