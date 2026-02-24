import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SearchState {
  pokemonQuery: string;
  pokemonTypeFilter: string | null;
  pokemonSort: string;
  pokemonViewMode: "grid" | "list";
  pokemonFavoritesOnly: boolean;
  pokemonGenFilter: number | null;
  moveQuery: string;
  moveTypeFilter: string | null;
  moveDamageClassFilter: string | null;
  movePowerMin: number | null;
  movePowerMax: number | null;
  expandedMoveId: number | null;
  itemQuery: string;
  itemCategoryFilter: string | null;

  setPokemonQuery: (q: string) => void;
  setPokemonTypeFilter: (t: string | null) => void;
  setPokemonSort: (s: string) => void;
  setPokemonViewMode: (m: "grid" | "list") => void;
  setPokemonFavoritesOnly: (v: boolean) => void;
  setPokemonGenFilter: (g: number | null) => void;
  setMoveQuery: (q: string) => void;
  setExpandedMoveId: (id: number | null) => void;
  setMoveTypeFilter: (t: string | null) => void;
  setMoveDamageClassFilter: (c: string | null) => void;
  setMovePowerMin: (v: number | null) => void;
  setMovePowerMax: (v: number | null) => void;
  setItemQuery: (q: string) => void;
  setItemCategoryFilter: (c: string | null) => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      pokemonQuery: "",
      pokemonTypeFilter: null,
      pokemonSort: "id",
      pokemonViewMode: "list",
      pokemonFavoritesOnly: false,
      pokemonGenFilter: null,
      moveQuery: "",
      expandedMoveId: null,
      moveTypeFilter: null,
      moveDamageClassFilter: null,
      movePowerMin: null,
      movePowerMax: null,
      itemQuery: "",
      itemCategoryFilter: null,

      setPokemonQuery: (pokemonQuery) => set({ pokemonQuery }),
      setPokemonTypeFilter: (pokemonTypeFilter) => set({ pokemonTypeFilter }),
      setPokemonSort: (pokemonSort) => set({ pokemonSort }),
      setPokemonViewMode: (pokemonViewMode) => set({ pokemonViewMode }),
      setPokemonFavoritesOnly: (pokemonFavoritesOnly) => set({ pokemonFavoritesOnly }),
      setPokemonGenFilter: (pokemonGenFilter) => set({ pokemonGenFilter }),
      setMoveQuery: (moveQuery) => set({ moveQuery }),
      setExpandedMoveId: (expandedMoveId) => set({ expandedMoveId }),
      setMoveTypeFilter: (moveTypeFilter) => set({ moveTypeFilter }),
      setMoveDamageClassFilter: (moveDamageClassFilter) =>
        set({ moveDamageClassFilter }),
      setMovePowerMin: (movePowerMin) => set({ movePowerMin }),
      setMovePowerMax: (movePowerMax) => set({ movePowerMax }),
      setItemQuery: (itemQuery) => set({ itemQuery }),
      setItemCategoryFilter: (itemCategoryFilter) => set({ itemCategoryFilter }),
    }),
    {
      name: "pokedia-search",
      // Only persist the view mode preference, not transient search queries
      partialize: (state) => ({ pokemonViewMode: state.pokemonViewMode }),
    }
  )
);
