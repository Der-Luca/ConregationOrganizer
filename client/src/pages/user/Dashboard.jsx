import { useEffect, useState, useCallback, useMemo } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";

moment.locale("es");
const localizer = momentLocalizer(moment);

function toMonthStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => toMonthStr(new Date()));
  const [meetingPoints, setMeetingPoints] = useState([]);
  const [cartSessions, setCartSessions] = useState([]);
  const [calView, setCalView] = useState("month");
  const [calDate, setCalDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const currentUserId = user?.id;

  const fetchData = useCallback(() => {
    Promise.all([
      api.get(`/meeting-points?month=${month}`),
      api.get("/cart-sessions/my-assignments"),
    ])
      .then(([meetingRes, cartRes]) => {
        setMeetingPoints(meetingRes.data || []);
        setCartSessions(cartRes.data || []);
      })
      .catch(() => {
        setMeetingPoints([]);
        setCartSessions([]);
      });
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleCalNavigate(newDate) {
    setCalDate(newDate);
    const newMonth = toMonthStr(newDate);
    if (newMonth !== month) setMonth(newMonth);
  }

  function handleExportPDF() {
    api
      .get(`/meeting-points/export?month=${month}`, { responseType: "blob" })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `puntos_encuentro_${month}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => alert("Error al exportar PDF"));
  }

  const calendarEvents = useMemo(() => {
    const meetingEvents = meetingPoints.map((item) => {
      const [h, min] = (item.time || "00:00").split(":").map(Number);
      const start = new Date(item.date + "T00:00:00");
      start.setHours(h, min);
      const end = new Date(start);
      end.setHours(h + 1, min);
      const isMine =
        currentUserId && item.conductor_id && item.conductor_id === currentUserId;
      return {
        id: `meeting-${item.id}`,
        title: `${item.time?.slice(0, 5)} ${item.location}`,
        start,
        end,
        resource: { ...item, type: "meeting" },
        isMine,
        type: "meeting",
      };
    });

    const cartEvents = cartSessions.map((session) => {
      const [sh, sm] = (session.start_time || "00:00").split(":").map(Number);
      const [eh, em] = (session.end_time || "00:00").split(":").map(Number);
      const start = new Date(session.date + "T00:00:00");
      start.setHours(sh, sm);
      const end = new Date(session.date + "T00:00:00");
      end.setHours(eh, em);
      return {
        id: `cart-${session.id}`,
        title: `${session.start_time?.slice(0, 5)} P-Poc: ${session.cart_name}`,
        start,
        end,
        resource: { ...session, type: "cart" },
        isMine: true,
        type: "cart",
      };
    });

    return [...meetingEvents, ...cartEvents];
  }, [meetingPoints, cartSessions, currentUserId]);

  function eventStyleGetter(event) {
    if (event.type === "cart") {
      return {
        style: {
          backgroundColor: "#f59e0b",
          borderColor: "#d97706",
          color: "#1f2937",
          borderRadius: "4px",
          fontSize: "12px",
        },
      };
    }

    if (event.isMine) {
      return {
        style: {
          backgroundColor: "#16a34a",
          borderColor: "#15803d",
          color: "#fff",
          borderRadius: "4px",
          fontSize: "12px",
        },
      };
    }

    return {
      style: {
        backgroundColor: "#9ca3af",
        borderColor: "#6b7280",
        color: "#111827",
        borderRadius: "4px",
        fontSize: "12px",
      },
    };
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consideraciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Calendario de asignaciones y puntos de reunión
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-400 inline-block" /> Consideraciones
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-600 inline-block" /> Mi punto asignado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> P-Poc asignado
            </span>
          </div>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Calendar */}
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
          onSelectEvent={(event) => setSelectedEvent(event.resource)}
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
            noEventsInRange: "Sin actividades en este rango",
            showMore: (n) => `+${n} más`,
          }}
          style={{ height: 600 }}
          popup
        />
      </div>

      {/* Detail popup */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle</h3>
            {selectedEvent.type === "cart" ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Fecha</dt>
                  <dd className="text-gray-900">
                    {new Date(selectedEvent.date + "T00:00:00").toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Horario</dt>
                  <dd className="text-gray-900">
                    {selectedEvent.start_time?.slice(0, 5)} - {selectedEvent.end_time?.slice(0, 5)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">P-Poc</dt>
                  <dd className="text-gray-900">{selectedEvent.cart_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Asignados</dt>
                  <dd className="text-gray-900 text-right">
                    {(selectedEvent.assignments || [])
                      .map((a) => `${a.firstname} ${a.lastname}`)
                      .join(", ") || "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Fecha</dt>
                  <dd className="text-gray-900">
                    {new Date(selectedEvent.date + "T00:00:00").toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Hora</dt>
                  <dd className="text-gray-900">{selectedEvent.time?.slice(0, 5)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Lugar</dt>
                  <dd className="text-gray-900">{selectedEvent.location}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Director</dt>
                  <dd className="text-gray-900">
                    {selectedEvent.conductor_name || "—"}
                    {currentUserId &&
                      selectedEvent.conductor_id === currentUserId && (
                        <span className="ml-2 text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                          Tú
                        </span>
                      )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tema</dt>
                  <dd className="text-gray-900">{selectedEvent.outline || "—"}</dd>
                </div>
                {selectedEvent.link && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Enlace</dt>
                    <dd>
                      <a
                        href={selectedEvent.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Abrir
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
            <button
              onClick={() => setSelectedEvent(null)}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
