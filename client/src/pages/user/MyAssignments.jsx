import { useEffect, useState } from "react";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";

const STATUS_LABELS = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pendiente" },
  accepted: { bg: "bg-green-100", text: "text-green-700", label: "Aceptado" },
  declined: { bg: "bg-red-100", text: "text-red-700", label: "Rechazado" },
};

export default function MyAssignments() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchAssignments() {
    try {
      const res = await api.get("/cart-sessions/my-assignments");
      setSessions(res.data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssignments();
  }, []);

  async function respond(assignmentId, status) {
    try {
      await api.patch(`/cart-sessions/assignments/${assignmentId}/respond`, { status });
      fetchAssignments();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error";
      alert(typeof msg === "string" ? msg : "Error al responder");
    }
  }

  const currentUserId = user?.id;

  // Separate pending and upcoming
  const pending = [];
  const upcoming = [];
  const past = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const session of sessions) {
    const myAssignment = session.assignments?.find((a) => a.user_id === currentUserId);
    if (!myAssignment) continue;

    const entry = { ...session, myAssignment };

    if (myAssignment.status === "pending") {
      pending.push(entry);
    } else if (session.date >= today) {
      upcoming.push(entry);
    } else {
      past.push(entry);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Mis Asignaciones</h1>

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            Pendientes
            <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pending.map((entry) => (
              <SessionCard
                key={entry.id}
                entry={entry}
                currentUserId={currentUserId}
                onAccept={() => respond(entry.myAssignment.id, "accepted")}
                onDecline={() => respond(entry.myAssignment.id, "declined")}
                showActions
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming accepted */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Próximas</h2>
          <div className="space-y-3">
            {upcoming.map((entry) => (
              <SessionCard
                key={entry.id}
                entry={entry}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 text-gray-400">Pasadas</h2>
          <div className="space-y-3 opacity-60">
            {past.map((entry) => (
              <SessionCard
                key={entry.id}
                entry={entry}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No tienes asignaciones
        </div>
      )}
    </div>
  );
}

function SessionCard({ entry, currentUserId, onAccept, onDecline, showActions }) {
  const badge = STATUS_LABELS[entry.myAssignment.status] || STATUS_LABELS.pending;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {new Date(entry.date + "T00:00:00").toLocaleDateString("es-ES", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {entry.start_time?.slice(0, 5)} – {entry.end_time?.slice(0, 5)} | {entry.cart_name}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {entry.assignments?.map((a) => (
              <span
                key={a.id}
                className={`text-xs px-2 py-0.5 rounded ${
                  a.user_id === currentUserId ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {a.firstname} {a.lastname}
                {a.is_captain && " ★"}
              </span>
            ))}
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onAccept}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Aceptar
            </button>
            <button
              onClick={onDecline}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
