import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useBgImage(slot) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    fetch(`${BASE}/settings/background/${slot}/url`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.url) return;
        const fullUrl = `${BASE}${data.url}`;
        const img = new Image();
        img.onload = () => setUrl(fullUrl);
        img.src = fullUrl;
      })
      .catch(() => {});
  }, [slot]);

  return url;
}
