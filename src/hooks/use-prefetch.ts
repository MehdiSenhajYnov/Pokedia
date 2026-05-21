import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAllTypes, getTypeEfficacy, getFavorites } from "@/lib/tauri";

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

/**
 * Prefetch only small shared datasets.
 * Browser pages fetch their large lists on demand.
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const win = window as IdleWindow;
    let cancelled = false;
    const idleHandles: number[] = [];
    const timeoutHandles: number[] = [];

    const tasks = [
      { gapMs: 200, run: () => queryClient.prefetchQuery({ queryKey: ["favorites"], queryFn: getFavorites, staleTime: Infinity }) },
      { gapMs: 300, run: () => queryClient.prefetchQuery({ queryKey: ["types", "all"], queryFn: getAllTypes, staleTime: Infinity }) },
      { gapMs: 300, run: () => queryClient.prefetchQuery({ queryKey: ["types", "efficacy"], queryFn: getTypeEfficacy, staleTime: Infinity }) },
    ];

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const handle = window.setTimeout(resolve, ms);
        timeoutHandles.push(handle);
      });

    const waitForIdle = () =>
      new Promise<void>((resolve) => {
        if (win.requestIdleCallback) {
          const handle = win.requestIdleCallback(() => resolve(), { timeout: 6_000 });
          idleHandles.push(handle);
          return;
        }

        const handle = window.setTimeout(resolve, 500);
        timeoutHandles.push(handle);
      });

    const runSequentially = async () => {
      for (const task of tasks) {
        await wait(task.gapMs);
        await waitForIdle();
        if (cancelled) return;
        await task.run().catch(() => undefined);
      }
    };

    void runSequentially();

    return () => {
      cancelled = true;
      if (win.cancelIdleCallback) {
        idleHandles.forEach((handle) => win.cancelIdleCallback?.(handle));
      } else {
        timeoutHandles.forEach((handle) => window.clearTimeout(handle));
      }
      timeoutHandles.forEach((handle) => window.clearTimeout(handle));
    };
  }, [queryClient]);
}
