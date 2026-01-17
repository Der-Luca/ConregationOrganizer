import { useEffect, useState } from "react";
import { API } from "../../api";

export default function UserEvents() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    API.get("/events").then((res) => setItems(res.data));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">User – Events</h1>

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
          <div className="p-3 text-sm text-black/60">Keine Events vorhanden</div>
        )}
      </div>
    </div>
  );
}
