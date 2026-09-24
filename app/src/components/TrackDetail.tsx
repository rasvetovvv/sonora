import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Heart, ListPlus, Clock, Disc3, Music2 } from "lucide-react";
import { useUi } from "@/store/ui";
import { usePlayer } from "@/store/player";
import { useLikes } from "@/store/likes";
import { useAuth } from "@/store/auth";
import { formatTime } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  soundcloud: "SoundCloud",
  audius: "Audius",
  upload: "Загружено вами",
};

/** Full track detail modal — the "open song" menu. */
export function TrackDetail() {
  const { detailTrack, closeDetail, openAddToPlaylist } = useUi();
  const playNow = usePlayer((s) => s.playNow);
  const isLiked = useLikes((s) => (detailTrack ? s.isLiked(detailTrack) : false));
  const toggleLike = useLikes((s) => s.toggle);
  const user = useAuth((s) => s.user);

  return (
    <AnimatePresence>
      {detailTrack && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onClick={closeDetail}
        >
          <motion.div
            initial={{ scale: 0.94, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass relative w-[min(94vw,760px)] overflow-hidden rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Blurred artwork backdrop */}
            {detailTrack.artwork && (
              <div
                className="pointer-events-none absolute inset-0 opacity-25 blur-2xl"
                style={{
                  backgroundImage: `url(${detailTrack.artwork})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}

            <button
              onClick={closeDetail}
              className="absolute right-4 top-4 z-10 rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="relative flex flex-col gap-6 p-7 sm:flex-row sm:items-end">
              <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl bg-white/5 shadow-2xl">
                {detailTrack.artwork ? (
                  <img
                    src={detailTrack.artwork}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/25">
                    <Music2 size={48} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-xs uppercase tracking-wider text-white/50">
                  {SOURCE_LABEL[detailTrack.source] ?? detailTrack.source}
                </span>
                <h2 className="mt-1 text-3xl font-extrabold leading-tight">
                  {detailTrack.title}
                </h2>
                <p className="mt-1.5 flex items-center gap-2 text-white/60">
                  <Disc3 size={15} /> {detailTrack.artist}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-white/45">
                  <Clock size={14} /> {formatTime(detailTrack.duration)}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      playNow(detailTrack);
                      closeDetail();
                    }}
                    className="flex items-center gap-2 rounded-full accent-gradient px-6 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
                  >
                    <Play size={16} /> Слушать
                  </button>
                  {user && (
                    <>
                      <button
                        onClick={() => toggleLike(detailTrack)}
                        className={
                          "flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm transition hover:bg-white/10 " +
                          (isLiked ? "text-accent" : "text-white/80")
                        }
                      >
                        <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                        {isLiked ? "В любимом" : "В любимое"}
                      </button>
                      <button
                        onClick={() => openAddToPlaylist(detailTrack)}
                        className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10"
                      >
                        <ListPlus size={16} /> В плейлист
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
