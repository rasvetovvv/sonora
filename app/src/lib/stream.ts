import { API_BASE, type Track } from "./api";

const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Fetch that bypasses browser CORS when running inside Tauri (requests go
 * through Rust, from the user's own IP — exactly what SoundCloud's CDN needs).
 * Falls back to normal fetch in the browser (where SoundCloud will be blocked).
 */
async function crossFetch(url: string): Promise<Response> {
  if (isTauri()) {
    const http = await import("@tauri-apps/plugin-http").catch(() => null as any);
    if (http?.fetch) return http.fetch(url);
  }
  return fetch(url);
}

/**
 * Resolve a playable media URL for a track, per source.
 *
 * - audius / upload: the backend `/api/stream/...` endpoint works from any IP
 *   (Audius 302s to its public CDN; uploads stream from our disk), so we point
 *   <audio> straight at it.
 * - soundcloud: the SC media CDN blocks datacenter IPs AND browser CORS, so the
 *   DESKTOP app resolves the signed URL itself from the user's IP (like the real
 *   web player), using the Tauri HTTP plugin. In a plain browser this fails and
 *   we return null (the caller shows "недоступно" and skips).
 */
export async function resolvePlayable(track: Track): Promise<string | null> {
  if (track.source === "audius" || track.source === "upload") {
    return `${API_BASE}/api/stream/${track.source}/${track.id}`;
  }

  // soundcloud — client-side resolve
  try {
    const infoRes = await fetch(`${API_BASE}/api/sc-stream-info/${track.id}`);
    if (!infoRes.ok) return null;
    const info = (await infoRes.json()) as {
      url: string;
      clientId: string;
      trackAuthorization: string | null;
    };
    const sep = info.url.includes("?") ? "&" : "?";
    const ta = info.trackAuthorization
      ? `&track_authorization=${encodeURIComponent(info.trackAuthorization)}`
      : "";
    const resolveUrl = `${info.url}${sep}client_id=${info.clientId}${ta}`;
    const r = await crossFetch(resolveUrl);
    if (!r.ok) return null;
    const body = (await r.json()) as { url?: string };
    // Only progressive gives a plain .mp3 that <audio> can play. HLS (.m3u8)
    // needs hls.js; skip for MVP and signal unplayable.
    if (!body.url || body.url.includes(".m3u8")) return null;
    return body.url;
  } catch {
    return null;
  }
}
