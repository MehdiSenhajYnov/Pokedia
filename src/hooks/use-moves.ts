import { useQuery } from "@tanstack/react-query";
import { getAllMoves, getMoveById, searchMoves, getPokemonMoves } from "@/lib/tauri";

export function useAllMoves() {
  return useQuery({
    queryKey: ["moves", "all"],
    queryFn: getAllMoves,
    staleTime: Infinity,
  });
}

export function useMoveById(id: number | null) {
  return useQuery({
    queryKey: ["moves", id],
    queryFn: () => getMoveById(id!),
    enabled: id !== null,
    staleTime: Infinity,
  });
}

export function useSearchMoves(query: string) {
  return useQuery({
    queryKey: ["moves", "search", query],
    queryFn: () => searchMoves(query),
    enabled: query.length > 0,
    staleTime: 60_000,
  });
}

export function usePokemonMoves(pokemonId: number | null) {
  return useQuery({
    queryKey: ["pokemon-moves", pokemonId],
    queryFn: () => getPokemonMoves(pokemonId!),
    enabled: pokemonId !== null,
    staleTime: Infinity,
  });
}
