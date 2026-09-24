import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { X, UploadCloud, Loader2, CheckCircle2 } from "lucide-react";
import * as api from "@/lib/api";

export function UploadModal({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Выберите файл");
      await api.uploadTrack(file, title || file.name.replace(/\.[^.]+$/, ""), artist || "Me");
    },
    onSuccess: () => {
      onUploaded();
      setTimeout(() => {
        reset();
        onClose();
      }, 900);
    },
  });

  const reset = () => {
    setFile(null);
    setTitle("");
    setArtist("");
    mut.reset();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            className="glass w-[min(92vw,440px)] rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">Загрузить трек</h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {mut.isSuccess ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 size={40} className="text-accent" />
                <p className="font-semibold">Готово!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-8 text-center transition hover:border-accent/50">
                  <UploadCloud size={28} className="text-white/50" />
                  <span className="text-sm text-white/70">
                    {file ? file.name : "Выберите аудиофайл (mp3, m4a, wav)"}
                  </span>
                  <span className="text-xs text-white/35">до 25 МБ</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFile(f);
                      if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                    }}
                  />
                </label>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none focus:border-accent/50"
                />
                <input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Исполнитель"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none focus:border-accent/50"
                />

                {mut.isError && (
                  <p className="text-xs text-accent">
                    {(mut.error as Error).message}
                  </p>
                )}

                <button
                  onClick={() => mut.mutate()}
                  disabled={!file || mut.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl accent-gradient py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  {mut.isPending && <Loader2 size={16} className="animate-spin" />}
                  Загрузить
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
