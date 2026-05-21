import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SearchState {
  query: string;
  searchActive: boolean;
  searchNavIndex: number;
  searchNavTotal: number;
  pokemonTypeFilter: string | null;
  pokemonType2Filter: string | null;
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
  setSearchNavIndex: (idx: number) => void;
  setSearchNavTotal: (total: number) => void;
  setPokemonTypeFilter: (t: string | null) => void;
  setPokemonType2Filter: (t: string | null) => void;
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
  resetAllFilters: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      query: "",
      searchActive: false,
      searchNavIndex: -1,
      searchNavTotal: 0,
      pokemonTypeFilter: null,
      pokemonType2Filter: null,
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

      setQuery: (query) => set({ query, searchActive: query.length > 0, searchNavIndex: -1 }),
      activateSearch: () => set({ searchActive: true }),
      dismissSearch: () => set({ searchActive: false, searchNavIndex: -1, searchNavTotal: 0 }),
      setSearchNavIndex: (searchNavIndex) => set({ searchNavIndex }),
      setSearchNavTotal: (searchNavTotal) => set({ searchNavTotal }),
      setPokemonTypeFilter: (pokemonTypeFilter) => set((state) => ({
        pokemonTypeFilter,
        // Clear type 2 if type 1 is cleared or set to same value as type 2
        pokemonType2Filter: pokemonTypeFilter === null || pokemonTypeFilter === state.pokemonType2Filter
          ? null
          : state.pokemonType2Filter,
      })),
      setPokemonType2Filter: (pokemonType2Filter) => set({ pokemonType2Filter }),
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
      resetAllFilters: () =>
        set({
          query: "",
          searchActive: false,
          pokemonTypeFilter: null,
          pokemonType2Filter: null,
          pokemonSort: "id",
          pokemonFavoritesOnly: false,
          pokemonGenFilter: null,
          moveTypeFilter: null,
          moveDamageClassFilter: null,
          movePowerMin: null,
          movePowerMax: null,
          itemCategoryFilter: null,
        }),
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
