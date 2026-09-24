export type Track = {
  id: string;
  title: string;
  artist: string;
  artistHandle: string;
  duration: number;
  artwork: string | null;
  artworkSmall: string | null;
  streamable: boolean;
  source: "audius";
};

// Public backend on the VPS. Overridable at build time for local dev.
export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "https://sonora.vexory.xyz";

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`api ${res.status}`);
  return (await res.json()) as T;
}

export function search(q: string, signal?: AbortSignal): Promise<{ tracks: Track[] }> {
  return getJson(`/api/search?q=${encodeURIComponent(q)}&limit=40`, signal);
}

export function trending(
  genre?: string,
  signal?: AbortSignal,
): Promise<{ tracks: Track[] }> {
  const g = genre ? `?genre=${encodeURIComponent(genre)}` : "";
  return getJson(`/api/trending${g}`, signal);
}

/** Stable app-origin media URL; the backend 302s to the current CDN node. */
export function streamUrl(id: string): string {
  return `${API_BASE}/api/stream/${id}`;
}
