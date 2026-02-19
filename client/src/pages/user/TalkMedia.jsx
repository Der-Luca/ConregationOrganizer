import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "-";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export default function TalkMedia() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function fetchLinks() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/talk-links");
      setLinks(res.data || []);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al cargar enlaces";
      setError(typeof msg === "string" ? msg : "Error al cargar enlaces");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.roles?.includes("talk_assistant") || user?.roles?.includes("admin")) {
      fetchLinks();
    }
  }, [user?.roles]);

  async function createLink(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const payload = {
        title: title || null,
        password: password || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      const res = await api.post("/talk-links", payload);
      setLinks([res.data, ...links]);
      setTitle("");
      setExpiresAt("");
      setPassword("");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al crear enlace";
      setError(typeof msg === "string" ? msg : "Error al crear enlace");
    } finally {
      setCreating(false);
    }
  }

  async function deleteLink(linkId) {
    if (!confirm("¿Eliminar este enlace y sus archivos?")) return;
    try {
      await api.delete(`/talk-links/${linkId}`);
      setLinks(links.filter((l) => l.id !== linkId));
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al eliminar";
      alert(typeof msg === "string" ? msg : "Error al eliminar");
    }
  }

  async function startEdit(link) {
    setEditId(link.id);
    setEditTitle(link.title || "");
    setEditPassword("");
    setEditActive(true);
    setEditExpiresAt(link.expires_at ? new Date(link.expires_at).toISOString().slice(0, 16) : "");
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      const payload = {
        title: editTitle || null,
        expires_at: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        password: editPassword !== "" ? editPassword : null,
        active: editActive,
      };
      const res = await api.patch(`/talk-links/${editId}`, payload);
      setLinks(links.map((l) => (l.id === editId ? { ...l, ...res.data } : l)));
      setEditId(null);
      setEditPassword("");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al actualizar";
      alert(typeof msg === "string" ? msg : "Error al actualizar");
    }
  }

  async function downloadFile(linkId, file) {
    try {
      const res = await api.get(`/talk-links/${linkId}/files/${file.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al descargar";
      alert(typeof msg === "string" ? msg : "Error al descargar");
    }
  }

  const publicBase = `${window.location.origin}/upload`;

  const hasAccess =
    user?.roles?.includes("talk_assistant") || user?.roles?.includes("admin");

  if (!hasAccess) {
    return <Navigate to="/user" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Medios del discurso</h1>
        <p className="text-sm text-gray-500 mt-1">
          Crea enlaces públicos para subir archivos.
        </p>
      </div>

      <form
        onSubmit={createLink}
        className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Título (opcional)</label>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Ej. Discurso del domingo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Válido hasta (opcional)</label>
            <input
              type="datetime-local"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Contraseña (opcional)</label>
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Solo si quieres proteger el enlace"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Límite total: 2 GB por enlace</span>
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"
          >
            {creating ? "Creando..." : "Crear enlace"}
          </button>
        </div>
      </form>

      {error && (
        <div className="text-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando...</div>
      ) : links.length === 0 ? (
        <div className="text-sm text-gray-500">No hay enlaces todavía.</div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => {
            const publicUrl = `${publicBase}/${link.token}`;
            return (
              <div
                key={link.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {link.title || "Sin título"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Archivos: {link.file_count} · {formatBytes(link.total_bytes)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {link.expires_at ? `Expira: ${new Date(link.expires_at).toLocaleString("es-ES")}` : "Sin expiración"}
                      {link.has_password ? " · Con contraseña" : " · Sin contraseña"}
                    </p>
                    <div className="mt-2 text-sm break-all text-blue-700">
                      {publicUrl}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(publicUrl);
                      }}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:border-gray-300"
                    >
                      Copiar enlace
                    </button>
                    <button
                      onClick={() => startEdit(link)}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:border-gray-300"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteLink(link.id)}
                      className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {editId === link.id && (
                  <form
                    onSubmit={saveEdit}
                    className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700">Título</label>
                        <input
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Válido hasta</label>
                        <input
                          type="datetime-local"
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={editExpiresAt}
                          onChange={(e) => setEditExpiresAt(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Nueva contraseña (opcional)
                        </label>
                        <input
                          type="text"
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="Deja vacío para quitar"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                      />
                      Enlace activo
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {link.files && link.files.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Archivos subidos
                    </div>
                    <div className="space-y-2">
                      {link.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <div className="text-gray-700">
                            {file.original_filename} · {formatBytes(file.size_bytes)}
                          </div>
                          <button
                            onClick={() => downloadFile(link.id, file)}
                            className="text-blue-700 hover:underline"
                          >
                            Descargar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
