import Fastify from "fastify";
import cors from "@fastify/cors";
import * as audius from "./providers/audius.js";

const app = Fastify({ logger: { level: "info" } });

// The desktop app runs from a tauri:// / file:// origin, so it is effectively
// cross-origin to this API. Allow any origin but only simple read methods.
await app.register(cors, { origin: true, methods: ["GET", "HEAD", "OPTIONS"] });

app.get("/health", async () => ({ status: "ok", service: "sonora-api" }));

app.get("/api/search", async (req, reply) => {
  const q = (req.query as { q?: string }).q?.trim();
  if (!q) return reply.code(400).send({ error: "missing query ?q=" });
  const limit = Number((req.query as { limit?: string }).limit) || 25;
  try {
    return { tracks: await audius.search(q, Math.min(limit, 50)) };
  } catch (e) {
    req.log.error(e);
    return reply.code(502).send({ error: "provider unavailable" });
  }
});

app.get("/api/trending", async (req, reply) => {
  const genre = (req.query as { genre?: string }).genre;
  try {
    return { tracks: await audius.trending(genre) };
  } catch (e) {
    req.log.error(e);
    return reply.code(502).send({ error: "provider unavailable" });
  }
});

app.get("/api/track/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const t = await audius.getTrack(id);
  if (!t) return reply.code(404).send({ error: "not found" });
  return { track: t };
});

/**
 * Audio endpoint. We 302-redirect the client's <audio> element to the current
 * discovery node's stream URL (which itself redirects to the CDN). This keeps a
 * stable app-origin media URL even as the Audius node rotates, offloads the
 * audio bytes to Audius' CDN instead of our VPS, and lets the browser re-issue
 * Range requests against the final URL so seeking works.
 */
app.get("/api/stream/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const upstream = await audius.streamUrl(id);
  reply.header("access-control-allow-origin", "*");
  return reply.redirect(upstream, 302);
});

const port = Number(process.env.PORT) || 8080;
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
