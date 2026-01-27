import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Card from "../../components/Card";
import api from "../../api";

export default function AdminCarts() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");

  async function load() {
    setIsLoading(true);
    try {
      const res = await api.get("/carts");
      setItems(res.data);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    
    await api.post("/carts", {
      name,
      location: location || null,
    });
    setName("");
    setLocation("");
    load();
  }

  function startEdit(cart) {
    setEditingId(cart.id);
    setEditName(cart.name);
    setEditLocation(cart.location || "");
  }

  async function saveEdit(id) {
    await api.put(`/carts/${id}`, {
      name: editName,
      location: editLocation || null,
    });
    setEditingId(null);
    load();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditLocation("");
  }

  async function toggle(id) {
    // Optimistisches Update für schnelleres UI-Feedback
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, active: !item.active } : item
    ));
    await api.patch(`/carts/${id}/toggle`);
    load(); // Sicherheitshalber neu laden
  }

  async function remove(id) {
    if (!confirm("¿Seguro que quieres eliminar este carrito?")) return;
    await api.delete(`/carts/${id}`);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppLayout
      title="Administrar carritos"
      subtitle="Gestión de flotas y ubicaciones"
    >
      <div className="space-y-6">
        
        {/* CREATE SECTION */}
        <Card title="Nuevo Carrito">
          <form onSubmit={create} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Nombre del Carrito</label>
              <input
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
                placeholder="Ej. Carrito Norte 01"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="w-full sm:flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Ubicación (Opcional)</label>
              <input
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
                placeholder="Ej. Entrada Principal"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={!name}
              className="w-full sm:w-auto bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              Crear
            </button>
          </form>
        </Card>

        {/* LIST SECTION */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900">Listado de Carritos</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
              Total: {items.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Ubicación</th>
                  <th className="px-6 py-3 text-center">Estado</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                      No hay carritos creados todavía.
                    </td>
                  </tr>
                ) : (
                  items.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      
                      {/* --- EDIT MODE --- */}
                      {editingId === c.id ? (
                        <>
                          <td className="px-6 py-3">
                            <input
                              autoFocus
                              className="w-full rounded border-gray-300 border px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input
                              className="w-full rounded border-gray-300 border px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                            />
                          </td>
                          <td className="px-6 py-3 text-center opacity-50 cursor-not-allowed">
                            <span className="text-xs">--</span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => saveEdit(c.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Guardar">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                              </button>
                              <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Cancelar">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        
                      /* --- VIEW MODE --- */
                        <>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {c.name}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              {c.location ? (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                  {c.location}
                                </>
                              ) : (
                                <span className="text-gray-300 italic text-xs">Sin ubicación</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => toggle(c.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                c.active
                                  ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${c.active ? "bg-green-500" : "bg-gray-400"}`}></span>
                              {c.active ? "Activo" : "Inactivo"}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => startEdit(c)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                              </button>
                              <button
                                onClick={() => remove(c.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}