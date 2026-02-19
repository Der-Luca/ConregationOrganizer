import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const TILES = [
  {
    id: "agenda",
    title: "Agenda",
    description: "Calendario con puntos y asignaciones",
    to: "/user/agenda",
  },
  {
    id: "assignments",
    title: "Mis asignaciones",
    description: "Aceptar o rechazar turnos",
    to: "/user/my-assignments",
  },
  {
    id: "talk-media",
    title: "Medios del discurso",
    description: "Archivos para el discurso",
    to: "/user/talk-media",
    roles: ["talk_assistant", "admin"],
  },
  {
    id: "meeting-points",
    title: "Planificador de puntos",
    description: "Crear y editar puntos de reunión",
    to: "/user/meeting-points",
    roles: ["fieldserviceplanner", "admin"],
  },
  {
    id: "cart-schedule",
    title: "Planificación de P-Poc",
    description: "Gestionar sesiones y asignaciones",
    to: "/user/cart-schedule",
    roles: ["cartplanner", "admin"],
  },
  {
    id: "admin",
    title: "Administración",
    description: "Usuarios, P-Poc y estadísticas",
    to: "/admin",
    roles: ["admin"],
  },
];

function hasRole(userRoles, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.some((role) => userRoles?.includes(role));
}

export default function Home() {
  const { user } = useAuth();
  const roles = user?.roles || [];

  const visibleTiles = TILES.filter((tile) => hasRole(roles, tile.roles));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
        <p className="text-sm text-gray-500">
          Accede rápido a tus secciones principales.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleTiles.map((tile) => (
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
