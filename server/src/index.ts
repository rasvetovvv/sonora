import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { createWriteStream, createReadStream, statSync, existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { db, UPLOAD_DIR } from "./db.js";
import { hashPassword, verifyPassword } from "./auth.js";
import * as audius from "./providers/audius.js";
import * as soundcloud from "./providers/soundcloud.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "sonora-dev-secret-change-me";

const app = Fastify({
  logger: { level: "info" },
  bodyLimit: 30 * 1024 * 1024,
});

await app.register(cors, { origin: true });
await app.register(jwt, { secret: JWT_SECRET });
await app.register(multipart, {
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per upload
});

// ---- auth decorator ---------------------------------------------------------
app.decorate("auth", async (req: any, reply: any) => {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "unauthorized" });
  }
});
const authed = { preHandler: (app as any).auth };

app.get("/health", async () => ({ status: "ok", service: "sonora-api", v: 2 }));

// ---- auto-update feed -------------------------------------------------------
// Serves the Tauri updater manifest. The file is mounted read-only into the
// container at /app/updates/latest.json (see docker-compose).
app.get("/updates/latest.json", async (_req, reply) => {
  const path = process.env.UPDATES_FILE ?? "/app/updates/latest.json";
  if (!existsSync(path)) return reply.code(204).send();
  reply.header("content-type", "application/json");
  reply.header("cache-control", "no-cache");
  return reply.send(createReadStream(path));
});

// ---- auth -------------------------------------------------------------------
app.post("/api/auth/register", async (req, reply) => {
  const { email, password, display_name } = (req.body ?? {}) as Record<string, string>;
  if (!email || !password || password.length < 6)
    return reply.code(400).send({ error: "email and password (min 6) required" });
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (exists) return reply.code(409).send({ error: "email already registered" });
  const name = display_name || email.split("@")[0];
  const info = db
    .prepare("INSERT INTO users (email, display_name, password_hash) VALUES (?,?,?)")
    .run(email.toLowerCase(), name, hashPassword(password));
  const user = { id: Number(info.lastInsertRowid), email: email.toLowerCase() };
  const token = app.jwt.sign(user, { expiresIn: "30d" });
  return reply.code(201).send({ token, user: { ...user, display_name: name } });
});

app.post("/api/auth/login", async (req, reply) => {
  const { email, password } = (req.body ?? {}) as Record<string, string>;
  if (!email || !password) return reply.code(400).send({ error: "missing credentials" });
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(String(email).toLowerCase()) as any;
  if (!row || !verifyPassword(password, row.password_hash))
    return reply.code(401).send({ error: "invalid email or password" });
  const user = { id: row.id, email: row.email };
  const token = app.jwt.sign(user, { expiresIn: "30d" });
  return { token, user: { id: row.id, email: row.email, display_name: row.display_name } };
});

app.get("/api/auth/me", authed, async (req: any) => {
  const row = db.prepare("SELECT id,email,display_name FROM users WHERE id = ?").get(req.user.id);
  return { user: row };
});

// ---- catalog (search / trending / track) ------------------------------------
function pickProvider(source?: string) {
  return source === "audius" ? audius : soundcloud;
}

app.get("/api/search", async (req, reply) => {
  const { q, source } = req.query as { q?: string; source?: string };
  if (!q?.trim()) return reply.code(400).send({ error: "missing ?q=" });
  try {
    const tracks = await pickProvider(source).search(q.trim(), 40);
    return { tracks };
  } catch (e) {
    req.log.error(e);
    // Fall back to Audius if SoundCloud scraping breaks.
    if (source !== "audius") {
      try {
        return { tracks: await audius.search(q.trim(), 40), fallback: "audius" };
      } catch {
        /* ignore */
      }
    }
    return reply.code(502).send({ error: "provider unavailable" });
  }
});

app.get("/api/trending", async (req, reply) => {
  const { source, genre } = req.query as { source?: string; genre?: string };
  try {
    return { tracks: await pickProvider(source).trending(genre, 30) };
  } catch (e) {
    req.log.error(e);
    try {
      return { tracks: await audius.trending(genre, 30), fallback: "audius" };
    } catch {
      return reply.code(502).send({ error: "provider unavailable" });
    }
  }
});

