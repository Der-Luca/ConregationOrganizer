import { NavLink, Outlet } from "react-router-dom";
import TopNav from "../components/TopNav";
export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <TopNav />

      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 py-3 flex gap-6 text-sm">
          <NavLink
            to="/admin/carts"
            className={({ isActive }) =>
              `font-medium ${isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}`
            }
          >
            Admin Carts
          </NavLink>
          <NavLink
            to="/admin/events"
            className={({ isActive }) =>
              `font-medium ${isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}`
            }
          >
            Admin Events
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `font-medium ${isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}`
            }
          >
            Admin Users
          </NavLink>
          <NavLink
            to="/admin/stats"
            className={({ isActive }) =>
              `font-medium ${isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}`
            }
          >
            Admin Stats
          </NavLink>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
