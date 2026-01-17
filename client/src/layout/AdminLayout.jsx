import { NavLink, Outlet } from "react-router-dom";
import TopNav from "../components/TopNav";
export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <TopNav />

      <div className="bg-neutral-100 border-b">
        <div className="mx-auto max-w-5xl px-4 py-2 flex gap-4 text-sm">
          <NavLink to="/admin/carts">Admin Carts</NavLink>
          <NavLink to="/admin/events">Admin Events</NavLink>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
