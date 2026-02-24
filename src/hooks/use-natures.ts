import { useQuery } from "@tanstack/react-query";
import { getAllNatures } from "@/lib/tauri";

export function useAllNatures() {
  return useQuery({
    queryKey: ["natures", "all"],
    queryFn: getAllNatures,
    staleTime: Infinity,
  });
}
