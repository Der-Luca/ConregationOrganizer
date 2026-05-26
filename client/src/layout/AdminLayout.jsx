import { Outlet } from "react-router-dom";
import TopNav from "../components/TopNav";
import { useBgImage } from "../hooks/useBgImage";

export default function AdminLayout() {
  const bgImage = useBgImage("app");

  return (
    <div
      className="min-h-screen bg-neutral-50 transition-all duration-700"
      style={
        bgImage
          ? {
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : {}
      }
    >
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
