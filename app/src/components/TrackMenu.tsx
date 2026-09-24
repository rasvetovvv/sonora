import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, ListPlus, Heart, Info, Copy, Check } from "lucide-react";
import { useUi } from "@/store/ui";
import { usePlayer } from "@/store/player";
import { useLikes } from "@/store/likes";
import { useState } from "react";
import * as api from "@/lib/api";

/** Right-click / "more" context menu for a track, positioned at the cursor. */
export function TrackMenu() {
  const { menuTrack, menuPos, closeMenu, openDetail, openAddToPlaylist } = useUi();
  const enqueue = usePlayer((s) => s.enqueue);
  const playNow = usePlayer((s) => s.playNow);
  const isLiked = useLikes((s) => (menuTrack ? s.isLiked(menuTrack) : false));
  const toggleLike = useLikes((s) => s.toggle);

  useEffect(() => {
    if (!menuTrack) return;
    const close = () => closeMenu();
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menuTrack, closeMenu]);

  return (
    <AnimatePresence>
      {menuTrack && menuPos && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12 }}
          style={{
            left: Math.min(menuPos.x, window.innerWidth - 220),
            top: Math.min(menuPos.y, window.innerHeight - 240),
          }}
          className="glass fixed z-50 w-52 overflow-hidden rounded-xl p-1.5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem
            icon={<Play size={15} />}
            label="Слушать"
            onClick={() => {
              playNow(menuTrack);
              closeMenu();
            }}
          />
          <MenuItem
            icon={<Plus size={15} />}
            label="В очередь"
            onClick={() => {
              enqueue(menuTrack);
              closeMenu();
            }}
          />
          <MenuItem
            icon={<ListPlus size={15} />}
            label="В плейлист…"
            onClick={() => openAddToPlaylist(menuTrack)}
          />
          <MenuItem
            icon={<Heart size={15} fill={isLiked ? "currentColor" : "none"} />}
            label={isLiked ? "Убрать лайк" : "В любимое"}
            onClick={() => {
              toggleLike(menuTrack);
              closeMenu();
            }}
          />
          <div className="my-1 h-px bg-white/10" />
          <MenuItem
            icon={<Info size={15} />}
            label="О треке"
            onClick={() => openDetail(menuTrack)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      <span className="text-white/50">{icon}</span>
      {label}
    </button>
  );
}

/** "Add to playlist" picker modal. */
export function AddToPlaylistModal() {
  const { addToPlaylistTrack, closeAddToPlaylist } = useUi();
  const qc = useQueryClient();
  const [creating, setCreating] = useState("");
  const [added, setAdded] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: ["playlists"],
    queryFn: api.getPlaylists,
    enabled: !!addToPlaylistTrack,
  });

  const add = async (playlistId: number) => {
    if (!addToPlaylistTrack) return;
    await api.addToPlaylist(playlistId, addToPlaylistTrack);
    setAdded(playlistId);
    qc.invalidateQueries({ queryKey: ["playlists"] });
    setTimeout(closeAddToPlaylist, 700);
  };

  const createAndAdd = async () => {
    if (!creating.trim() || !addToPlaylistTrack) return;
    const pl = await api.createPlaylist(creating.trim());
    await add(pl.id);
    setCreating("");
  };

  return (
    <AnimatePresence>
      {addToPlaylistTrack && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeAddToPlaylist}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="glass w-[min(92vw,380px)] rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-lg font-bold">В плейлист</h3>
            <p className="mb-4 truncate text-xs text-white/50">
              {addToPlaylistTrack.title}
            </p>

            <div className="mb-4 max-h-56 space-y-1 overflow-y-auto">
              {(data?.playlists ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-white/10"
                >
                  <span>{p.name}</span>
                  {added === p.id ? (
                    <Check size={16} className="text-accent" />
                  ) : (
                    <span className="text-xs text-white/40">{p.count}</span>
                  )}
                </button>
              ))}
              {data && data.playlists.length === 0 && (
                <p className="py-4 text-center text-sm text-white/40">
                  Пока нет плейлистов
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={creating}
                onChange={(e) => setCreating(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
                placeholder="Новый плейлист…"
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-accent/50"
              />
              <button
                onClick={createAndAdd}
                className="rounded-lg accent-gradient px-3 text-sm font-semibold text-black"
              >
                <Copy size={16} className="rotate-0" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
