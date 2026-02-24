import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ComparisonState {
  pokemonIds: number[];
  addPokemon: (id: number) => void;
  removePokemon: (id: number) => void;
  clearAll: () => void;
  hasPokemon: (id: number) => boolean;
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      pokemonIds: [],
      addPokemon: (id) =>
        set((state) => ({
          pokemonIds: state.pokemonIds.includes(id)
            ? state.pokemonIds
            : [...state.pokemonIds, id],
        })),
      removePokemon: (id) =>
        set((state) => ({
          pokemonIds: state.pokemonIds.filter((pid) => pid !== id),
        })),
      clearAll: () => set({ pokemonIds: [] }),
      hasPokemon: (id) => get().pokemonIds.includes(id),
    }),
    { name: "pokedia-comparison" }
  )
);
