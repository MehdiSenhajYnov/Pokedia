import { useQuery } from "@tanstack/react-query";
import { getSyncStatus } from "@/lib/tauri";

export function useSyncStatus() {
  return useQuery({
    queryKey: ["sync", "status"],
    queryFn: getSyncStatus,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.is_syncing) return 1000;
      return false;
    },
  });
}
