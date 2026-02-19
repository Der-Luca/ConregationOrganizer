import { useEffect, useMemo, useState } from "react";
import api from "../../api";

export default function Absences() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const timeOptions = useMemo(
    () =>
      Array.from({ length: 24 * 4 }, (_, i) => {
        const hours = String(Math.floor(i / 4)).padStart(2, "0");
        const minutes = String((i % 4) * 15).padStart(2, "0");
        return `${hours}:${minutes}`;
      }),
    []
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/absences");
      setItems(res.data || []);
    } catch (err) {
      const msg = err?.response?.data?.detail || "No se pudieron cargar las ausencias";
      setError(typeof msg === "string" ? msg : "No se pudieron cargar las ausencias");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    if (!startDate || !startTime || !endDate || !endTime) {
      setError("Completa fecha y hora de inicio y fin.");
      return;
    }

    const start = `${startDate}T${startTime}:00`;
    const end = `${endDate}T${endTime}:00`;

    try {
      await api.post("/absences", {
        start_datetime: start,
        end_datetime: end,
        reason: reason || null,
      });
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setReason("");
      load();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError("Datos inválidos. Revisa fecha y hora.");
      } else {
        const msg = detail || "No se pudo guardar la ausencia";
        setError(typeof msg === "string" ? msg : "No se pudo guardar la ausencia");
      }
    }
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar esta ausencia?")) return;
    try {
      await api.delete(`/absences/${id}`);
      load();
    } catch (err) {
      const msg = err?.response?.data?.detail || "No se pudo eliminar la ausencia";
      alert(typeof msg === "string" ? msg : "No se pudo eliminar la ausencia");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Planificador de Ausencias</h1>
        <p className="text-sm text-gray-500">Marca tu disponibilidad para evitar asignaciones.</p>
      </div>

      <form onSubmit={handleCreate} className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm space-y-4">
        {error && (
          <div className="text-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <input
                type="time"
                list="absence-time-start"
                step="60"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <datalist id="absence-time-start">
                {timeOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
              <input
                type="time"
                list="absence-time-end"
                step="60"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
              <datalist id="absence-time-end">
                {timeOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
          <input
            type="text"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Vacaciones, trabajo..."
          />
        </div>

        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black"
        >
          Guardar Ausencia
        </button>
      </form>

      <div className="border border-gray-200 rounded-2xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">Tus Ausencias</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Desde</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hasta</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Motivo</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={4}>
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={4}>
                    No hay ausencias registradas.
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-4 text-gray-700">
                      {new Date(item.start_datetime).toLocaleString()}
                    </td>
                    <td className="p-4 text-gray-700">
                      {new Date(item.end_datetime).toLocaleString()}
                    </td>
                    <td className="p-4 text-gray-500">{item.reason || "-"}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-sm text-red-600 hover:text-red-700 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
