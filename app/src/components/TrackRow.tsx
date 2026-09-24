import { motion } from "framer-motion";
import { Play, Pause, Plus, Music2 } from "lucide-react";
import type { Track } from "@/lib/api";
import { usePlayer } from "@/store/player";
import { cn, formatTime } from "@/lib/utils";

export function TrackRow({
  track,
  contextQueue,
  index,
}: {
  track: Track;
  contextQueue: Track[];
  index: number;
}) {
  const playNow = usePlayer((s) => s.playNow);
  const enqueue = usePlayer((s) => s.enqueue);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const current = usePlayer((s) => s.current());
  const togglePlay = usePlayer((s) => s.togglePlay);

  const active = current?.id === track.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.4) }}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
        active ? "bg-white/10" : "hover:bg-white/[0.06]",
      )}
    >
      <button
        onClick={() => (active ? togglePlay() : playNow(track, contextQueue))}
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5"
      >
        {track.artworkSmall ? (
          <img
            src={track.artworkSmall}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/30">
            <Music2 size={20} />
          </div>
        )}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity",
            "group-hover:opacity-100",
            active && "opacity-100",
          )}
        >
          {active && isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </div>
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            active && "text-accent",
          )}
        >
          {track.title}
        </p>
        <p className="truncate text-xs text-white/50">{track.artist}</p>
      </div>

      {active && isPlaying && (
        <div className="flex items-end gap-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-0.5 origin-bottom rounded-full bg-accent animate-bar"
              style={{ height: 14, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}

      <span className="w-10 text-right text-xs tabular-nums text-white/40">
        {formatTime(track.duration)}
      </span>

      <button
        onClick={() => enqueue(track)}
        title="В очередь"
        className="rounded-lg p-2 text-white/40 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
      >
        <Plus size={16} />
      </button>
    </motion.div>
  );
}
