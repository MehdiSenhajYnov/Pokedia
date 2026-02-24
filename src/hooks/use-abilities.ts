import { useQuery } from "@tanstack/react-query";
import { getAllAbilities, getAbilityById, searchAbilities, getAbilityPokemon } from "@/lib/tauri";

export function useAllAbilities() {
  return useQuery({
    queryKey: ["abilities", "all"],
    queryFn: getAllAbilities,
    staleTime: Infinity,
  });
}

export function useAbilityById(id: number | null) {
  return useQuery({
    queryKey: ["abilities", "detail", id],
    queryFn: () => getAbilityById(id!),
    enabled: id !== null,
    staleTime: Infinity,
  });
}

export function useSearchAbilities(query: string) {
  return useQuery({
    queryKey: ["abilities", "search", query],
    queryFn: () => searchAbilities(query),
    enabled: query.length > 0,
    staleTime: 60_000,
  });
}

export function useAbilityPokemon(abilityId: number | null) {
  return useQuery({
    queryKey: ["ability-pokemon", abilityId],
    queryFn: () => getAbilityPokemon(abilityId!),
    enabled: abilityId !== null,
    staleTime: Infinity,
  });
}
