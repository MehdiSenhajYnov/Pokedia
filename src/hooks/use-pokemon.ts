import { useQuery } from "@tanstack/react-query";
import {
  getAllPokemon,
  getPokemonById,
  getPokemonAbilities,
  getPokemonEvolutionChain,
  getPokemonMoves,
} from "@/lib/tauri";

export function useAllPokemon() {
  return useQuery({
    queryKey: ["pokemon", "all"],
    queryFn: getAllPokemon,
    staleTime: Infinity,
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

export function usePokemonMovesList(pokemonId: number | null) {
  return useQuery({
    queryKey: ["pokemon-moves", pokemonId],
    queryFn: () => getPokemonMoves(pokemonId!),
    enabled: pokemonId !== null,
    staleTime: Infinity,
  });
}
