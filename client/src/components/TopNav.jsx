import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  // Ref für das Dropdown, um Klicks außerhalb zu erkennen
  const dropdownRef = useRef(null);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  // Schließt das Dropdown, wenn man außerhalb klickt
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helfer für NavLink Styles (zeigt aktiven Tab an)
  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
    }`;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* LEFT: Logo & Brand */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                D
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">Dashboard</span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-6">
              <NavLink to="/user" end className={navLinkClass}>Inicio</NavLink>
              <NavLink to="/user/carts" className={navLinkClass}>Carts</NavLink>
              <NavLink to="/user/events" className={navLinkClass}>Events</NavLink>
              <NavLink to="/user/bookings" className={navLinkClass}>Bookings</NavLink>
              <NavLink to="/user/meeting-points" className={navLinkClass}>Puntos de Encuentro</NavLink>

              {user?.roles?.includes("admin") && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      isActive ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`
                  }
                >
                  Admin Panel
                </NavLink>
              )}
            </div>
          </div>

          {/* RIGHT: User Profile Dropdown */}
          <div className="flex items-center gap-4">
            
            {/* Desktop User Dropdown */}
            <div className="hidden md:relative md:block" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-3 focus:outline-none group"
              >
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {user?.username || "User"}
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {user?.roles?.join(", ") || "Member"}
                  </p>
                </div>
                {/* Avatar Circle */}
                <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 group-hover:ring-2 ring-blue-100 transition-all">
                  <span className="text-lg font-semibold">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              </button>

              {/* The Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 origin-top-right animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-3 border-b border-gray-50 md:hidden">
                    <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
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

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-600 rounded-md hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                // Close Icon
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                // Hamburger Icon
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 pt-4 pb-2 space-y-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</p>
            <NavLink to="/user" end onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-md text-base font-medium ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>
              Inicio
            </NavLink>
            <NavLink to="/user/carts" onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-md text-base font-medium ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>
              Carts
            </NavLink>
            <NavLink to="/user/events" onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-md text-base font-medium ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>
              Events
            </NavLink>
            <NavLink to="/user/bookings" onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-md text-base font-medium ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>
              Bookings
            </NavLink>
            <NavLink to="/user/meeting-points" onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-md text-base font-medium ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>
              Puntos de Encuentro
            </NavLink>

            {user?.roles?.includes("admin") && (
              <NavLink to="/admin" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 bg-gray-100 mt-2">
                Admin Panel
              </NavLink>
            )}
          </div>
          
          <div className="border-t border-gray-100 pt-4 pb-4 px-4 mt-2 bg-gray-50">
            <div className="flex items-center px-3 mb-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">{user?.username}</div>
                <div className="text-sm font-medium text-gray-500">{user?.roles?.join(", ")}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}