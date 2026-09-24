import { motion } from "framer-motion";
import { Play, Loader2, Music2 } from "lucide-react";
import type { Track } from "@/lib/api";
import { usePlayer } from "@/store/player";
import { TrackRow } from "./TrackRow";

/** Shared list surface with a header, "play all", loading/empty states. */
export function TrackList({
  title,
  subtitle,
  tracks,
  loading,
  error,
  empty,
}: {
  title: string;
  subtitle?: string;
  tracks: Track[];
  loading?: boolean;
  error?: string | null;
  empty?: React.ReactNode;
}) {
  const playQueue = usePlayer((s) => s.playQueue);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between px-2">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-extrabold tracking-tight"
          >
            {title}
          </motion.h1>
          {subtitle && <p className="mt-0.5 text-sm text-white/45">{subtitle}</p>}
        </div>
        {tracks.length > 0 && (
          <button
            onClick={() => playQueue(tracks, 0)}
            className="flex items-center gap-1.5 rounded-full accent-gradient px-4 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
          >
            <Play size={14} /> Слушать всё
          </button>
        )}
      </div>

      {loading && (
        <div className="flex h-64 items-center justify-center text-white/40">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {error && (
        <div className="mx-2 rounded-xl border border-accent/30 bg-accent/10 p-4 text-center text-sm text-accent">
          {error}
        </div>
      )}

      {!loading && !error && tracks.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-white/35">
          <Music2 size={30} />
          {empty ?? <p>Пусто</p>}
        </div>
      )}

      <div className="space-y-0.5">
        {tracks.map((t, i) => (
          <TrackRow key={`${t.source}:${t.id}`} track={t} contextQueue={tracks} index={i} />
        ))}
      </div>
    </div>
  );
}
