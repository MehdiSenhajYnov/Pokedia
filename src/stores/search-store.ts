import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SearchState {
  query: string;
  searchActive: boolean;
  pokemonTypeFilter: string | null;
  pokemonSort: string;
  pokemonViewMode: "grid" | "list";
  pokemonFavoritesOnly: boolean;
  pokemonGenFilter: number | null;
  moveTypeFilter: string | null;
  moveDamageClassFilter: string | null;
  movePowerMin: number | null;
  movePowerMax: number | null;
  itemCategoryFilter: string | null;
  itemViewMode: "grid" | "list";

  setQuery: (q: string) => void;
  activateSearch: () => void;
  dismissSearch: () => void;
  setPokemonTypeFilter: (t: string | null) => void;
  setPokemonSort: (s: string) => void;
  setPokemonViewMode: (m: "grid" | "list") => void;
  setPokemonFavoritesOnly: (v: boolean) => void;
  setPokemonGenFilter: (g: number | null) => void;
  setMoveTypeFilter: (t: string | null) => void;
  setMoveDamageClassFilter: (c: string | null) => void;
  setMovePowerMin: (v: number | null) => void;
  setMovePowerMax: (v: number | null) => void;
  setItemCategoryFilter: (c: string | null) => void;
  setItemViewMode: (m: "grid" | "list") => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      query: "",
      searchActive: false,
      pokemonTypeFilter: null,
      pokemonSort: "id",
      pokemonViewMode: "list",
      pokemonFavoritesOnly: false,
      pokemonGenFilter: null,
      moveTypeFilter: null,
      moveDamageClassFilter: null,
      movePowerMin: null,
      movePowerMax: null,
      itemCategoryFilter: null,
      itemViewMode: "list",

      setQuery: (query) => set({ query, searchActive: query.length > 0 }),
      activateSearch: () => set({ searchActive: true }),
      dismissSearch: () => set({ searchActive: false }),
      setPokemonTypeFilter: (pokemonTypeFilter) => set({ pokemonTypeFilter }),
      setPokemonSort: (pokemonSort) => set({ pokemonSort }),
      setPokemonViewMode: (pokemonViewMode) => set({ pokemonViewMode }),
      setPokemonFavoritesOnly: (pokemonFavoritesOnly) => set({ pokemonFavoritesOnly }),
      setPokemonGenFilter: (pokemonGenFilter) => set({ pokemonGenFilter }),
      setMoveTypeFilter: (moveTypeFilter) => set({ moveTypeFilter }),
      setMoveDamageClassFilter: (moveDamageClassFilter) =>
        set({ moveDamageClassFilter }),
      setMovePowerMin: (movePowerMin) => set({ movePowerMin }),
      setMovePowerMax: (movePowerMax) => set({ movePowerMax }),
      setItemCategoryFilter: (itemCategoryFilter) => set({ itemCategoryFilter }),
      setItemViewMode: (itemViewMode) => set({ itemViewMode }),
    }),
    {
      name: "pokedia-search",
      // Only persist view mode preferences, not transient search queries
      partialize: (state) => ({
        pokemonViewMode: state.pokemonViewMode,
        itemViewMode: state.itemViewMode,
      }),
    }
  )
);
