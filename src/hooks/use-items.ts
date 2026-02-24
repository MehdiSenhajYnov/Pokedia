import { useQuery } from "@tanstack/react-query";
import { getAllItems, searchItems } from "@/lib/tauri";

export function useAllItems() {
  return useQuery({
    queryKey: ["items", "all"],
    queryFn: getAllItems,
    staleTime: Infinity,
  });
}

export function useSearchItems(query: string) {
  return useQuery({
    queryKey: ["items", "search", query],
    queryFn: () => searchItems(query),
    enabled: query.length > 0,
    staleTime: 60_000,
  });
}
