import { Outlet } from "react-router-dom";
import TopNav from "../components/TopNav";

export default function UserLayout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <TopNav />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
