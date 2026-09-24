/**
 * Audius provider — zero-key, real full-track streaming.
 * We resolve a healthy discovery node once, cache it, and expose a small
 * normalized surface (search / trending / track / stream-url) for the app.
 */
import { request } from "undici";

const APP_NAME = "sonora";

// api.audius.co returns a list of discovery nodes; we probe for a healthy one.
let cachedHost: string | null = null;
let cachedAt = 0;
const HOST_TTL = 10 * 60 * 1000;

const FALLBACK_HOSTS = [
  "https://discoveryprovider.audius.co",
  "https://discoveryprovider2.audius.co",
  "https://discoveryprovider3.audius.co",
];

async function pickHost(): Promise<string> {
  const now = Date.now();
  if (cachedHost && now - cachedAt < HOST_TTL) return cachedHost;

  let candidates: string[] = [];
  try {
    const res = await request("https://api.audius.co", {
      headersTimeout: 5000,
      bodyTimeout: 5000,
    });
    const body = (await res.body.json()) as { data?: string[] };
    if (Array.isArray(body.data)) candidates = body.data;
  } catch {
    /* fall through to fallbacks */
  }
  candidates = [...candidates, ...FALLBACK_HOSTS];

  for (const host of candidates) {
    try {
      const res = await request(
        `${host}/v1/tracks/trending?app_name=${APP_NAME}&limit=1`,
        { headersTimeout: 4000, bodyTimeout: 4000 },
      );
      if (res.statusCode === 200) {
        cachedHost = host;
        cachedAt = now;
        return host;
      }
    } catch {
      /* try next */
    }
  }
  // Last resort — return the first fallback even if the probe failed.
  cachedHost = FALLBACK_HOSTS[0];
  cachedAt = now;
  return cachedHost;
}

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

type RawTrack = {
  id: string;
  title: string;
  duration: number;
  is_streamable?: boolean;
  user?: { name?: string; handle?: string };
  artwork?: Record<string, string> | null;
};

function normalize(t: RawTrack): Track {
  const art = t.artwork || {};
  return {
    id: t.id,
    title: t.title,
    artist: t.user?.name ?? "Unknown",
    artistHandle: t.user?.handle ?? "",
    duration: t.duration ?? 0,
    artwork: art["480x480"] ?? art["1000x1000"] ?? art["150x150"] ?? null,
    artworkSmall: art["150x150"] ?? art["480x480"] ?? null,
    streamable: t.is_streamable !== false,
    source: "audius",
  };
}

async function getJson<T>(path: string): Promise<T> {
  const host = await pickHost();
  const url = `${host}${path}${path.includes("?") ? "&" : "?"}app_name=${APP_NAME}`;
  const res = await request(url, { headersTimeout: 8000, bodyTimeout: 8000 });
  if (res.statusCode >= 400) {
    // A stale host can 5xx; drop the cache so the next call re-picks.
    cachedHost = null;
    throw new Error(`audius ${res.statusCode}`);
  }
  return (await res.body.json()) as T;
}

export async function search(query: string, limit = 25): Promise<Track[]> {
  const data = await getJson<{ data: RawTrack[] }>(
    `/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return (data.data ?? []).filter((t) => t.is_streamable !== false).map(normalize);
}

export async function trending(genre?: string, limit = 30): Promise<Track[]> {
  const g = genre ? `&genre=${encodeURIComponent(genre)}` : "";
  const data = await getJson<{ data: RawTrack[] }>(
    `/v1/tracks/trending?limit=${limit}${g}`,
  );
  return (data.data ?? []).filter((t) => t.is_streamable !== false).map(normalize);
}

export async function getTrack(id: string): Promise<Track | null> {
  try {
    const data = await getJson<{ data: RawTrack }>(`/v1/tracks/${id}`);
    return data.data ? normalize(data.data) : null;
  } catch {
    return null;
  }
}

/** Absolute stream URL the client's <audio> element hits (it 302s to the CDN). */
export async function streamUrl(id: string): Promise<string> {
  const host = await pickHost();
  return `${host}/v1/tracks/${id}/stream?app_name=${APP_NAME}`;
}