app.get("/api/track/:source/:id", async (req, reply) => {
  const { source, id } = req.params as { source: string; id: string };
  const t = await pickProvider(source).getTrack(id);
  if (!t) return reply.code(404).send({ error: "not found" });
  return { track: t };
});

// ---- streaming --------------------------------------------------------------
// Audius: 302 to discovery node stream. SoundCloud: resolve signed CDN url, 302.
// Uploads: stream bytes from disk with Range support.
app.get("/api/stream/audius/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  reply.header("access-control-allow-origin", "*");
  return reply.redirect(await audius.streamUrl(id), 302);
});

app.get("/api/stream/soundcloud/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const url = await soundcloud.resolveStream(id);
  if (!url) return reply.code(404).send({ error: "no stream" });
  reply.header("access-control-allow-origin", "*");
  return reply.redirect(url, 302);
});

// Client-side SoundCloud resolution. The CDN blocks our datacenter IP, so the
// desktop app resolves the signed URL itself from the user's IP (like the web
// player). Returns the transcoding endpoint + current credentials.
app.get("/api/sc-stream-info/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  try {
    const info = await soundcloud.streamInfo(id);
    if (!info) return reply.code(404).send({ error: "no stream" });
    return info;
  } catch (e) {
    req.log.error(e);
    return reply.code(502).send({ error: "resolve failed" });
  }
});

app.get("/api/stream/upload/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const row = db.prepare("SELECT * FROM uploads WHERE id = ?").get(id) as any;
  if (!row) return reply.code(404).send({ error: "not found" });
  const path = join(UPLOAD_DIR, row.filename);
  if (!existsSync(path)) return reply.code(404).send({ error: "file missing" });
  const total = statSync(path).size;
  const range = req.headers.range as string | undefined;
  reply.header("accept-ranges", "bytes");
  reply.header("content-type", row.mime || "audio/mpeg");
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : total - 1;
    reply.code(206);
    reply.header("content-range", `bytes ${start}-${end}/${total}`);
    reply.header("content-length", end - start + 1);
    return reply.send(createReadStream(path, { start, end }));
  }
  reply.header("content-length", total);
  return reply.send(createReadStream(path));
});

// ---- uploads ----------------------------------------------------------------
app.post("/api/uploads", authed, async (req: any, reply) => {
  const parts = req.parts();
  let title = "", artist = "", fileName = "", mime = "", size = 0;
  for await (const part of parts) {
    if (part.type === "file") {
      const ext = (part.filename?.split(".").pop() || "mp3").toLowerCase();
      fileName = `${randomUUID()}.${ext}`;
      mime = part.mimetype || "audio/mpeg";
      const dest = join(UPLOAD_DIR, fileName);
      await pipeline(part.file, createWriteStream(dest));
      if (part.file.truncated) {
        await unlink(dest).catch(() => {});
        return reply.code(413).send({ error: "file too large (max 25MB)" });
      }
      size = statSync(dest).size;
    } else {
      if (part.fieldname === "title") title = String(part.value);
      if (part.fieldname === "artist") artist = String(part.value);
    }
  }
  if (!fileName) return reply.code(400).send({ error: "no file" });
  const info = db
    .prepare(
      "INSERT INTO uploads (user_id,title,artist,filename,mime,size) VALUES (?,?,?,?,?,?)",
    )
    .run(req.user.id, title || "Untitled", artist || "Me", fileName, mime, size);
  return reply.code(201).send({ id: Number(info.lastInsertRowid) });
});

app.get("/api/uploads", authed, async (req: any) => {
  const rows = db
    .prepare("SELECT * FROM uploads WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id) as any[];
  return {
    tracks: rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      artist: r.artist,
      duration: r.duration,
      artwork: null,
      artworkSmall: null,
      streamable: true,
      source: "upload",
    })),
  };
});

