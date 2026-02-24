import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

interface SyncProgressPayload {
  resource: string;
  total: number;
  completed: number;
  status: string;
  error: string | null;
}

/** Maps backend resource names to TanStack Query key prefixes. */
const RESOURCE_QUERY_KEYS: Record<string, string[][]> = {
  pokemon: [["pokemon"]],
  moves: [["moves"]],
  items: [["items"]],
  types: [["types"]],
  evolution_chains: [["pokemon-evolution"]],
};

const ALL_RESOURCES = ["types", "moves", "pokemon", "items", "evolution_chains"];

const RESOURCE_LABELS: Record<string, string> = {
  types: "Types",
  moves: "Moves",
  pokemon: "Pokemon",
  items: "Items",
  evolution_chains: "Evolution Chains",
};

/**
 * Listens to Tauri `sync-progress` events and invalidates
 * the relevant TanStack Query caches when a resource finishes syncing.
 */
export function useSyncInvalidation() {
  const queryClient = useQueryClient();
  const doneResources = useRef(new Set<string>());
  const syncActive = useRef(false);

  useEffect(() => {
    const unlisten = listen<SyncProgressPayload>("sync-progress", (event) => {
      const { resource, status, error } = event.payload;

      // Track that a sync is active
      if (status === "syncing") {
        syncActive.current = true;
      }

      if (status === "done" && !doneResources.current.has(resource)) {
        doneResources.current.add(resource);

        const keys = RESOURCE_QUERY_KEYS[resource];
        if (keys) {
          for (const key of keys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }

        // Also invalidate sync status query
        queryClient.invalidateQueries({ queryKey: ["sync"] });

        // Check if all resources are done
        const allDone = ALL_RESOURCES.every((r) =>
          doneResources.current.has(r),
        );
        if (allDone && syncActive.current) {
          syncActive.current = false;
          toast.success("Sync complete!", {
            description: "All data has been downloaded and cached.",
          });
        }
      }

      // Reset tracking when a new sync starts
      if (status === "syncing" && doneResources.current.has(resource)) {
        doneResources.current.delete(resource);
      }

      // On error, show toast and refresh sync status
      if (status === "error") {
        queryClient.invalidateQueries({ queryKey: ["sync"] });
        const label = RESOURCE_LABELS[resource] ?? resource;
        toast.error(`${label} sync failed`, {
          description: error ?? "An unexpected error occurred.",
        });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [queryClient]);
}
