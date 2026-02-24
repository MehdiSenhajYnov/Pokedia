import { useQuery } from "@tanstack/react-query";
import { getAllTypes, getTypeEfficacy } from "@/lib/tauri";

export function useAllTypes() {
  return useQuery({
    queryKey: ["types", "all"],
    queryFn: getAllTypes,
    staleTime: Infinity,
  });
}

export function useTypeEfficacy() {
  return useQuery({
    queryKey: ["types", "efficacy"],
    queryFn: getTypeEfficacy,
    staleTime: Infinity,
  });
}
