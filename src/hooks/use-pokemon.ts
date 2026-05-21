import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  getAllPokemon,
  getPokemonPage,
  getPokemonById,
  getPokemonAbilities,
  getPokemonEvolutionChain,
  getPokemonMoves,
  getAlternateForms,
  searchPokemon,
  type PokemonBrowserParams,
} from "@/lib/tauri";

export const POKEMON_BROWSER_PAGE_SIZE = 96;

export function useAllPokemon(enabled = true) {
  return useQuery({
    queryKey: ["pokemon", "all"],
    queryFn: getAllPokemon,
    enabled,
    staleTime: Infinity,
  });
}

export function useSearchPokemon(query: string, enabled = true) {
  return useQuery({
    queryKey: ["pokemon", "search", query],
    queryFn: () => searchPokemon(query),
    enabled: enabled && query.length > 0,
    staleTime: 60_000,
  });
}

export function usePokemonBrowserPages(
  params: PokemonBrowserParams,
  pageSize = POKEMON_BROWSER_PAGE_SIZE,
) {
  return useInfiniteQuery({
    queryKey: ["pokemon", "browser", params, pageSize],
    queryFn: ({ pageParam }) =>
      getPokemonPage({ ...params, limit: pageSize, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
      if (lastPage.items.length === 0 || loaded >= lastPage.total) {
        return undefined;
      }
      return loaded;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePokemonById(id: number | null) {
  return useQuery({
    queryKey: ["pokemon", id],
    queryFn: () => getPokemonById(id!),
    enabled: id !== null,
    staleTime: Infinity,
  });
}

export function usePokemonAbilities(pokemonId: number | null) {
  return useQuery({
    queryKey: ["pokemon-abilities", pokemonId],
    queryFn: () => getPokemonAbilities(pokemonId!),
    enabled: pokemonId !== null,
    staleTime: Infinity,
  });
}

export function usePokemonEvolutionChain(pokemonId: number | null) {
  return useQuery({
    queryKey: ["pokemon-evolution", pokemonId],
    queryFn: () => getPokemonEvolutionChain(pokemonId!),
    enabled: pokemonId !== null,
    staleTime: Infinity,
  });
}

export function useAlternateForms(chainId: number | null) {
  return useQuery({
    queryKey: ["pokemon-forms", chainId],
    queryFn: () => getAlternateForms(chainId!),
    enabled: chainId !== null,
    staleTime: Infinity,
  });
}

export function usePokemonMovesList(pokemonId: number | null) {
  return useQuery({
    queryKey: ["pokemon-moves", pokemonId],
    queryFn: () => getPokemonMoves(pokemonId!),
    enabled: pokemonId !== null,
    staleTime: Infinity,
  });
}
