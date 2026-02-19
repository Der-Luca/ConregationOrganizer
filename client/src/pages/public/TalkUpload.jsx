import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "-";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export default function TalkUpload() {
  const { token } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [uploadToken, setUploadToken] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");

  const api = useMemo(
    () =>
      axios.create({
        baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
      }),
    []
  );

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get(`/talk-links/public/${token}`)
      .then((res) => setMeta(res.data))
      .catch((err) => {
        const msg = err?.response?.data?.detail || "Enlace no válido";
        setError(typeof msg === "string" ? msg : "Enlace no válido");
      })
      .finally(() => setLoading(false));
  }, [api, token]);

  const selectedBytes = files.reduce((sum, f) => sum + f.size, 0);
  const remaining = meta ? Math.max(meta.max_total_bytes - meta.total_bytes, 0) : 0;

  async function handleUnlock(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password) {
      setError("Contraseña requerida");
      return;
    }

    setUnlocking(true);
    try {
      const form = new FormData();
      form.append("password", password);
      const res = await api.post(`/talk-links/public/${token}/unlock`, form);
      setUploadToken(res.data?.upload_token || "");
      setSuccess("Acceso concedido");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Contraseña incorrecta";
      setError(typeof msg === "string" ? msg : "Contraseña incorrecta");
    } finally {
      setUnlocking(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!files.length) {
      setError("Selecciona archivos");
      return;
    }
    if (selectedBytes > remaining) {
      setError("Excedes el límite total del enlace");
      return;
    }
    if (meta?.has_password && !uploadToken) {
      setError("Debes desbloquear el enlace primero");
      return;
    }

    const form = new FormData();
    for (const f of files) {
      form.append("files", f);
    }
    if (uploadToken) form.append("upload_token", uploadToken);

    setUploading(true);
    try {
      await api.post(`/talk-links/public/${token}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Archivos subidos correctamente");
      setFiles([]);
      setPassword("");
      const res = await api.get(`/talk-links/public/${token}`);
      setMeta(res.data);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al subir archivos";
      setError(typeof msg === "string" ? msg : "Error al subir archivos");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Cargando...
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {meta?.title || "Subir archivos"}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Límite restante: {formatBytes(remaining)}
          </p>
        </div>

        {meta?.expires_at && (
          <div className="text-xs text-gray-500">
            Expira: {new Date(meta.expires_at).toLocaleString("es-ES")}
          </div>
        )}

        {error && (
          <div className="text-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700">
            {success}
          </div>
        )}

        {meta?.has_password && !uploadToken ? (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <input
                type="password"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={unlocking}
              className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"
            >
              {unlocking ? "Verificando..." : "Desbloquear"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpload} className="space-y-4">
            {meta?.has_password && (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Enlace desbloqueado
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Archivos</label>
              <input
                type="file"
                multiple
                className="mt-1 w-full text-sm"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              {files.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Seleccionados: {files.length} · {formatBytes(selectedBytes)}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"
            >
              {uploading ? "Subiendo..." : "Subir archivos"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
