# Sonora 🎧

A modern, animated desktop music player. Streams real, full-length tracks from
**Audius** (legal, zero-key, artist-uploaded) — no manual uploads. Search,
trending by genre, queue, animated visualizer, and a polished dark UI.

Distributed as a **Windows `.exe`** (Tauri). The data backend runs on the VPS.

## Stack
| Layer | Tech |
|---|---|
| Desktop shell | **Tauri 2** (Rust) → light `.exe` (~10 MB), NSIS installer |
| UI | React 18 + TypeScript + **Tailwind CSS** + **Framer Motion** |
| State | **Zustand** (player store) |
| Data | **TanStack Query** |
| Audio | HTML5 `<audio>` + Web Audio API analyser (visualizer) |
| Backend | Fastify + TypeScript, Audius provider, Docker |
| Music source | Audius (real full streaming, no API key) |

## Layout
```
sonora/
├── server/     # Fastify API — /api/search, /api/trending, /api/track/:id, /api/stream/:id
├── app/        # React UI + Tauri desktop wrapper
│   └── src-tauri/   # Rust shell, icons, tauri.conf.json
└── .github/workflows/build-windows.yml   # CI: builds the Windows .exe
```

## Backend (deployed)
Public API: **https://sonora.vexory.xyz** (behind the shared Caddy on the VPS).
- `GET /api/search?q=...` — search tracks
- `GET /api/trending[?genre=House]` — trending
- `GET /api/track/:id` — one track
- `GET /api/stream/:id` — 302 → current Audius CDN (stable app-origin media URL)

Run locally:
```bash
cd server && npm install && npm run build && npm start   # :8080
```
On the VPS it's a Docker service (`sonora-api`) on the `hosting_default` network.

## Desktop app
```bash
cd app
npm install
npm run dev        # web dev server (browser) — VITE_API_BASE overrides the API
npm run tauri dev  # native window (needs Rust + system webview)
```

The UI defaults to the public API; override with `VITE_API_BASE` at build time.

## Building the Windows .exe
Rust/Windows toolchain isn't on the Linux VPS, so the installer is produced by
**GitHub Actions** on `windows-latest`:

1. Push this repo to GitHub.
2. Either push a tag `vX.Y.Z` or run the **build-windows** workflow manually
   (Actions → build-windows → Run workflow).
3. Download `Sonora_x.y.z_x64-setup.exe` from the workflow artifacts (and the
   auto-created Release).

> The installer is **unsigned** (no Authenticode cert), so Windows SmartScreen
> shows an "Unknown publisher" prompt on first run — expected for an MVP.

## Notes
- Only Audius is wired now (real playback). Spotify OAuth (metadata/playlists)
  and a SoundCloud widget are planned as additive sources.
- No music is stored on the VPS — the stream endpoint redirects to Audius' CDN.
