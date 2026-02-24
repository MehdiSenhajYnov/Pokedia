import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFavorites, toggleFavorite } from "@/lib/tauri";

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: getFavorites,
    staleTime: Infinity,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleFavorite,
    onMutate: async (pokemonId) => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] });
      const previous = queryClient.getQueryData<number[]>(["favorites"]) ?? [];

      const isCurrentlyFav = previous.includes(pokemonId);
      const next = isCurrentlyFav
        ? previous.filter((id) => id !== pokemonId)
        : [pokemonId, ...previous];

      queryClient.setQueryData(["favorites"], next);
      return { previous };
    },
    onError: (_err, _pokemonId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["favorites"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useIsFavorite(pokemonId: number) {
  const { data: favorites } = useFavorites();
  return favorites?.includes(pokemonId) ?? false;
}
