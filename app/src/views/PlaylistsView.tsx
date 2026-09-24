import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ListMusic, Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { TrackList } from "@/components/TrackList";

export function PlaylistsView() {
  const [openId, setOpenId] = useState<number | null>(null);
  if (openId != null) return <PlaylistDetail id={openId} onBack={() => setOpenId(null)} />;
  return <PlaylistGrid onOpen={setOpenId} />;
}

function PlaylistGrid({ onOpen }: { onOpen: (id: number) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const q = useQuery({ queryKey: ["playlists"], queryFn: api.getPlaylists });

  const create = useMutation({
    mutationFn: () => api.createPlaylist(name.trim()),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
  const del = useMutation({
    mutationFn: (id: number) => api.deletePlaylist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playlists"] }),
  });

  return (
    <div>
      <div className="mb-5 flex items-end justify-between px-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Плейлисты</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
        className="mb-5 flex gap-2 px-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Новый плейлист…"
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm outline-none focus:border-accent/50"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="flex items-center gap-1.5 rounded-xl accent-gradient px-4 text-sm font-bold text-black"
        >
          {create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Создать
        </button>
      </form>

      {q.isLoading && (
        <div className="flex h-48 items-center justify-center text-white/40">
          <Loader2 className="animate-spin" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 px-2 sm:grid-cols-3 lg:grid-cols-4">
        {(q.data?.playlists ?? []).map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
            className="group relative cursor-pointer overflow-hidden rounded-2xl glass p-4 transition hover:bg-white/[0.07]"
            onClick={() => onOpen(p.id)}
          >
            <div className="mb-8 flex h-24 items-center justify-center rounded-xl accent-gradient/20 bg-white/5">
              <ListMusic size={30} className="text-accent" />
            </div>
            <p className="truncate font-semibold">{p.name}</p>
            <p className="text-xs text-white/45">{p.count} треков</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                del.mutate(p.id);
              }}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/40 opacity-0 transition hover:bg-white/10 hover:text-accent group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          </motion.div>
        ))}
      </div>

      {q.data && q.data.playlists.length === 0 && (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-white/35">
          <ListMusic size={30} />
          <p>Создайте первый плейлист</p>
        </div>
      )}
    </div>
  );
}

function PlaylistDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const q = useQuery({ queryKey: ["playlist", id], queryFn: () => api.getPlaylist(id) });
  const tracks = q.data?.tracks ?? [];

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft size={16} /> Все плейлисты
      </button>
      <TrackList
        title={q.data?.playlist.name ?? "Плейлист"}
        subtitle={`${tracks.length} треков`}
        tracks={tracks}
        loading={q.isLoading}
        empty={<p>Плейлист пуст — добавьте треки через меню ⋯</p>}
      />
    </div>
  );
}
