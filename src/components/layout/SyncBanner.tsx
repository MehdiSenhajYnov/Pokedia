import { useSyncStatus } from "@/hooks/use-sync";
import { startSync, cancelSync } from "@/lib/tauri";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  Loader2,
  X,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export function SyncBanner() {
  const { data: syncStatus } = useSyncStatus();

  if (!syncStatus) return null;

  const isSyncing = syncStatus.is_syncing;
  const allDone =
    syncStatus.resources.length > 0 &&
    syncStatus.resources.every((r) => r.status === "done");
  const hasError = syncStatus.resources.some((r) => r.status === "error");
  const needsSync = syncStatus.resources.some(
    (r) => r.status === "pending" && r.total === 0
  );

  if (allDone && !isSyncing) return null;

  const totalItems = syncStatus.resources.reduce((s, r) => s + r.total, 0);
  const completedItems = syncStatus.resources.reduce(
    (s, r) => s + r.completed,
    0
  );
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const currentResource = syncStatus.resources.find(
    (r) => r.status === "syncing" || r.status === "in_progress"
  );
  const errorResource = syncStatus.resources.find((r) => r.status === "error");

  return (
    <AnimatePresence mode="wait">
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isSyncing && currentResource
          ? `Syncing ${currentResource.resource}: ${completedItems} of ${totalItems}`
          : hasError
            ? "Sync failed"
            : allDone
              ? "Sync complete"
              : ""}
      </div>

      {/* ── Error state ── */}
      {hasError && !isSyncing && (
        <motion.div
          key="error"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="border-b border-destructive/20 bg-destructive/10 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/15"
                style={{ boxShadow: "0 0 16px rgba(239,68,68,0.3)" }}
              >
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-heading font-medium text-foreground">
                  Sync failed
                </p>
                {errorResource?.error && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {errorResource.resource}: {errorResource.error}
                  </p>
                )}
              </div>
              <motion.button
                onClick={() => startSync()}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-destructive px-3 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── First launch / needs sync ── */}
      {!isSyncing && needsSync && !hasError && (
        <motion.div
          key="welcome"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="border-b border-primary/20 bg-primary/5 px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 glow-primary">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-heading font-semibold text-foreground">
                  Welcome to Pokedia!
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Download the Pokemon database to get started. This only takes a
                  moment.
                </p>
              </div>
              <motion.button
                onClick={() => startSync()}
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Download className="h-4 w-4" />
                Download Data
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Syncing in progress ── */}
      {isSyncing && (
        <motion.div
          key="syncing"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="border-b border-border/30 glass-heavy px-5 py-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-heading font-medium text-foreground">
                    Syncing
                    {currentResource ? (
                      <span className="font-body font-normal text-muted-foreground">
                        {" "}
                        &mdash; {currentResource.resource}
                      </span>
                    ) : (
                      <span className="font-body font-normal text-muted-foreground">
                        ...
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground">
                    {completedItems}
                    {totalItems > 0 && <span> / {totalItems}</span>}
                  </span>
                </div>

                {/* Progress bar with coral gradient + shimmer */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                  <motion.div
                    className="relative h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, var(--color-primary), oklch(0.72 0.16 40))",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                        animation: "shimmer 1.5s ease-in-out infinite",
                      }}
                    />
                  </motion.div>
                </div>
              </div>

              <motion.button
                onClick={() => cancelSync()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Cancel sync"
                aria-label="Cancel sync"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
