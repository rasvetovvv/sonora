import { useMemo, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, ListMusic, Loader2, Play, Radio } from "lucide-react";
import { search, trending, type Track } from "@/lib/api";
import { usePlayer } from "@/store/player";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { TrackRow } from "@/components/TrackRow";
import { PlayerBar } from "@/components/PlayerBar";
import { QueuePanel } from "@/components/QueuePanel";
import { cn } from "@/lib/utils";

const GENRES = [
  "Electronic",
  "Hip-Hop/Rap",
  "Lo-Fi",
  "House",
  "Ambient",
  "Pop",
  "Rock",
  "Jazz",
];

export default function App() {
  const { seek, analyser } = useAudioEngine();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchQ = useQuery({
    queryKey: ["search", submitted],
    queryFn: ({ signal }) => search(submitted, signal),
    enabled: submitted.length > 0,
    placeholderData: keepPreviousData,
  });

  const trendingQ = useQuery({
    queryKey: ["trending", genre],
    queryFn: ({ signal }) => trending(genre ?? undefined, signal),
    enabled: submitted.length === 0,
    placeholderData: keepPreviousData,
  });

  const isSearch = submitted.length > 0;
  const activeQ = isSearch ? searchQ : trendingQ;
  const tracks: Track[] = activeQ.data?.tracks ?? [];

  const playQueue = usePlayer((s) => s.playQueue);

  const heading = useMemo(() => {
    if (isSearch) return `Результаты: «${submitted}»`;
    if (genre) return `${genre} — в тренде`;
    return "В тренде сейчас";
  }, [isSearch, submitted, genre]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="aurora" />

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="flex items-center gap-4 px-6 pb-2 pt-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-black">
                <Radio size={18} />
              </div>
              <span className="text-lg font-extrabold tracking-tight">
                Sonora
              </span>
            </div>

            <form onSubmit={onSubmit} className="relative mx-auto w-full max-w-lg">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск треков, исполнителей…"
                className="glass w-full rounded-full py-2.5 pl-11 pr-24 text-sm outline-none placeholder:text-white/35 focus:border-accent/60"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSubmitted("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-20 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                >
                  Очистить
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black transition hover:brightness-110"
              >
                Найти
              </button>
            </form>

            <button
              onClick={() => setQueueOpen((v) => !v)}
              title="Очередь"
              className={cn(
                "rounded-xl p-2.5 transition",
                queueOpen ? "bg-white/10 text-accent" : "text-white/50 hover:bg-white/5",
              )}
            >
              <ListMusic size={20} />
            </button>
          </header>

          {/* Genre chips (only when browsing) */}
          {!isSearch && (
            <div className="flex flex-wrap gap-2 px-6 py-3">
              <Chip active={genre === null} onClick={() => setGenre(null)}>
                Всё
              </Chip>
              {GENRES.map((g) => (
                <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>
                  {g}
                </Chip>
              ))}
            </div>
          )}

          {/* Content */}
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <div className="mb-3 flex items-center justify-between px-2">
              <h1 className="text-xl font-bold">{heading}</h1>
              {tracks.length > 0 && (
                <button
                  onClick={() => playQueue(tracks, 0)}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold transition hover:bg-white/20"
                >
                  <Play size={14} /> Слушать всё
                </button>
              )}
            </div>

            {activeQ.isLoading && (
              <div className="flex h-64 items-center justify-center text-white/40">
                <Loader2 className="animate-spin" />
              </div>
            )}

            {activeQ.isError && (
              <div className="mx-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                Не удалось загрузить треки. Проверьте соединение и попробуйте снова.
              </div>
            )}

            {!activeQ.isLoading && tracks.length === 0 && !activeQ.isError && (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-white/35">
                <Search size={30} />
                <p>Ничего не найдено</p>
              </div>
            )}

            <motion.div layout className="space-y-0.5">
              {tracks.map((t, i) => (
                <TrackRow key={t.id} track={t} contextQueue={tracks} index={i} />
              ))}
            </motion.div>
          </main>
        </div>

        <QueuePanel open={queueOpen} />
      </div>

      <PlayerBar seek={seek} analyser={analyser} />
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-medium transition",
        active
          ? "bg-white text-black"
          : "glass text-white/70 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
