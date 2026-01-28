import { useState, useEffect } from "react";
import moment from "moment";

export default function BookingModal({ isOpen, onClose, selectedSlot, carts, users, onSubmit }) {
  const [cartId, setCartId] = useState("");
  const [participantIds, setParticipantIds] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableCarts, setAvailableCarts] = useState([]);

  useEffect(() => {
    if (selectedSlot) {
      // Pre-fill times from selected slot
      setStartTime(moment(selectedSlot.start).format("YYYY-MM-DDTHH:mm"));
      setEndTime(moment(selectedSlot.end).format("YYYY-MM-DDTHH:mm"));
    }
  }, [selectedSlot]);

  useEffect(() => {
    // Load available carts when times change
    if (startTime && endTime) {
      checkAvailability();
    }
  }, [startTime, endTime]);

  async function checkAvailability() {
    try {
      const res = await fetch(
        `/api/bookings/available-slots?start_datetime=${new Date(startTime).toISOString()}&end_datetime=${new Date(endTime).toISOString()}`
      );
      const data = await res.json();
      setAvailableCarts(data);
    } catch (err) {
      console.error("Error checking availability:", err);
    }
  }

  function handleParticipantToggle(userId) {
    if (participantIds.includes(userId)) {
      setParticipantIds(participantIds.filter((id) => id !== userId));
    } else {
      if (participantIds.length >= 2) {
        setError("Maximal 2 Teilnehmer pro Buchung");
        return;
      }
      setParticipantIds([...participantIds, userId]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (participantIds.length === 0) {
      setError("Bitte mindestens einen Teilnehmer auswählen");
      setLoading(false);
      return;
    }

    try {
      await onSubmit({
        cart_id: cartId,
        participant_ids: participantIds,
        start_datetime: new Date(startTime).toISOString(),
        end_datetime: new Date(endTime).toISOString(),
      });
    } catch (err) {
      setError(err?.response?.data?.detail || "Fehler beim Erstellen der Buchung");
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Neue Buchung</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Time Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Zeitraum</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-neutral-600">Von</label>
                <input
                  type="datetime-local"
                  className="border rounded px-3 py-2 w-full"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-neutral-600">Bis</label>
                <input
                  type="datetime-local"
                  className="border rounded px-3 py-2 w-full"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Cart Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Cart wählen</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={cartId}
              onChange={(e) => setCartId(e.target.value)}
              required
            >
              <option value="">-- Bitte wählen --</option>
              {carts
                .filter((c) => c.active)
                .map((cart) => {
                  const available = availableCarts.find((ac) => ac.cart_id === cart.id);
                  const slots = available ? available.available_slots : "?";
                  return (
                    <option key={cart.id} value={cart.id}>
                      {cart.name} ({cart.location}) - {slots} freie Slots
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Participant Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Teilnehmer (max. 2)
            </label>
            <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={participantIds.includes(user.id)}
                    onChange={() => handleParticipantToggle(user.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">
                    {user.firstname} {user.lastname}
                    <span className="text-neutral-500 ml-1">({user.email})</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="text-xs text-neutral-600">
              {participantIds.length} von 2 ausgewählt
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded hover:bg-neutral-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? "Wird erstellt..." : "Buchen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}