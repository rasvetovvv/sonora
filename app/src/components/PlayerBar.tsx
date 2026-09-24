import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Music2,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { cn, formatTime } from "@/lib/utils";
import { Visualizer } from "./Visualizer";

export function PlayerBar({
  seek,
  analyser,
}: {
  seek: (t: number) => void;
  analyser: React.MutableRefObject<AnalyserNode | null>;
}) {
  const {
    isPlaying,
    progress,
    duration,
    volume,
    muted,
    repeat,
    shuffle,
  } = usePlayer();
  const current = usePlayer((s) => s.current());
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="glass relative z-10 flex h-24 items-center gap-4 border-t px-4">
      {/* Now-playing meta */}
      <div className="flex w-[26%] min-w-0 items-center gap-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.id ?? "empty"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5 shadow-lg"
          >
            {current?.artwork ? (
              <img
                src={current.artwork}
                alt=""
                className={cn(
                  "h-full w-full object-cover",
                  isPlaying && "animate-spin-slow rounded-full",
                )}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/25">
                <Music2 />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {current?.title ?? "Ничего не играет"}
          </p>
          <p className="truncate text-xs text-white/50">
            {current?.artist ?? "Выберите трек"}
          </p>
        </div>
      </div>

      {/* Transport + progress */}
      <div className="flex flex-1 flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <IconBtn active={shuffle} onClick={toggleShuffle} title="Перемешать">
            <Shuffle size={18} />
          </IconBtn>
          <IconBtn onClick={prev} title="Назад">
            <SkipBack size={20} />
          </IconBtn>
          <button
            onClick={togglePlay}
            disabled={!current}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg transition enabled:hover:scale-105 disabled:opacity-40"
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
          </button>
          <IconBtn onClick={() => next(false)} title="Вперёд">
            <SkipForward size={20} />
          </IconBtn>
          <IconBtn active={repeat !== "off"} onClick={cycleRepeat} title="Повтор">
            {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </IconBtn>
        </div>

        <div className="flex w-full max-w-xl items-center gap-2">
          <span className="w-10 text-right text-[11px] tabular-nums text-white/40">
            {formatTime(progress)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={progress}
            onChange={(e) => seek(Number(e.target.value))}
            className="slider flex-1"
            style={sliderStyle(pct)}
          />
          <span className="w-10 text-[11px] tabular-nums text-white/40">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Visualizer + volume */}
      <div className="flex w-[26%] items-center justify-end gap-3">
        <div className="hidden h-10 w-28 lg:block">
          <Visualizer analyser={analyser} playing={isPlaying} />
        </div>
        <IconBtn onClick={toggleMute} title="Звук">
          {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </IconBtn>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="slider w-24"
          style={sliderStyle((muted ? 0 : volume) * 100)}
        />
      </div>

      <style>{sliderCss}</style>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-lg p-1.5 transition hover:text-white",
        active ? "text-accent" : "text-white/55",
      )}
    >
      {children}
    </button>
  );
}

function sliderStyle(pct: number): React.CSSProperties {
  return {
    background: `linear-gradient(to right, #a855f7 ${pct}%, rgba(255,255,255,0.14) ${pct}%)`,
  };
}

const sliderCss = `
.slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 999px;
  cursor: pointer;
  outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 8px rgba(168,85,247,0.8);
  transition: transform 0.1s;
}
.slider::-webkit-slider-thumb:hover { transform: scale(1.25); }
`;
