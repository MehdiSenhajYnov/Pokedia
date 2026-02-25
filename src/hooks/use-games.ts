import { useQuery } from "@tanstack/react-query";
import {
  getAllGames,
  getGameCoverage,
  getGamePokemonMoves,
  getGamePokemonAbilities,
  getGamePokemonLocations,
  getGameMoveOverride,
  getGameItemLocations,
} from "@/lib/tauri";
import { useSettingsStore } from "@/stores/settings-store";

export function useAllGames() {
  return useQuery({
    queryKey: ["games", "all"],
    queryFn: getAllGames,
    staleTime: Infinity,
  });
}

export function useSelectedGame() {
  const selectedGameId = useSettingsStore((s) => s.selectedGameId);
  const { data: games } = useAllGames();
  return games?.find((g) => g.id === selectedGameId) ?? null;
}

export function useGameCoverage() {
  const selectedGameId = useSettingsStore((s) => s.selectedGameId);
  return useQuery({
    queryKey: ["game-coverage", selectedGameId],
    queryFn: () => getGameCoverage(selectedGameId!),
    enabled: selectedGameId !== null,
    staleTime: Infinity,
  });
}

export function useGamePokemonMoves(nameKey: string | undefined | null) {
  const selectedGameId = useSettingsStore((s) => s.selectedGameId);
  return useQuery({
    queryKey: ["game-pokemon-moves", selectedGameId, nameKey],
    queryFn: () => getGamePokemonMoves(selectedGameId!, nameKey!),
    enabled: selectedGameId !== null && !!nameKey,
    staleTime: Infinity,
  });
}

export function useGamePokemonAbilities(nameKey: string | undefined | null) {
  const selectedGameId = useSettingsStore((s) => s.selectedGameId);
  return useQuery({
    queryKey: ["game-pokemon-abilities", selectedGameId, nameKey],
    queryFn: () => getGamePokemonAbilities(selectedGameId!, nameKey!),
    enabled: selectedGameId !== null && !!nameKey,
    staleTime: Infinity,
  });
}

export function useGamePokemonLocations(nameKey: string | undefined | null) {
  const selectedGameId = useSettingsStore((s) => s.selectedGameId);
  return useQuery({
    queryKey: ["game-pokemon-locations", selectedGameId, nameKey],
    queryFn: () => getGamePokemonLocations(selectedGameId!, nameKey!),
    enabled: selectedGameId !== null && !!nameKey,
    staleTime: Infinity,
  });
}

export function useGameMoveOverride(nameKey: string | undefined | null) {
  const selectedGameId = useSettingsStore((s) => s.selectedGameId);
  return useQuery({
    queryKey: ["game-move-override", selectedGameId, nameKey],
    queryFn: () => getGameMoveOverride(selectedGameId!, nameKey!),
    enabled: selectedGameId !== null && !!nameKey,
    staleTime: Infinity,
  });
}

export function useGameItemLocations(nameKey: string | undefined | null) {
  const selectedGameId = useSettingsStore((s) => s.selectedGameId);
  return useQuery({
    queryKey: ["game-item-locations", selectedGameId, nameKey],
    queryFn: () => getGameItemLocations(selectedGameId!, nameKey!),
    enabled: selectedGameId !== null && !!nameKey,
    staleTime: Infinity,
  });
}
