import { useQuery } from "@tanstack/react-query";
import { getAllItems, getItemById, searchItems } from "@/lib/tauri";

export function useAllItems() {
  return useQuery({
    queryKey: ["items", "all"],
    queryFn: getAllItems,
    staleTime: Infinity,
  });
}

export function useItemDetail(id: number | null) {
  return useQuery({
    queryKey: ["items", "detail", id],
    queryFn: () => getItemById(id!),
    enabled: id !== null,
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