app.delete("/api/uploads/:id", authed, async (req: any, reply) => {
  const row = db
    .prepare("SELECT * FROM uploads WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id) as any;
  if (!row) return reply.code(404).send({ error: "not found" });
  db.prepare("DELETE FROM uploads WHERE id = ?").run(row.id);
  await unlink(join(UPLOAD_DIR, row.filename)).catch(() => {});
  return { ok: true };
});

// ---- likes ------------------------------------------------------------------
app.get("/api/likes", authed, async (req: any) => {
  const rows = db
    .prepare("SELECT * FROM likes WHERE user_id = ? ORDER BY liked_at DESC")
    .all(req.user.id) as any[];
  return {
    tracks: rows.map((r) => ({
      id: r.track_id,
      title: r.title,
      artist: r.artist,
      duration: r.duration,
      artwork: r.artwork,
      artworkSmall: r.artwork,
      streamable: true,
      source: r.source,
    })),
  };
});

app.post("/api/likes/toggle", authed, async (req: any, reply) => {
  const t = req.body as any;
  if (!t?.source || !t?.id) return reply.code(400).send({ error: "track required" });
  const uid = `${t.source}:${t.id}`;
  const existing = db
    .prepare("SELECT 1 FROM likes WHERE user_id = ? AND track_uid = ?")
    .get(req.user.id, uid);
  if (existing) {
    db.prepare("DELETE FROM likes WHERE user_id = ? AND track_uid = ?").run(req.user.id, uid);
    return { liked: false };
  }
  db.prepare(
    "INSERT INTO likes (user_id,track_uid,source,track_id,title,artist,artwork,duration) VALUES (?,?,?,?,?,?,?,?)",
  ).run(req.user.id, uid, t.source, String(t.id), t.title ?? "", t.artist ?? "", t.artwork ?? null, t.duration ?? 0);
  return { liked: true };
});

// ---- playlists --------------------------------------------------------------
app.get("/api/playlists", authed, async (req: any) => {
  const lists = db
    .prepare("SELECT id,name,created_at FROM playlists WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id) as any[];
  return {
    playlists: lists.map((p) => {
      const count = db
        .prepare("SELECT COUNT(*) c FROM playlist_tracks WHERE playlist_id = ?")
        .get(p.id) as any;
      return { ...p, count: count.c };
    }),
  };
});

app.post("/api/playlists", authed, async (req: any, reply) => {
  const { name } = (req.body ?? {}) as { name?: string };
  if (!name?.trim()) return reply.code(400).send({ error: "name required" });
  const info = db
    .prepare("INSERT INTO playlists (user_id,name) VALUES (?,?)")
    .run(req.user.id, name.trim());
  return reply.code(201).send({ id: Number(info.lastInsertRowid), name: name.trim(), count: 0 });
});

app.delete("/api/playlists/:id", authed, async (req: any, reply) => {
  const own = db
    .prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!own) return reply.code(404).send({ error: "not found" });
  db.prepare("DELETE FROM playlists WHERE id = ?").run(req.params.id);
  return { ok: true };
});

app.get("/api/playlists/:id", authed, async (req: any, reply) => {
  const pl = db
    .prepare("SELECT * FROM playlists WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id) as any;
  if (!pl) return reply.code(404).send({ error: "not found" });
  const rows = db
    .prepare("SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position, id")
    .all(pl.id) as any[];
  return {
    playlist: { id: pl.id, name: pl.name },
    tracks: rows.map((r) => ({
      id: r.track_id,
      title: r.title,
      artist: r.artist,
      duration: r.duration,
      artwork: r.artwork,
      artworkSmall: r.artwork,
      streamable: true,
      source: r.source,
    })),
  };
});

app.post("/api/playlists/:id/tracks", authed, async (req: any, reply) => {
  const pl = db
    .prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id) as any;
  if (!pl) return reply.code(404).send({ error: "not found" });
  const t = req.body as any;
  if (!t?.source || !t?.id) return reply.code(400).send({ error: "track required" });
  const pos = (db.prepare("SELECT COUNT(*) c FROM playlist_tracks WHERE playlist_id = ?").get(pl.id) as any).c;
  db.prepare(
    "INSERT INTO playlist_tracks (playlist_id,track_uid,source,track_id,title,artist,artwork,duration,position) VALUES (?,?,?,?,?,?,?,?,?)",
  ).run(pl.id, `${t.source}:${t.id}`, t.source, String(t.id), t.title ?? "", t.artist ?? "", t.artwork ?? null, t.duration ?? 0, pos);
  return reply.code(201).send({ ok: true });
});

app.delete("/api/playlists/:id/tracks/:trackId", authed, async (req: any, reply) => {
  const pl = db
    .prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id) as any;
  if (!pl) return reply.code(404).send({ error: "not found" });
  db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?").run(
    pl.id,
    req.params.trackId,
  );
  return { ok: true };
});

const port = Number(process.env.PORT) || 8080;
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
