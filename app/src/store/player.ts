import { create } from "zustand";
import type { Track } from "@/lib/api";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  queue: Track[];
  index: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  progress: number; // seconds
  duration: number; // seconds

  current: () => Track | null;
  playNow: (track: Track, contextQueue?: Track[]) => void;
  playQueue: (tracks: Track[], startIndex: number) => void;
  enqueue: (track: Track) => void;
  togglePlay: () => void;
  setPlaying: (v: boolean) => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  setProgress: (p: number) => void;
  setDuration: (d: number) => void;
};

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: -1,
  isPlaying: false,
  volume: 0.8,
  muted: false,
  repeat: "off",
  shuffle: false,
  progress: 0,
  duration: 0,

  current: () => {
    const { queue, index } = get();
    return index >= 0 && index < queue.length ? queue[index] : null;
  },

  playNow: (track, contextQueue) => {
    const queue = contextQueue?.length ? contextQueue : [track];
    const index = queue.findIndex((t) => t.id === track.id);
    set({ queue, index: index >= 0 ? index : 0, isPlaying: true, progress: 0 });
  },

  playQueue: (tracks, startIndex) =>
    set({ queue: tracks, index: startIndex, isPlaying: true, progress: 0 }),

  enqueue: (track) => set((s) => ({ queue: [...s.queue, track] })),

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (v) => set({ isPlaying: v }),

  next: (auto = false) => {
    const { queue, index, repeat, shuffle } = get();
    if (queue.length === 0) return;
    if (auto && repeat === "one") {
      set({ progress: 0, isPlaying: true });
      return;
    }
    let nextIndex: number;
    if (shuffle) {
      nextIndex =
        queue.length === 1 ? index : Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = index + 1;
    }
    if (nextIndex >= queue.length) {
      if (repeat === "all") nextIndex = 0;
      else {
        set({ isPlaying: false });
        return;
      }
    }
    set({ index: nextIndex, progress: 0, isPlaying: true });
  },

  prev: () => {
    const { index, progress } = get();
    // Restart the track if we're more than 3s in, otherwise go back.
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }
    set({ index: Math.max(0, index - 1), progress: 0, isPlaying: true });
  },

  setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)), muted: false }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
    })),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  setProgress: (p) => set({ progress: p }),
  setDuration: (d) => set({ duration: d }),
}));
