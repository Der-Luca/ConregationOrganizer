import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex gap-4">
          <NavLink to="/admin/carts">Carts</NavLink>
          <NavLink to="/admin/events">Events</NavLink>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
