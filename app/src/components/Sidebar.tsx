import { motion } from "framer-motion";
import { Radio, Search, Heart, ListMusic, Upload, LogOut, Library } from "lucide-react";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

export type View = "browse" | "likes" | "playlists" | "library";

const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "browse", label: "Обзор", icon: <Search size={18} /> },
  { id: "likes", label: "Любимое", icon: <Heart size={18} /> },
  { id: "playlists", label: "Плейлисты", icon: <ListMusic size={18} /> },
  { id: "library", label: "Мои треки", icon: <Library size={18} /> },
];

export function Sidebar({
  view,
  setView,
  onUpload,
}: {
  view: View;
  setView: (v: View) => void;
  onUpload: () => void;
}) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <aside className="relative z-10 flex w-60 shrink-0 flex-col p-4">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient text-black">
          <Radio size={18} />
        </div>
        <span className="text-lg font-extrabold tracking-tight">Sonora</span>
      </div>

      <nav className="space-y-1">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              view === item.id ? "text-white" : "text-white/55 hover:text-white",
            )}
          >
            {view === item.id && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-white/10"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{item.icon}</span>
            <span className="relative z-10">{item.label}</span>
          </button>
        ))}
      </nav>

      <button
        onClick={onUpload}
        className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-sm text-white/70 transition hover:border-accent/50 hover:text-white"
      >
        <Upload size={18} /> Загрузить трек
      </button>

      <div className="mt-auto">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full accent-gradient text-sm font-bold text-black">
            {(user?.display_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.display_name}</p>
            <p className="truncate text-xs text-white/45">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Выйти"
            className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
