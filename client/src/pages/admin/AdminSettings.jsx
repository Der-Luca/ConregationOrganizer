import { useState } from "react";
import api from "../../api";
import { useBgImage } from "../../hooks/useBgImage";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SLOTS = [
  {
    key: "login",
    label: "Fondo de inicio de sesión",
    desc: "Imagen de fondo que se muestra en la pantalla de acceso",
  },
  {
    key: "app",
    label: "Fondo del panel principal",
    desc: "Imagen de fondo visible en todas las páginas del panel",
  },
];

const MAX_PX = 1920;
const QUALITY = 0.85;

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_PX || height > MAX_PX) {
        const ratio = Math.min(MAX_PX / width, MAX_PX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
        "image/webp",
        QUALITY
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

function SlotUploader({ slotKey, label, desc }) {
  const currentBg = useBgImage(slotKey);
  const [status, setStatus] = useState(null); // null | "uploading" | "ok" | "error" | "deleting"
  const [preview, setPreview] = useState(null);

  async function handleFile(file) {
    if (!file) return;
    setStatus("uploading");
    setPreview(URL.createObjectURL(file));

    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.append("file", compressed, "image.webp");

      await api.post(`/settings/background/${slotKey}`, form, {
        headers: { "Content-Type": undefined },
      });
      setStatus("ok");
    } catch (err) {
      console.error("[AdminSettings] Upload failed:", err);
      setStatus("error");
      setPreview(null);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Seguro que quieres eliminar esta imagen?")) return;

    setStatus("deleting");
    try {
      await api.delete(`/settings/background/${slotKey}`);
      setPreview(null);
      setStatus("ok");
      // Force reload to refresh the background
      window.location.reload();
    } catch (err) {
      console.error("[AdminSettings] Delete failed:", err);
      setStatus("error");
    }
  }

  const displayBg = preview || currentBg;
  const hasImage = !!displayBg;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Preview */}
      <div
        className="h-40 bg-gray-100 flex items-center justify-center relative"
        style={
          displayBg
            ? {
                backgroundImage: `url(${displayBg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        {!displayBg && (
          <span className="text-gray-400 text-sm">Sin imagen</span>
        )}
        {displayBg && (
          <div className="absolute inset-0 bg-black/20 flex items-end justify-end p-2">
            <span className="text-white text-xs bg-black/40 rounded px-2 py-0.5">
              Vista previa
            </span>
          </div>
        )}
      </div>

      {/* Info + Upload */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900">{label}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <span className="inline-block px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition">
              Elegir imagen
            </span>
          </label>

          {hasImage && (
            <button
              onClick={handleDelete}
              disabled={status === "deleting"}
              className="inline-block px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
            >
              {status === "deleting" ? "Eliminando…" : "Eliminar"}
            </button>
          )}

          {status === "uploading" && (
            <span className="text-sm text-gray-500">Subiendo…</span>
          )}
          {status === "deleting" && (
            <span className="text-sm text-gray-500">Eliminando…</span>
          )}
          {status === "ok" && (
            <span className="text-sm text-green-600 font-medium">✓ Guardado</span>
          )}
          {status === "error" && (
            <span className="text-sm text-red-600">Error</span>
          )}
        </div>

        <p className="text-xs text-gray-400">Cualquier formato de imagen · máx. 20 MB</p>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500">
          Personaliza la apariencia del panel.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-700">
          Imágenes de fondo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SLOTS.map((s) => (
            <SlotUploader key={s.key} slotKey={s.key} label={s.label} desc={s.desc} />
          ))}
        </div>
      </div>
    </div>
  );
}
