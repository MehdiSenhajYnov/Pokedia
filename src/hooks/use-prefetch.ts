import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAllPokemon, getAllMoves, getAllItems, getAllTypes, getTypeEfficacy, getFavorites } from "@/lib/tauri";

/**
 * Prefetch all main datasets on app startup so pages render instantly.
 * All these queries use staleTime: Infinity, so they only fetch once.
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ["pokemon", "all"], queryFn: getAllPokemon, staleTime: Infinity });
    queryClient.prefetchQuery({ queryKey: ["moves", "all"], queryFn: getAllMoves, staleTime: Infinity });
    queryClient.prefetchQuery({ queryKey: ["items", "all"], queryFn: getAllItems, staleTime: Infinity });
    queryClient.prefetchQuery({ queryKey: ["types", "all"], queryFn: getAllTypes, staleTime: Infinity });
    queryClient.prefetchQuery({ queryKey: ["types", "efficacy"], queryFn: getTypeEfficacy, staleTime: Infinity });
    queryClient.prefetchQuery({ queryKey: ["favorites"], queryFn: getFavorites, staleTime: Infinity });
  }, [queryClient]);
}
