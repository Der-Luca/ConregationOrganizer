import { useEffect, useState } from "react";
import api from "../../api";

export default function CartSessionModal({ isOpen, onClose, onSaved, editSession }) {
  const [carts, setCarts] = useState([]);
  const [stats, setStats] = useState([]);
  const [cartId, setCartId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]); // [{user_id, is_captain}]
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [absences, setAbsences] = useState([]);

  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hours = String(Math.floor(i / 4)).padStart(2, "0");
    const minutes = String((i % 4) * 15).padStart(2, "0");
    return `${hours}:${minutes}`;
  });

  useEffect(() => {
    if (!isOpen) return;
    api.get("/carts").then((res) => setCarts(res.data.filter((c) => c.active)));
    const year = new Date().getFullYear();
    api
      .get(`/cart-sessions/stats?year=${year}`)
      .then((res) => setStats(res.data))
      .catch(() => setStats([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !date) {
      setAbsences([]);
      return;
    }
    api
      .get(`/absences/calendar?date=${date}`)
      .then((res) => setAbsences(res.data || []))
      .catch(() => setAbsences([]));
  }, [isOpen, date]);

  useEffect(() => {
    if (!isOpen) return;
    if (editSession) {
      setCartId(editSession.cart_id);
      setDate(editSession.date);
      setStartTime(editSession.start_time?.slice(0, 5) || "");
      setEndTime(editSession.end_time?.slice(0, 5) || "");
      setSelectedUsers(
        (editSession.assignments || []).map((a) => ({
          user_id: a.user_id,
          is_captain: a.is_captain,
        }))
      );
    } else {
      setCartId("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setSelectedUsers([]);
    }
    setError("");
  }, [isOpen, editSession]);

  function toggleUser(userId) {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.user_id === userId);
      if (exists) return prev.filter((u) => u.user_id !== userId);
      if (prev.length >= 4) return prev;
      return [...prev, { user_id: userId, is_captain: false }];
    });
  }

  function setCaptain(userId) {
    const target = userList.find((u) => u.user_id === userId);
    if (target?.gender && target.gender !== "male") {
      alert("No es posible. Necesitas un hombre como capitán.");
      return;
    }
    setSelectedUsers((prev) =>
      prev.map((u) => ({
        ...u,
        is_captain: u.user_id === userId,
      }))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (editSession) {
        // Update session details
        await api.put(`/cart-sessions/${editSession.id}`, {
          date,
          start_time: startTime + ":00",
          end_time: endTime + ":00",
        });

        // Sync assignments: remove old, add new
        const oldIds = new Set((editSession.assignments || []).map((a) => a.user_id));
        const newIds = new Set(selectedUsers.map((u) => u.user_id));

        // Remove assignments no longer selected
        for (const a of editSession.assignments || []) {
          if (!newIds.has(a.user_id)) {
            await api.delete(`/cart-sessions/${editSession.id}/assignments/${a.id}`);
          }
        }

        // Add new assignments
        for (const u of selectedUsers) {
          if (!oldIds.has(u.user_id)) {
            await api.post(`/cart-sessions/${editSession.id}/assignments`, {
              user_id: u.user_id,
              is_captain: u.is_captain,
            });
          }
        }
      } else {
        await api.post("/cart-sessions", {
          cart_id: cartId,
          date,
          start_time: startTime + ":00",
          end_time: endTime + ":00",
          assignments: selectedUsers,
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al guardar";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  // Merge stats with user info for display
  const userList = stats.map((s) => {
    const selected = selectedUsers.some((u) => u.user_id === s.user_id);
    const isCaptain = selectedUsers.find((u) => u.user_id === s.user_id)?.is_captain || false;

    let isAbsent = false;
    if (date && startTime && endTime) {
      const sessionStart = new Date(`${date}T${startTime}:00`);
      const sessionEnd = new Date(`${date}T${endTime}:00`);
      isAbsent = absences.some((a) => {
        if (a.user_id !== s.user_id) return false;
        const aStart = new Date(a.start_datetime);
        const aEnd = new Date(a.end_datetime);
        return aStart <= sessionEnd && aEnd >= sessionStart;
      });
    }

    return {
      ...s,
      selected,
      isCaptain,
      isAbsent,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editSession ? "Editar Sesión" : "Nueva Sesión"}
          </h2>

          {error && (
            <div className="text-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              {error}
            </div>
          )}

          {/* Cart selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">P-Poc</label>
            <select
              className="border rounded-lg px-3 py-2 w-full"
              value={cartId}
              onChange={(e) => setCartId(e.target.value)}
              required
              disabled={!!editSession}
            >
              <option value="">Seleccionar P-Poc...</option>
              {carts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.location ? `(${c.location})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="time"
                list="time-options-start"
                step="60"
                className="border rounded-lg px-3 py-2 w-full"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <datalist id="time-options-start">
                {timeOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="time"
                list="time-options-end"
                step="60"
                className="border rounded-lg px-3 py-2 w-full"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
              <datalist id="time-options-end">
                {timeOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          {/* User assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asignar publicadores (máx. 4)
            </label>
            <div className="border rounded-lg max-h-60 overflow-y-auto divide-y">
              {userList.length === 0 && (
                <div className="p-3 text-sm text-gray-400">Cargando usuarios...</div>
              )}
              {userList.map((u) => (
                <div
                  key={u.user_id}
                  className={`flex items-center justify-between px-3 py-2 ${
                    u.selected ? "bg-blue-50" : ""
                  } ${u.isAbsent ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"}`}
                  onClick={() => {
                    if (u.isAbsent) return;
                    toggleUser(u.user_id);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={u.selected}
                      onChange={() => {
                        if (u.isAbsent) return;
                        toggleUser(u.user_id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded"
                      disabled={u.isAbsent}
                    />
                    <span className="text-sm text-gray-900">
                      {u.firstname} {u.lastname}
                    </span>
                    {u.gender && (
                      <span className="text-xs text-gray-400">
                        {u.gender === "male" ? "♂" : "♀"}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">({u.count})</span>
                    {u.isAbsent && (
                      <span className="text-xs text-gray-500">Ausente</span>
                    )}
                  </div>
                  {u.selected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaptain(u.user_id);
                      }}
                      className={`text-xs px-2 py-0.5 rounded ${
                        u.isCaptain
                          ? "bg-yellow-100 text-yellow-700 font-medium"
                          : "bg-gray-100 text-gray-500 hover:bg-yellow-50"
                      }`}
                      title="Marcar como capitán"
                    >
                      {u.isCaptain ? "★ Capitán" : "Capitán"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Guardando..." : editSession ? "Guardar Cambios" : "Crear Sesión"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
