import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentStore {
  recentIds: number[];
  addRecent: (id: number) => void;
}

const MAX_RECENT = 20;

export const useRecentStore = create<RecentStore>()(
  persist(
    (set) => ({
      recentIds: [],
      addRecent: (id) =>
        set((state) => {
          const filtered = state.recentIds.filter((r) => r !== id);
          return { recentIds: [id, ...filtered].slice(0, MAX_RECENT) };
        }),
    }),
    { name: "pokedia-recent" },
  ),
);
