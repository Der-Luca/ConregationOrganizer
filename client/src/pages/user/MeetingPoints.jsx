import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";
import MeetingPointModal from "./MeetingPointModal";

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

export default function MeetingPoints() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [month, setMonth] = useState(() => toMonthStr(new Date()));
  const [items, setItems] = useState([]);
  const [activeView, setActiveView] = useState("table"); // "table" | "calendar"
  const [calView, setCalView] = useState("month"); // react-big-calendar view
  const [calDate, setCalDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const canEdit =
    user?.roles?.includes("fieldserviceplanner") ||
    user?.roles?.includes("admin");

  const currentUserId = user?.id;

  const fetchData = useCallback(() => {
    api
      .get(`/meeting-points?month=${month}`)
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync month when calendar navigates
  function handleCalNavigate(newDate) {
    setCalDate(newDate);
    const newMonth = toMonthStr(newDate);
    if (newMonth !== month) setMonth(newMonth);
  }

  // Manual month arrows (for table view header)
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

  function handleEdit(item) {
    setEditData(item);
    setModalOpen(true);
  }

  function handleDelete(id) {
    if (!confirm("¿Eliminar este punto de encuentro?")) return;
    api.delete(`/meeting-points/${id}`).then(fetchData).catch(() => alert("Error al eliminar"));
  }

  function handleDeleteSeries(seriesId) {
    if (!confirm("¿Eliminar toda la serie?")) return;
    api.delete(`/meeting-points/series/${seriesId}`).then(fetchData).catch(() => alert("Error al eliminar serie"));
  }

  function handleCreate() {
    setEditData(null);
    setModalOpen(true);
  }

  const [y, m] = month.split("-").map(Number);
  const displayMonth = `${MONTH_NAMES[m]} ${y}`;

  // Calendar events with isMine flag
  const calendarEvents = useMemo(
    () =>
      items.map((item) => {
        const [h, min] = (item.time || "00:00").split(":").map(Number);
        const start = new Date(item.date + "T00:00:00");
        start.setHours(h, min);
        const end = new Date(start);
        end.setHours(h + 1, min);
        const isMine =
          currentUserId && item.conductor_id && item.conductor_id === currentUserId;
        return {
          id: item.id,
          title: `${item.time?.slice(0, 5)} ${item.location}${item.conductor_name ? ` — ${item.conductor_name}` : ""}`,
          start,
          end,
          resource: item,
          isMine,
        };
      }),
    [items, currentUserId]
  );

  // Color events: green if conductor is me, default blue otherwise
  function eventStyleGetter(event) {
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
        backgroundColor: "#2563eb",
        borderColor: "#1d4ed8",
        color: "#fff",
        borderRadius: "4px",
        fontSize: "12px",
      },
    };
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Puntos de Encuentro</h1>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Nuevo
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => navigate("/user/meeting-points/stats")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Estadísticas
            </button>
          )}
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Exportar PDF
          </button>
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
              <span className="w-3 h-3 rounded bg-green-600 inline-block" /> Mi asignación
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Otros
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Hora</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Lugar</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Director</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tema</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Enlace</th>
                  {canEdit && (
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="px-4 py-8 text-center text-gray-400">
                      No hay puntos de encuentro para este mes
                    </td>
                  </tr>
                )}
                {items.map((item) => {
                  const isMine =
                    currentUserId && item.conductor_id && item.conductor_id === currentUserId;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 transition-colors ${isMine ? "bg-green-50" : ""}`}
                    >
                      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                        {new Date(item.date + "T00:00:00").toLocaleDateString("es-ES", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {item.time?.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.location}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {item.conductor_name || "—"}
                        {isMine && (
                          <span className="ml-2 text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                            Tú
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.outline || "—"}</td>
                      <td className="px-4 py-3">
                        {item.link ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Ver
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800 text-sm mr-3"
                          >
                            Eliminar
                          </button>
                          {item.series_id && (
                            <button
                              onClick={() => handleDeleteSeries(item.series_id)}
                              className="text-orange-600 hover:text-orange-800 text-sm"
                            >
                              Eliminar serie
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
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
              if (canEdit) {
                handleEdit(event.resource);
              } else {
                setSelectedEvent(event.resource);
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
              noEventsInRange: "Sin eventos en este rango",
              showMore: (n) => `+${n} más`,
            }}
            style={{ height: 600 }}
            popup
          />
        </div>
      )}

      {/* Detail popup for non-editors */}
      {selectedEvent && !canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Fecha</dt>
                <dd className="text-gray-900">
                  {new Date(selectedEvent.date + "T00:00:00").toLocaleDateString("es-ES", {
                    weekday: "long", day: "2-digit", month: "long", year: "numeric",
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
                <dd className="text-gray-900">{selectedEvent.conductor_name || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Tema</dt>
                <dd className="text-gray-900">{selectedEvent.outline || "—"}</dd>
              </div>
              {selectedEvent.link && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Enlace</dt>
                  <dd>
                    <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Abrir
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <button
              onClick={() => setSelectedEvent(null)}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <MeetingPointModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchData}
        editData={editData}
      />
    </div>
  );
}
