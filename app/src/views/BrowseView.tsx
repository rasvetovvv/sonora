import { useMemo, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { search, trending, type Source, type Track } from "@/lib/api";
import { TrackList } from "@/components/TrackList";
import { cn } from "@/lib/utils";

const GENRES = ["Lo-Fi", "Phonk", "House", "Chill", "Hip-Hop", "Electronic"];

export function BrowseView() {
  const [source, setSource] = useState<Source>("soundcloud");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isSearch = submitted.length > 0;

  const searchQ = useQuery({
    queryKey: ["search", source, submitted],
    queryFn: ({ signal }) => search(submitted, source, signal),
    enabled: isSearch,
    placeholderData: keepPreviousData,
  });
  const trendingQ = useQuery({
    queryKey: ["trending", source],
    queryFn: ({ signal }) => trending(source, undefined, signal),
    enabled: !isSearch,
    placeholderData: keepPreviousData,
  });

  const activeQ = isSearch ? searchQ : trendingQ;
  const tracks: Track[] = activeQ.data?.tracks ?? [];

  const heading = useMemo(
    () => (isSearch ? `Результаты: «${submitted}»` : "Популярное"),
    [isSearch, submitted],
  );

  return (
    <div>
      {/* Search + source switch */}
      <div className="mb-5 flex flex-col gap-3 px-2 sm:flex-row sm:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(query.trim());
          }}
          className="relative flex-1"
        >
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск треков, исполнителей…"
            className="glass w-full rounded-full py-2.5 pl-11 pr-24 text-sm outline-none placeholder:text-white/35 focus-within:border-accent/50"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full accent-gradient px-4 py-1.5 text-xs font-bold text-black"
          >
            Найти
          </button>
        </form>

        <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 text-xs">
          {(["soundcloud", "audius"] as Source[]).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium capitalize transition",
                source === s ? "bg-white text-black" : "text-white/60 hover:text-white",
              )}
            >
              {s === "soundcloud" ? "SoundCloud" : "Audius"}
            </button>
          ))}
        </div>
      </div>

      {/* Quick genre chips */}
      {!isSearch && (
        <div className="mb-4 flex flex-wrap gap-2 px-2">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => {
                setQuery(g);
                setSubmitted(g);
              }}
              className="glass rounded-full px-4 py-1.5 text-xs font-medium text-white/70 transition hover:text-white"
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <TrackList
        title={heading}
        subtitle={source === "soundcloud" ? "Источник: SoundCloud" : "Источник: Audius"}
        tracks={tracks}
        loading={activeQ.isLoading}
        error={activeQ.isError ? "Не удалось загрузить. Попробуйте другой источник." : null}
        empty={<p>Ничего не найдено</p>}
      />
    </div>
  );
}
