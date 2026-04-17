"use client";

import { create } from "zustand";

interface SocialConnection {
  platform: string;
  platformUserId: string;
  instagramAccountId: string | null;
  isActive: boolean;
  connectedAt: string;
}

interface AuthState {
  socialConnections: SocialConnection[];
  isLoadingConnections: boolean;

  setSocialConnections: (connections: SocialConnection[]) => void;
  setLoadingConnections: (v: boolean) => void;
  fetchConnections: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  socialConnections: [],
  isLoadingConnections: false,

  setSocialConnections: (connections) => set({ socialConnections: connections }),
  setLoadingConnections: (v) => set({ isLoadingConnections: v }),

  fetchConnections: async () => {
    set({ isLoadingConnections: true });
    try {
      const res = await fetch("/api/social/connections");
      if (res.ok) {
        const json = (await res.json()) as { connections: SocialConnection[] };
        set({ socialConnections: json.connections });
      }
    } catch {
      // non-critical
    } finally {
      set({ isLoadingConnections: false });
    }
  },
}));
