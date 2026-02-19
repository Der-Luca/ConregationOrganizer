import { useEffect, useState, useCallback, useMemo } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";
import CartSessionModal from "./CartSessionModal";

moment.locale("es");
const localizer = momentLocalizer(moment);

function toMonthStr(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const STATUS_BADGES = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pendiente" },
  accepted: { bg: "bg-green-100", text: "text-green-700", label: "Aceptado" },
  declined: { bg: "bg-red-100", text: "text-red-700", label: "Rechazado" },
};

export default function CartSchedule() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => toMonthStr(new Date()));
  const [sessions, setSessions] = useState([]);
  const [activeView, setActiveView] = useState("table");
  const [calView, setCalView] = useState("month");
  const [calDate, setCalDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editSession, setEditSession] = useState(null);

  const canPlan =
    user?.roles?.includes("cartplanner") ||
    user?.roles?.includes("admin");

  const currentUserId = user?.id;

  const fetchData = useCallback(() => {
    api
      .get(`/cart-sessions?month=${month}`)
      .then((res) => setSessions(res.data))
      .catch(() => setSessions([]));
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleCalNavigate(newDate) {
    setCalDate(newDate);
    const newMonth = toMonthStr(newDate);
    if (newMonth !== month) setMonth(newMonth);
  }

  function shiftMonth(delta) {
    const [y, m] = month.split("-").map(Number);
    let newMonth = m + delta;
    let newYear = y;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    else if (newMonth < 1) { newMonth = 12; newYear--; }
    const str = `${newYear}-${String(newMonth).padStart(2, "0")}`;
    setMonth(str);
    setCalDate(new Date(newYear, newMonth - 1, 1));
  }

  function handleCreate() {
    setEditSession(null);
    setModalOpen(true);
  }

  function handleEdit(session) {
    setEditSession(session);
    setModalOpen(true);
  }

  async function handleDelete(sessionId) {
    if (!confirm("¿Eliminar esta sesión?")) return;
    try {
      await api.delete(`/cart-sessions/${sessionId}`);
      fetchData();
    } catch {
      alert("Error al eliminar");
    }
  }

  function getSessionColor(session) {
    if (!session.assignments || session.assignments.length === 0) return "gray";
    const hasDeclined = session.assignments.some((a) => a.status === "declined");
    if (hasDeclined) return "red";
    const allAccepted = session.assignments.every((a) => a.status === "accepted");
    if (allAccepted) return "green";
    return "yellow";
  }

  const [y, m] = month.split("-").map(Number);
  const displayMonth = `${MONTH_NAMES[m]} ${y}`;

  const calendarEvents = useMemo(
    () =>
      sessions.map((session) => {
        const start = new Date(`${session.date}T${session.start_time}`);
        const end = new Date(`${session.date}T${session.end_time}`);
        const color = getSessionColor(session);
        const isMine = session.assignments?.some(
          (a) => a.user_id === currentUserId
        );
        return {
          id: session.id,
          title: `${session.start_time?.slice(0, 5)}-${session.end_time?.slice(0, 5)} ${session.cart_name}`,
          start,
          end,
          resource: session,
          color,
          isMine,
        };
      }),
    [sessions, currentUserId]
  );

  const colorMap = {
    green: { bg: "#16a34a", border: "#15803d" },
    yellow: { bg: "#ca8a04", border: "#a16207" },
    red: { bg: "#dc2626", border: "#b91c1c" },
    gray: { bg: "#6b7280", border: "#4b5563" },
  };

  function eventStyleGetter(event) {
    const colors = colorMap[event.color] || colorMap.gray;
    return {
      style: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: "#fff",
        borderRadius: "4px",
        fontSize: "12px",
        border: event.isMine ? "2px solid #fff" : undefined,
        boxShadow: event.isMine ? "0 0 0 2px " + colors.bg : undefined,
      },
    };
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Planificación P-Poc</h1>
        <div className="flex items-center gap-2">
          {canPlan && (
            <>
              <button
                onClick={handleCreate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Nuevo
              </button>
              <button
                onClick={() => {
                  api
                    .get(`/cart-sessions/export?month=${month}`, { responseType: "blob" })
                    .then((res) => {
                      const url = window.URL.createObjectURL(new Blob([res.data]));
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `ppoc_${month}.pdf`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    })
                    .catch(() => alert("Error al exportar PDF"));
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Exportar PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Month selector + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => shiftMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-semibold text-gray-800 min-w-[180px] text-center">
            {displayMonth}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 mr-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-600 inline-block" /> Confirmado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-600 inline-block" /> Pendiente
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-600 inline-block" /> Rechazado
            </span>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView("table")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeView === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Tabla
            </button>
            <button
              onClick={() => setActiveView("calendar")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeView === "calendar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Calendario
            </button>
          </div>
        </div>
      </div>

      {/* Table view */}
      {activeView === "table" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Horario</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">P-Poc</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Asignados</th>
                  {canPlan && (
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={canPlan ? 5 : 4} className="px-4 py-8 text-center text-gray-400">
                      No hay sesiones para este mes
                    </td>
                  </tr>
                )}
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                      {new Date(session.date + "T00:00:00").toLocaleDateString("es-ES", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{session.cart_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {session.assignments?.map((a) => {
                          const badge = STATUS_BADGES[a.status] || STATUS_BADGES.pending;
                          const isMine = a.user_id === currentUserId;
                          return (
                            <span
                              key={a.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${badge.bg} ${badge.text} ${isMine ? "ring-2 ring-blue-300" : ""}`}
                            >
                              {a.firstname} {a.lastname}
                              {a.is_captain && (
                                <span className="font-bold" title="Capitán">★</span>
                              )}
                            </span>
                          );
                        })}
                        {(!session.assignments || session.assignments.length === 0) && (
                          <span className="text-gray-400 text-xs">Sin asignar</span>
                        )}
                      </div>
                    </td>
                    {canPlan && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleEdit(session)}
                          className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calendar view */}
      {activeView === "calendar" && (
        <div className="bg-white rounded-xl border border-gray-200 p-4" style={{ minHeight: 650 }}>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            view={calView}
            onView={setCalView}
            date={calDate}
            onNavigate={handleCalNavigate}
            views={["month", "week", "day"]}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(event) => {
              if (canPlan) {
                handleEdit(event.resource);
              }
            }}
            messages={{
              today: "Hoy",
              previous: "Anterior",
              next: "Siguiente",
              month: "Mes",
              week: "Semana",
              day: "Día",
              agenda: "Agenda",
              date: "Fecha",
              time: "Hora",
              event: "Evento",
              noEventsInRange: "Sin sesiones en este rango",
              showMore: (n) => `+${n} más`,
            }}
            style={{ height: 600 }}
            popup
          />
        </div>
      )}

      <CartSessionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchData}
        editSession={editSession}
      />
    </div>
  );
}
