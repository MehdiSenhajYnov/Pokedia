import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_TABS = 20;

export interface Tab {
  id: string; // "pokemon-6", "move-42", "item-83"
  kind: "pokemon" | "move" | "item" | "ability";
  entityId: number;
  nameEn: string;
  nameFr: string;
  typeKey: string | null;
  spriteUrl?: string | null;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;

  openTab: (data: Omit<Tab, "id">, background?: boolean) => void;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  closeOthers: (id: string) => void;
  closeAll: () => void;
}

function makeId(kind: Tab["kind"], entityId: number): string {
  return `${kind}-${entityId}`;
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      openTab: (data, background) => {
        const id = makeId(data.kind, data.entityId);
        const { tabs } = get();
        const existing = tabs.find((t) => t.id === id);

        if (existing) {
          set({
            tabs: tabs.map((t) =>
              t.id === id ? { ...t, ...data, id } : t,
            ),
            ...(background ? {} : { activeTabId: id }),
          });
          return;
        }

        const tab: Tab = { ...data, id };
        let next = [...tabs, tab];

        // LRU eviction: remove oldest non-active tab if over limit
        if (next.length > MAX_TABS) {
          const activeId = get().activeTabId;
          const evictIdx = next.findIndex((t) => t.id !== activeId && t.id !== id);
          if (evictIdx !== -1) next.splice(evictIdx, 1);
        }

        set({ tabs: next, ...(background ? {} : { activeTabId: id }) });
      },

      closeTab: (id) => {
        const { tabs, activeTabId } = get();
        const idx = tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;

        const next = tabs.filter((t) => t.id !== id);
        let newActive = activeTabId;

        if (activeTabId === id) {
          // Switch to neighbor
          if (next.length === 0) {
            newActive = null;
          } else {
            const neighbor = Math.min(idx, next.length - 1);
            newActive = next[neighbor].id;
          }
        }

        set({ tabs: next, activeTabId: newActive });
      },

      setActive: (id) => set({ activeTabId: id }),

      closeOthers: (id) => {
        const { tabs } = get();
        set({
          tabs: tabs.filter((t) => t.id === id),
          activeTabId: id,
        });
      },

      closeAll: () => set({ tabs: [], activeTabId: null }),
    }),
    { name: "pokedia-tabs" },
  ),
);
