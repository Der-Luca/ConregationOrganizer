import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Card from "../../components/Card";
import api from "../../api";

export default function AdminCarts() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  async function load() {
    const res = await api.get("/carts");
    setItems(res.data);
  }

  async function create(e) {
    e.preventDefault();
    await api.post("/carts", {
      name,
      location: location || null,
    });
    setName("");
    setLocation("");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppLayout
      title="Carts verwalten"
      subtitle="Trolleys anlegen und verwalten"
    >
      {/* CREATE */}
      <Card title="Neuen Cart anlegen">
        <form
          onSubmit={create}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <button
            className="rounded-xl bg-neutral-900 text-white text-sm px-4 py-2 hover:bg-neutral-800 transition"
          >
            Anlegen
          </button>
        </form>
      </Card>

      {/* LIST */}
      <Card title="Vorhandene Carts">
        <ul className="space-y-3">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-xl border px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  {c.name}
                </div>
                <div className="text-xs text-neutral-500">
                  {c.location || "—"}
                </div>
              </div>

              <span className="text-xs text-neutral-400">
                aktiv
              </span>
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <div className="text-sm text-neutral-500">
            Noch keine Carts vorhanden
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
