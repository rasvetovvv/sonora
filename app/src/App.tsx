import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { ListMusic, Loader2 } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useLikes } from "@/store/likes";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { AuthScreen } from "@/components/AuthScreen";
import { Sidebar, type View } from "@/components/Sidebar";
import { PlayerBar } from "@/components/PlayerBar";
import { QueuePanel } from "@/components/QueuePanel";
import { TrackMenu, AddToPlaylistModal } from "@/components/TrackMenu";
import { TrackDetail } from "@/components/TrackDetail";
import { UploadModal } from "@/components/UploadModal";
import { UpdateModal } from "@/components/UpdateModal";
import { BrowseView } from "@/views/BrowseView";
import { LikesView } from "@/views/LikesView";
import { PlaylistsView } from "@/views/PlaylistsView";
import { LibraryView } from "@/views/LibraryView";
import { cn } from "@/lib/utils";

export default function App() {
  const { user, ready, bootstrap } = useAuth();
  const loadLikes = useLikes((s) => s.load);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (user) loadLikes();
  }, [user, loadLikes]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  return <Shell />;
}

function Shell() {
  const { seek, analyser } = useAudioEngine();
  const [view, setView] = useState<View>("browse");
  const [queueOpen, setQueueOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const qc = useQueryClient();

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="aurora" />

      <div className="relative z-10 flex min-h-0 flex-1">
        <Sidebar view={view} setView={setView} onUpload={() => setUploadOpen(true)} />

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {view === "browse" && <BrowseView />}
              {view === "likes" && <LikesView />}
              {view === "playlists" && <PlaylistsView />}
              {view === "library" && <LibraryView onUpload={() => setUploadOpen(true)} />}
            </motion.div>
          </AnimatePresence>
        </main>

        <div className="relative flex">
          <button
            onClick={() => setQueueOpen((v) => !v)}
            title="Очередь"
            className={cn(
              "absolute right-4 top-6 z-20 rounded-xl p-2.5 transition",
              queueOpen ? "bg-white/10 text-accent" : "text-white/50 hover:bg-white/5",
            )}
          >
            <ListMusic size={20} />
          </button>
          <QueuePanel open={queueOpen} />
        </div>
      </div>

      <PlayerBar seek={seek} analyser={analyser} />

      {/* Overlays */}
      <TrackMenu />
      <TrackDetail />
      <AddToPlaylistModal />
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => qc.invalidateQueries({ queryKey: ["uploads"] })}
      />
      <UpdateModal />
    </div>
  );
}
