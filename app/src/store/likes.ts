import { create } from "zustand";
import * as api from "@/lib/api";
import type { Track } from "@/lib/api";

const uid = (t: Pick<Track, "source" | "id">) => `${t.source}:${t.id}`;

type LikesState = {
  liked: Set<string>;
  loaded: boolean;
  load: () => Promise<void>;
  isLiked: (t: Track) => boolean;
  toggle: (t: Track) => Promise<void>;
  reset: () => void;
};

export const useLikes = create<LikesState>((set, get) => ({
  liked: new Set(),
  loaded: false,
  load: async () => {
    try {
      const { tracks } = await api.getLikes();
      set({ liked: new Set(tracks.map(uid)), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  isLiked: (t) => get().liked.has(uid(t)),
  toggle: async (t) => {
    const key = uid(t);
    // optimistic
    const next = new Set(get().liked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    set({ liked: next });
    try {
      await api.toggleLike(t);
    } catch {
      // revert on failure
      const revert = new Set(get().liked);
      if (revert.has(key)) revert.delete(key);
      else revert.add(key);
      set({ liked: revert });
    }
  },
  reset: () => set({ liked: new Set(), loaded: false }),
}));
