import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "-";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

// Individual file upload item with progress
function FileUploadItem({ file, onProgress, onComplete, onError, api, token, uploadToken, onSuccess }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("pending"); // pending, uploading, complete, error
  const [error, setError] = useState("");

  useEffect(() => {
    const upload = async () => {
      setStatus("uploading");

      const form = new FormData();
      form.append("files", file);
      if (uploadToken) form.append("upload_token", uploadToken);

      try {
        await api.post(`/talk-links/public/${token}/upload`, form, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
            onProgress?.(percent);
          },
        });
        setStatus("complete");
        setProgress(100);
        onComplete?.();
        onSuccess?.();
      } catch (err) {
        setStatus("error");
        const msg = err?.response?.data?.detail || "Error al subir";
        setError(msg);
        onError?.(msg);
      }
    };

    upload();
  }, []);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
        {status === "error" && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
      <div className="w-24">
        {status === "uploading" && (
          <div className="space-y-1">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-right">{progress}%</p>
          </div>
        )}
        {status === "complete" && (
          <span className="text-xs text-green-600 font-medium">✓ Subido</span>
        )}
        {status === "error" && (
          <span className="text-xs text-red-600">Error</span>
        )}
        {status === "pending" && (
          <span className="text-xs text-gray-400">Pendiente...</span>
        )}
      </div>
    </div>
  );
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
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef(null);

  const api = useMemo(
    () =>
      axios.create({
        baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
      }),
    []
  );

  const fetchMeta = useCallback(() => {
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

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const selectedBytes = files.reduce((sum, f) => sum + f.size, 0);
  const remaining = meta ? Math.max(meta.max_total_bytes - meta.total_bytes, 0) : 0;

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFiles = (newFiles) => {
    setError("");
    setSuccessMsg("");

    // Filter files that exceed remaining space
    let currentBytes = files.reduce((sum, f) => sum + f.size, 0);
    const validFiles = [];
    const rejectedFiles = [];

    for (const file of newFiles) {
      if (currentBytes + file.size > remaining) {
        rejectedFiles.push(file.name);
      } else {
        validFiles.push(file);
        currentBytes += file.size;
      }
    }

    if (rejectedFiles.length > 0) {
      setError(`${rejectedFiles.length} archivo(s) exceden el límite restante`);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    handleFiles(selected);
    e.target.value = ""; // Reset input
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCompleted = () => {
    setUploadingFiles([]);
    setCompletedCount(0);
    setFiles([]);
  };

  const startUpload = async () => {
    if (!files.length) return;
    if (meta?.has_password && !uploadToken) {
      setError("Debes desbloquear el enlace primero");
      return;
    }

    setError("");
    setSuccessMsg("");
    setUploadingFiles(files.map((f) => ({ file: f, status: "uploading" })));
    setCompletedCount(0);
  };

  const handleFileComplete = () => {
    setCompletedCount((c) => c + 1);
  };

  const handleFileSuccess = () => {
    // Refresh meta to show updated remaining space
    api.get(`/talk-links/public/${token}`).then((res) => setMeta(res.data));
  };

  const handleAllComplete = () => {
    setSuccessMsg(`${completedCount} archivo(s) subidos correctamente`);
    setUploadingFiles([]);
    setFiles([]);
    fetchMeta();
  };

  async function handleUnlock(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

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
      setSuccessMsg("Acceso concedido");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Contraseña incorrecta";
      setError(typeof msg === "string" ? msg : "Contraseña incorrecta");
    } finally {
      setUnlocking(false);
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

  const hasActiveUploads = uploadingFiles.length > 0;
  const allCompleted = hasActiveUploads && completedCount === uploadingFiles.length;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {meta?.title || "Subir archivos"}
          </h1>
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
            <span>Límite restante: {formatBytes(remaining)}</span>
            {meta?.file_count > 0 && (
              <span>{meta.file_count} archivo(s) subidos</span>
            )}
          </div>
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

        {successMsg && (
          <div className="text-sm rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700">
            {successMsg}
          </div>
        )}

        {allCompleted && (
          <button
            onClick={handleAllComplete}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Limpiar y continuar
          </button>
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
          <div className="space-y-4">
            {meta?.has_password && (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Enlace desbloqueado
              </div>
            )}

            {/* Active uploads progress */}
            {hasActiveUploads && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">Subiendo...</span>
                  <span className="text-gray-500">{completedCount} / {uploadingFiles.length}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 transition-all duration-300"
                    style={{ width: `${(completedCount / uploadingFiles.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Individual upload items */}
            {hasActiveUploads && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {uploadingFiles.map((item, idx) => (
                  <FileUploadItem
                    key={`${item.file.name}-${idx}`}
                    file={item.file}
                    api={api}
                    token={token}
                    uploadToken={uploadToken}
                    onComplete={handleFileComplete}
                    onSuccess={handleFileSuccess}
                  />
                ))}
              </div>
            )}

            {/* Drop zone - only show when not uploading */}
            {!hasActiveUploads && (
              <>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
                    ${isDragging
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-300 hover:border-gray-400"
                    }
                  `}
                >
                  <div className="space-y-2">
                    <div className="text-4xl">📁</div>
                    <p className="text-sm font-medium text-gray-900">
                      Arrastra archivos aquí
                    </p>
                    <p className="text-xs text-gray-500">
                      o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-400">
                      Máximo por archivo: {formatBytes(remaining)}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Selected files list */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">
                        Archivos seleccionados
                      </span>
                      <span className="text-gray-500">
                        {files.length} · {formatBytes(selectedBytes)}
                      </span>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {files.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                        >
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-xs text-gray-500 mr-2">
                            {formatBytes(file.size)}
                          </span>
                          <button
                            onClick={() => removeFile(idx)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={startUpload}
                      disabled={files.length === 0}
                      className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"
                    >
                      Subir {files.length} archivo(s)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
