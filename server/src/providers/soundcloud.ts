/**
 * SoundCloud provider (unofficial). SoundCloud closed public API registration,
 * so we extract the same anonymous client_id their web player uses and call
 * api-v2. This is ToS-gray and can break when SoundCloud rotates the id — we
 * re-scrape on demand and cache it. Streaming is the HLS/progressive
 * transcoding, resolved per-track with the client_id + track_authorization.
 *
 * NOTE: the media CDN rejects server-side/non-browser requests (403) unless the
 * request carries the resolved signed URL from a fresh resolve; the desktop
 * client fetches that resolved URL itself. Our /api/stream/:id resolves and
 * 302-redirects to the signed CDN URL so the app's <audio> plays it directly.
 */
import { request } from "undici";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

let clientId: string | null = null;
let clientAt = 0;
const CID_TTL = 30 * 60 * 1000;

async function fetchText(url: string): Promise<string> {
  const res = await request(url, {
    headers: { "user-agent": UA },
    headersTimeout: 8000,
    bodyTimeout: 8000,
    maxRedirections: 3,
  });
  return await res.body.text();
}

export async function getClientId(force = false): Promise<string> {
  const now = Date.now();
  if (!force && clientId && now - clientAt < CID_TTL) return clientId;

  const home = await fetchText("https://soundcloud.com/");
  const scripts = [...home.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js/g)].map(
    (m) => m[0],
  );
  for (const js of scripts.reverse()) {
    try {
      const body = await fetchText(js);
      const m = body.match(/client_id[=:"\\]+([A-Za-z0-9]{20,40})/);
      if (m) {
        clientId = m[1];
        clientAt = now;
        return clientId;
      }
    } catch {
      /* next bundle */
    }
  }
  throw new Error("soundcloud client_id not found");
}

export type Track = {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  artwork: string | null;
  artworkSmall: string | null;
  streamable: boolean;
  source: "soundcloud";
};

type RawSC = {
  id: number;
  title: string;
  duration?: number; // ms
  streamable?: boolean;
  artwork_url?: string | null;
  user?: { username?: string; avatar_url?: string | null };
  media?: { transcodings?: { url: string; format: { protocol: string } }[] };
};

function art(url: string | null | undefined, size: string): string | null {
  if (!url) return null;
  return url.replace("-large.", `-${size}.`).replace("large", size);
}

function normalize(t: RawSC): Track {
  return {
    id: String(t.id),
    title: t.title ?? "Untitled",
    artist: t.user?.username ?? "Unknown",
    duration: Math.round((t.duration ?? 0) / 1000),
    artwork: art(t.artwork_url ?? t.user?.avatar_url, "t500x500"),
    artworkSmall: art(t.artwork_url ?? t.user?.avatar_url, "t120x120"),
    streamable: t.streamable !== false,
    source: "soundcloud",
  };
}

async function apiJson<T>(path: string, retry = true): Promise<T> {
  const cid = await getClientId();
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api-v2.soundcloud.com${path}${sep}client_id=${cid}`;
  const res = await request(url, {
    headers: { "user-agent": UA, origin: "https://soundcloud.com" },
    headersTimeout: 9000,
    bodyTimeout: 9000,
  });
  if (res.statusCode === 401 && retry) {
    await getClientId(true);
    return apiJson<T>(path, false);
  }
  if (res.statusCode >= 400) throw new Error(`soundcloud ${res.statusCode}`);
  return (await res.body.json()) as T;
}

export async function search(query: string, limit = 30): Promise<Track[]> {
  const data = await apiJson<{ collection: RawSC[] }>(
    `/search/tracks?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return (data.collection ?? [])
    .filter((t) => t.media?.transcodings?.length)
    .map(normalize);
}

export async function trending(_genre?: string, limit = 30): Promise<Track[]> {
  // SoundCloud has no key-free trending; use a broad selection query so the
  // home screen is populated even before the user searches.
  const seeds = ["lofi", "phonk", "house", "chill", "hip hop", "remix"];
  const q = seeds[Math.floor(Math.random() * seeds.length)];
  return search(q, limit);
}

/** Resolve a playable, signed CDN URL for a track id (progressive preferred). */
export async function resolveStream(id: string): Promise<string | null> {
  const cid = await getClientId();
  const track = await apiJson<RawSC>(`/tracks/${id}`);
  const trans = track.media?.transcodings ?? [];
  const progressive = trans.find((t) => t.format.protocol === "progressive");
  const chosen = progressive ?? trans[0];
  if (!chosen) return null;
  const sep = chosen.url.includes("?") ? "&" : "?";
  const resolve = await request(`${chosen.url}${sep}client_id=${cid}`, {
    headers: { "user-agent": UA, origin: "https://soundcloud.com" },
    headersTimeout: 8000,
    bodyTimeout: 8000,
  });
  if (resolve.statusCode >= 400) return null;
  const body = (await resolve.body.json()) as { url?: string };
  return body.url ?? null;
}

export async function getTrack(id: string): Promise<Track | null> {
  try {
    return normalize(await apiJson<RawSC>(`/tracks/${id}`));
  } catch {
    return null;
  }
}

/**
 * Stream info for CLIENT-SIDE resolution. The media CDN rejects datacenter IPs,
 * so the desktop app must resolve the signed URL itself (from the user's IP,
 * like the real web player). We return the transcoding endpoint + the current
 * credentials; the client GETs `${url}?client_id=..&track_authorization=..`
 * which returns `{ url: <signed cdn mp3> }` for its <audio> element.
 */
export async function streamInfo(
  id: string,
): Promise<{ url: string; clientId: string; trackAuthorization: string | null } | null> {
  const cid = await getClientId();
  const track = await apiJson<RawSC & { track_authorization?: string }>(`/tracks/${id}`);
  const trans = track.media?.transcodings ?? [];
  const progressive = trans.find(
    (t) => t.format.protocol === "progressive",
  );
  const chosen = progressive ?? trans.find((t) => t.format.protocol === "hls") ?? trans[0];
  if (!chosen) return null;
  return {
    url: chosen.url,
    clientId: cid,
    trackAuthorization: track.track_authorization ?? null,
  };
}
