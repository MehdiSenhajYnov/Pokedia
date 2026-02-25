import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

interface GameImportPayload {
  status: "importing" | "done";
  game?: string;
  current?: number;
  total?: number;
  imported?: number;
}

/**
 * Listens to Tauri `game-import-progress` events emitted during
 * background auto-import of bundled hackrom data.
 * Shows a toast during import and invalidates the games query on completion.
 */
export function useGameImport() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let toastId: string | number | undefined;

    const unlisten = listen<GameImportPayload>("game-import-progress", (event) => {
      const { status, game, imported } = event.payload;

      if (status === "importing" && game) {
        toastId = toast.loading(`Importing ${game}...`, {
          id: toastId,
          description: "First-run game data import",
        });
      }

      if (status === "done") {
        if (toastId !== undefined) {
          toast.dismiss(toastId);
        }
        toast.success("Game data imported", {
          description: `${imported ?? 0} game(s) ready to use.`,
        });
        queryClient.invalidateQueries({ queryKey: ["games"] });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [queryClient]);
}
