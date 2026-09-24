import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Download, X, CheckCircle2 } from "lucide-react";

/**
 * Auto-update modal. Uses the Tauri updater plugin when running inside the
 * desktop app; in the browser it's inert. Beautiful, non-blocking: shows
 * version + notes, a download progress bar, and a "restart now" button.
 */
type UpdateState =
  | { phase: "idle" }
  | { phase: "available"; version: string; notes: string }
  | { phase: "downloading"; version: string; pct: number }
  | { phase: "ready"; version: string }
  | { phase: "error"; message: string };

export function UpdateModal() {
  const [state, setState] = useState<UpdateState>({ phase: "idle" });
  const [update, setUpdate] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only runs in the Tauri desktop shell.
      if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
      try {
        const updater = await import("@tauri-apps/plugin-updater").catch(
          () => null as any,
        );
        if (!updater) return;
        const u = await updater.check();
        if (!u || cancelled) return;
        setUpdate(u);
        setState({
          phase: "available",
          version: u.version,
          notes: u.body ?? "Улучшения и исправления.",
        });
      } catch {
        // No update endpoint / offline — silently ignore.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const install = async () => {
    if (!update) return;
    try {
      let downloaded = 0;
      let total = 0;
      setState({ phase: "downloading", version: update.version, pct: 0 });
      await update.downloadAndInstall((ev: any) => {
        if (ev.event === "Started") total = ev.data.contentLength ?? 0;
        else if (ev.event === "Progress") {
          downloaded += ev.data.chunkLength ?? 0;
          const pct = total ? Math.round((downloaded / total) * 100) : 0;
          setState({ phase: "downloading", version: update.version, pct });
        } else if (ev.event === "Finished") {
          setState({ phase: "ready", version: update.version });
        }
      });
      setState({ phase: "ready", version: update.version });
    } catch (e) {
      setState({ phase: "error", message: (e as Error).message });
    }
  };

  const relaunchApp = async () => {
    const proc = await import("@tauri-apps/plugin-process").catch(
      () => null as any,
    );
    if (proc) await proc.relaunch();
  };

  const dismiss = () => setState({ phase: "idle" });

  return (
    <AnimatePresence>
      {state.phase !== "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-28 right-6 z-[60] w-80"
        >
          <div className="glass overflow-hidden rounded-2xl shadow-2xl">
            <div className="relative accent-gradient px-5 py-4 text-black">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <span className="font-bold">Обновление Sonora</span>
              </div>
              {(state.phase === "available" || state.phase === "error") && (
                <button
                  onClick={dismiss}
                  className="absolute right-3 top-3 rounded-md p-1 text-black/60 hover:bg-black/10 hover:text-black"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="p-5">
              {state.phase === "available" && (
                <>
                  <p className="text-sm font-semibold">Версия {state.version}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-white/55">
                    {state.notes}
                  </p>
                  <button
                    onClick={install}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl accent-gradient py-2.5 text-sm font-bold text-black transition hover:brightness-110"
                  >
                    <Download size={16} /> Обновить
                  </button>
                </>
              )}

              {state.phase === "downloading" && (
                <>
                  <p className="text-sm font-semibold">Загрузка {state.version}…</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full accent-gradient"
                      animate={{ width: `${state.pct}%` }}
                      transition={{ ease: "linear" }}
                    />
                  </div>
                  <p className="mt-2 text-right text-xs text-white/50">{state.pct}%</p>
                </>
              )}

              {state.phase === "ready" && (
                <>
                  <div className="mb-3 flex items-center gap-2 text-accent">
                    <CheckCircle2 size={18} />
                    <p className="text-sm font-semibold">Готово к установке</p>
                  </div>
                  <button
                    onClick={relaunchApp}
                    className="flex w-full items-center justify-center gap-2 rounded-xl accent-gradient py-2.5 text-sm font-bold text-black transition hover:brightness-110"
                  >
                    Перезапустить
                  </button>
                </>
              )}

              {state.phase === "error" && (
                <p className="text-sm text-accent">
                  Не удалось обновить: {state.message}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
