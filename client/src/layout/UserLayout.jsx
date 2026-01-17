import { NavLink, Outlet } from "react-router-dom";

export default function UserLayout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex gap-4">
          <NavLink to="/user/carts">Carts</NavLink>
          <NavLink to="/user/events">Events</NavLink>
          <NavLink to="/user/bookings">Buchungen</NavLink>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
