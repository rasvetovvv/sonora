export type Source = "soundcloud" | "audius" | "upload";

export type Track = {
  id: string;
  title: string;
  artist: string;
  duration: number;
  artwork: string | null;
  artworkSmall: string | null;
  streamable: boolean;
  source: Source;
};

export type User = { id: number; email: string; display_name: string };
export type Playlist = { id: number; name: string; count: number; created_at?: string };

// Public backend on the VPS. Overridable at build time for local dev.
export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "https://sonora.vexory.xyz";

const TOKEN_KEY = "sonora_token";
export const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function req<T>(
  path: string,
  opts: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as any) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body && !(opts.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    let detail = `api ${res.status}`;
    try {
      const j = await res.json();
      detail = j.error ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ------------------------------- catalog -------------------------------- */
export function search(q: string, source: Source, signal?: AbortSignal) {
  return req<{ tracks: Track[]; fallback?: string }>(
    `/api/search?q=${encodeURIComponent(q)}&source=${source}`,
    { signal },
  );
}
export function trending(source: Source, genre?: string, signal?: AbortSignal) {
  const g = genre ? `&genre=${encodeURIComponent(genre)}` : "";
  return req<{ tracks: Track[] }>(`/api/trending?source=${source}${g}`, { signal });
}
export function streamUrl(t: Pick<Track, "id" | "source">): string {
  return `${API_BASE}/api/stream/${t.source}/${t.id}`;
}

/* -------------------------------- auth ---------------------------------- */
export function register(email: string, password: string, display_name?: string) {
  return req<{ token: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, display_name }),
  });
}
export function login(email: string, password: string) {
  return req<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
export function me() {
  return req<{ user: User }>("/api/auth/me");
}

/* -------------------------------- likes --------------------------------- */
export function getLikes() {
  return req<{ tracks: Track[] }>("/api/likes");
}
export function toggleLike(t: Track) {
  return req<{ liked: boolean }>("/api/likes/toggle", {
    method: "POST",
    body: JSON.stringify(t),
  });
}

/* ------------------------------ playlists ------------------------------- */
export function getPlaylists() {
  return req<{ playlists: Playlist[] }>("/api/playlists");
}
export function createPlaylist(name: string) {
  return req<Playlist>("/api/playlists", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
export function deletePlaylist(id: number) {
  return req<{ ok: boolean }>(`/api/playlists/${id}`, { method: "DELETE" });
}
export function getPlaylist(id: number) {
  return req<{ playlist: { id: number; name: string }; tracks: Track[] }>(
    `/api/playlists/${id}`,
  );
}
export function addToPlaylist(id: number, t: Track) {
  return req<{ ok: boolean }>(`/api/playlists/${id}/tracks`, {
    method: "POST",
    body: JSON.stringify(t),
  });
}
export function removeFromPlaylist(id: number, trackId: string) {
  return req<{ ok: boolean }>(`/api/playlists/${id}/tracks/${trackId}`, {
    method: "DELETE",
  });
}

/* ------------------------------- uploads -------------------------------- */
export function getUploads() {
  return req<{ tracks: Track[] }>("/api/uploads");
}
export async function uploadTrack(file: File, title: string, artist: string) {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("artist", artist);
  fd.append("file", file);
  return req<{ id: number }>("/api/uploads", { method: "POST", body: fd });
}
export function deleteUpload(id: string) {
  return req<{ ok: boolean }>(`/api/uploads/${id}`, { method: "DELETE" });
}
