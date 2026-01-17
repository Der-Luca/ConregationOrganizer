import { useEffect, useState } from "react";
import { API } from "../../api";

export default function AdminEvents() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  async function load() {
    const res = await API.get("/events");
    setItems(res.data);
  }

  async function create(e) {
    e.preventDefault();
    await API.post("/events", {
      name,
      description: description || null,
      start_datetime: new Date(start).toISOString(),
      end_datetime: new Date(end).toISOString(),
    });

    setName("");
    setDescription("");
    setStart("");
    setEnd("");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Admin – Events</h1>

      <form onSubmit={create} className="border rounded-xl p-4 space-y-3 bg-white">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Event-Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Beschreibung"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="datetime-local"
          className="border rounded px-3 py-2 w-full"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
        />
        <input
          type="datetime-local"
          className="border rounded px-3 py-2 w-full"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          required
        />

        <button className="bg-black text-white px-4 py-2 rounded">
          Event anlegen
        </button>
      </form>

      <div className="border rounded-xl bg-white">
        <div className="border-b p-3 font-medium">Events</div>
        <ul className="divide-y">
          {items.map((ev) => (
            <li key={ev.id} className="p-3">
              <div className="font-medium">{ev.name}</div>
              <div className="text-sm text-black/60">
                {new Date(ev.start_datetime).toLocaleString()} –{" "}
                {new Date(ev.end_datetime).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
        {items.length === 0 && (
          <div className="p-3 text-sm text-black/60">Noch keine Events</div>
        )}
      </div>
    </div>
  );
}
