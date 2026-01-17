import { useEffect, useState } from "react";
import api from "../../api";

export default function UserBookings() {
  const [carts, setCarts] = useState([]);
  const [users, setUsers] = useState([]); // Demo: später echtes Auth
  const [cartId, setCartId] = useState("");
  const [userId, setUserId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [bookings, setBookings] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/carts").then(r => setCarts(r.data));
    api.get("/users").then(r => setUsers(r.data)); // falls vorhanden, sonst Demo-Seed
  }, []);

  async function loadBookings(cid) {
    if (!cid) return setBookings([]);
    const r = await api.get(`/bookings/cart/${cid}`);
    setBookings(r.data);
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/bookings", {
        cart_id: cartId,
        user_id: userId,
        start_datetime: new Date(start).toISOString(),
        end_datetime: new Date(end).toISOString(),
      });
      await loadBookings(cartId);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Fehler");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Cart buchen</h1>

      <form onSubmit={submit} className="bg-white border rounded-xl p-4 space-y-3">
        <select className="border rounded px-3 py-2 w-full" value={cartId}
          onChange={(e)=>{setCartId(e.target.value); loadBookings(e.target.value);}} required>
          <option value="">Cart wählen</option>
          {carts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select className="border rounded px-3 py-2 w-full" value={userId}
          onChange={(e)=>setUserId(e.target.value)} required>
          <option value="">User wählen</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.firstname} {u.lastname}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <input type="datetime-local" className="border rounded px-3 py-2" value={start}
            onChange={(e)=>setStart(e.target.value)} required />
          <input type="datetime-local" className="border rounded px-3 py-2" value={end}
            onChange={(e)=>setEnd(e.target.value)} required />
        </div>

        <button className="bg-neutral-900 text-white rounded px-4 py-2">Buchen</button>
        {err && <div className="text-sm text-red-600">{err}</div>}
      </form>

      <div className="bg-white border rounded-xl">
        <div className="border-b p-3 font-medium">Aktuelle Buchungen</div>
        <ul className="divide-y">
          {bookings.map(b => (
            <li key={b.id} className="p-3 text-sm">
              {new Date(b.start_datetime).toLocaleString()} → {new Date(b.end_datetime).toLocaleString()}
            </li>
          ))}
        </ul>
        {bookings.length === 0 && <div className="p-3 text-sm text-neutral-500">Keine Buchungen</div>}
      </div>
    </div>
  );
}
