import { create } from "zustand";
import * as api from "@/lib/api";
import type { User } from "@/lib/api";

type AuthState = {
  user: User | null;
  ready: boolean; // initial /me check done
  setUser: (u: User | null) => void;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  setUser: (u) => set({ user: u }),
  bootstrap: async () => {
    if (!api.getToken()) {
      set({ ready: true });
      return;
    }
    try {
      const { user } = await api.me();
      set({ user, ready: true });
    } catch {
      api.clearToken();
      set({ user: null, ready: true });
    }
  },
  login: async (email, password) => {
    const { token, user } = await api.login(email, password);
    api.setToken(token);
    set({ user });
  },
  register: async (email, password, name) => {
    const { token, user } = await api.register(email, password, name);
    api.setToken(token);
    set({ user });
  },
  logout: () => {
    api.clearToken();
    set({ user: null });
  },
}));
