import { useState, useEffect, useMemo } from "react";
import api from "../../api";

export default function MeetingPointModal({ isOpen, onClose, onSaved, editData }) {
  const [isSeries, setIsSeries] = useState(false);
  const [users, setUsers] = useState([]);
  const [conductorStats, setConductorStats] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    date: "",
    time: "",
    location: "",
    conductor_id: "",
    outline: "",
    link: "",
    // Series fields
    start_date: "",
    end_date: "",
    recurrence: "weekly",
  });

  useEffect(() => {
    if (isOpen) {
      api.get("/users/bookable-users").then((res) => setUsers(res.data)).catch(() => {});
      const currentYear = new Date().getFullYear();
      api.get(`/meeting-points/stats?year=${currentYear}`).then((res) => setConductorStats(res.data)).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      setIsSeries(false);
      setForm({
        date: editData.date || "",
        time: editData.time?.slice(0, 5) || "",
        location: editData.location || "",
        conductor_id: editData.conductor_id || "",
        outline: editData.outline || "",
        link: editData.link || "",
        start_date: "",
        end_date: "",
        recurrence: "weekly",
      });
    } else {
      setForm({
        date: "",
        time: "",
        location: "",
        conductor_id: "",
        outline: "",
        link: "",
        start_date: "",
        end_date: "",
        recurrence: "weekly",
      });
      setIsSeries(false);
    }
  }, [editData, isOpen]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editData) {
        await api.put(`/meeting-points/${editData.id}`, {
          date: form.date || undefined,
          time: form.time || undefined,
          location: form.location || undefined,
          conductor_id: form.conductor_id || null,
          outline: form.outline || null,
          link: form.link || null,
        });
      } else if (isSeries) {
        await api.post("/meeting-points/series", {
          start_date: form.start_date,
          end_date: form.end_date,
          recurrence: form.recurrence,
          time: form.time,
          location: form.location,
          conductor_id: form.conductor_id || null,
          outline: form.outline || null,
          link: form.link || null,
        });
      } else {
        await api.post("/meeting-points", {
          date: form.date,
          time: form.time,
          location: form.location,
          conductor_id: form.conductor_id || null,
          outline: form.outline || null,
          link: form.link || null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  const sortedUsers = useMemo(() => {
    if (conductorStats.length === 0) return users;
    const statsMap = {};
    conductorStats.forEach((s) => { statsMap[s.user_id] = s.count; });
    return users
      .map((u) => ({ ...u, statsCount: statsMap[u.id] ?? null }))
      .sort((a, b) => (a.statsCount ?? Infinity) - (b.statsCount ?? Infinity));
  }, [users, conductorStats]);

  if (!isOpen) return null;

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {editData ? "Editar Punto de Encuentro" : "Nuevo Punto de Encuentro"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Series toggle (only for new) */}
          {!editData && (
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSeries}
                  onChange={() => setIsSeries(!isSeries)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm text-gray-700">Serie recurrente</span>
            </div>
          )}

          {/* Date fields */}
          {isSeries && !editData ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Fecha inicio</label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha fin</label>
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Recurrencia</label>
                <select
                  name="recurrence"
                  value={form.recurrence}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className={labelClass}>Fecha</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required={!editData}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Hora</label>
            <input
              type="time"
              name="time"
              value={form.time}
              onChange={handleChange}
              required={!editData}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Lugar</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              required={!editData}
              placeholder="Ej: Plaza Central"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Director</label>
            <select
              name="conductor_id"
              value={form.conductor_id}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">— Sin asignar —</option>
              {sortedUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstname} {u.lastname}{u.statsCount != null ? ` (${u.statsCount})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Tema</label>
            <input
              type="text"
              name="outline"
              value={form.outline}
              onChange={handleChange}
              placeholder="Tema o descripción"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Enlace</label>
            <input
              type="url"
              name="link"
              value={form.link}
              onChange={handleChange}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
