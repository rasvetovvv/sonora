import { motion } from "framer-motion";
import { ListMusic, Trash2, Music2 } from "lucide-react";
import { usePlayer } from "@/store/player";
import { cn } from "@/lib/utils";

export function QueuePanel({ open }: { open: boolean }) {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playQueue = usePlayer((s) => s.playQueue);

  return (
    <motion.aside
      animate={{ width: open ? 320 : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 shrink-0 overflow-hidden"
    >
      <div className="glass m-3 ml-0 flex h-[calc(100%-1.5rem)] w-[300px] flex-col rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <ListMusic size={18} className="text-accent" />
          <h2 className="text-sm font-bold">Очередь</h2>
          <span className="ml-auto text-xs text-white/40">{queue.length}</span>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {queue.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white/30">
              <Trash2 size={28} />
              <p className="text-sm">Очередь пуста</p>
            </div>
          )}
          {queue.map((t, i) => (
            <button
              key={`${t.id}-${i}`}
              onClick={() => playQueue(queue, i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition",
                i === index ? "bg-white/10" : "hover:bg-white/5",
              )}
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-white/5">
                {t.artworkSmall ? (
                  <img src={t.artworkSmall} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/30">
                    <Music2 size={16} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-xs font-semibold",
                    i === index && "text-accent",
                  )}
                >
                  {t.title}
                </p>
                <p className="truncate text-[11px] text-white/45">{t.artist}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
