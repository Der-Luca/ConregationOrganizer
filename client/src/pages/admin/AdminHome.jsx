import { Link } from "react-router-dom";

const TILES = [
  {
    id: "carts",
    title: "Carritos",
    description: "Administrar carritos y ubicaciones",
    to: "/admin/carts",
  },
  {
    id: "users",
    title: "Usuarios",
    description: "Gestionar usuarios y roles",
    to: "/admin/users",
  },
  {
    id: "stats",
    title: "Estadísticas",
    description: "Ver reportes y métricas",
    to: "/admin/stats",
  },
];

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="text-sm text-gray-500">
          Accede a las secciones administrativas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((tile) => (
          <Link
            key={tile.id}
            to={tile.to}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-800">
                  {tile.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{tile.description}</p>
              </div>
              <span className="text-gray-300 group-hover:text-gray-500">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
