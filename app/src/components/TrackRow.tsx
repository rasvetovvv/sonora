import { motion } from "framer-motion";
import { Play, Pause, Heart, MoreHorizontal, Music2 } from "lucide-react";
import type { Track } from "@/lib/api";
import { usePlayer } from "@/store/player";
import { useLikes } from "@/store/likes";
import { useUi } from "@/store/ui";
import { useAuth } from "@/store/auth";
import { cn, formatTime } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  soundcloud: "SoundCloud",
  audius: "Audius",
  upload: "Моё",
};

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
  const isPlaying = usePlayer((s) => s.isPlaying);
  const current = usePlayer((s) => s.current());
  const togglePlay = usePlayer((s) => s.togglePlay);
  const isLiked = useLikes((s) => s.isLiked(track));
  const toggleLike = useLikes((s) => s.toggle);
  const openMenu = useUi((s) => s.openMenu);
  const openDetail = useUi((s) => s.openDetail);
  const user = useAuth((s) => s.user);

  const active = current?.id === track.id && current?.source === track.source;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.015, 0.3) }}
      onContextMenu={(e) => {
        e.preventDefault();
        openMenu(track, { x: e.clientX, y: e.clientY });
      }}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
        active ? "bg-white/[0.08]" : "hover:bg-white/[0.05]",
      )}
    >
      <button
        onClick={() => (active ? togglePlay() : playNow(track, contextQueue))}
        onDoubleClick={() => openDetail(track)}
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
            "absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100",
            active && "opacity-100",
          )}
        >
          {active && isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </div>
      </button>

      <button onClick={() => openDetail(track)} className="min-w-0 flex-1 text-left">
        <p className={cn("truncate text-sm font-semibold", active && "accent-text")}>
          {track.title}
        </p>
        <p className="truncate text-xs text-white/50">
          {track.artist}
          <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
            {SOURCE_LABEL[track.source] ?? track.source}
          </span>
        </p>
      </button>

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

      {user && (
        <button
          onClick={() => toggleLike(track)}
          title={isLiked ? "Убрать из любимого" : "В любимое"}
          className={cn(
            "rounded-lg p-2 transition",
            isLiked
              ? "text-accent"
              : "text-white/35 opacity-0 hover:text-white group-hover:opacity-100",
          )}
        >
          <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
        </button>
      )}

      <span className="w-10 text-right text-xs tabular-nums text-white/40">
        {formatTime(track.duration)}
      </span>

      <button
        onClick={(e) => openMenu(track, { x: e.clientX, y: e.clientY })}
        title="Ещё"
        className="rounded-lg p-2 text-white/40 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
      >
        <MoreHorizontal size={18} />
      </button>
    </motion.div>
  );
}
