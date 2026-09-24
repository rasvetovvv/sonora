import { create } from "zustand";
import type { Track } from "@/lib/api";

/** Which track's context menu / detail modal is open, and where to anchor it. */
type UiState = {
  menuTrack: Track | null;
  menuPos: { x: number; y: number } | null;
  detailTrack: Track | null;
  addToPlaylistTrack: Track | null;
  openMenu: (t: Track, pos: { x: number; y: number }) => void;
  closeMenu: () => void;
  openDetail: (t: Track) => void;
  closeDetail: () => void;
  openAddToPlaylist: (t: Track) => void;
  closeAddToPlaylist: () => void;
};

export const useUi = create<UiState>((set) => ({
  menuTrack: null,
  menuPos: null,
  detailTrack: null,
  addToPlaylistTrack: null,
  openMenu: (t, pos) => set({ menuTrack: t, menuPos: pos }),
  closeMenu: () => set({ menuTrack: null, menuPos: null }),
  openDetail: (t) => set({ detailTrack: t, menuTrack: null, menuPos: null }),
  closeDetail: () => set({ detailTrack: null }),
  openAddToPlaylist: (t) =>
    set({ addToPlaylistTrack: t, menuTrack: null, menuPos: null }),
  closeAddToPlaylist: () => set({ addToPlaylistTrack: null }),
}));
