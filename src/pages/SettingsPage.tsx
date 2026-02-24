import { useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useSyncStatus } from "@/hooks/use-sync";
import { usePageTitle } from "@/hooks/use-page-title";
import { startSync, clearCache } from "@/lib/tauri";
import {
  Moon,
  Sun,
  RefreshCw,
  Trash2,
  Globe,
  Database,
  Palette,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

type Lang = "en" | "fr";

export default function SettingsPage() {
  usePageTitle("Settings");
  const {
    theme,
    langPokemonNames,
    langMoveNames,
    langItemNames,
    langDescriptions,
    setTheme,
    setLangPokemonNames,
    setLangMoveNames,
    setLangItemNames,
    setLangDescriptions,
    setAllLangs,
  } = useSettingsStore();
  const { data: syncStatus } = useSyncStatus();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleClearCache = async () => {
    setShowClearConfirm(false);
    try {
      await clearCache();
      toast.success("Cache cleared", {
        description: "All cached data has been removed. Run a sync to re-download.",
      });
    } catch {
      toast.error("Failed to clear cache");
    }
  };

  return (
    <motion.div
      className="mx-auto max-w-2xl p-6 space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the look and behavior of Pokedia.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  Theme                                                        */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Appearance</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all",
              theme === "dark"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border hover:border-primary/30 hover:bg-accent text-muted-foreground",
            )}
          >
            <Moon className="h-4.5 w-4.5" />
            Dark
          </button>
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all",
              theme === "light"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border hover:border-primary/30 hover:bg-accent text-muted-foreground",
            )}
          >
            <Sun className="h-4.5 w-4.5" />
            Light
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Languages                                                    */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Language</h2>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setAllLangs("en")}
              className="rounded-lg border border-input px-3 py-1 text-xs font-medium hover:bg-accent transition-colors"
            >
              All EN
            </button>
            <button
              onClick={() => setAllLangs("fr")}
              className="rounded-lg border border-input px-3 py-1 text-xs font-medium hover:bg-accent transition-colors"
            >
              All FR
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          <LangRow label="Pokemon names" value={langPokemonNames} onChange={setLangPokemonNames} />
          <LangRow label="Move names" value={langMoveNames} onChange={setLangMoveNames} />
          <LangRow label="Item names" value={langItemNames} onChange={setLangItemNames} />
          <LangRow label="Descriptions" value={langDescriptions} onChange={setLangDescriptions} />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Data Cache                                                   */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Data Cache</h2>
        </div>

        {/* Sync status display */}
        {syncStatus && syncStatus.resources.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs">
              {/* Header */}
              <div className="px-4 py-2 bg-muted/40 font-medium text-muted-foreground">
                Resource
              </div>
              <div className="px-4 py-2 bg-muted/40 font-medium text-muted-foreground text-right">
                Progress
              </div>
              <div className="px-4 py-2 bg-muted/40 font-medium text-muted-foreground text-center">
                Status
              </div>

              {/* Rows */}
              {syncStatus.resources.map((r) => (
                <SyncResourceRow key={r.resource} resource={r} />
              ))}
            </div>
          </div>
        )}

        {/* Syncing indicator */}
        {syncStatus?.is_syncing && (
          <div className="flex items-center gap-2 text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Syncing in progress...</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => startSync()}
            disabled={syncStatus?.is_syncing}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-all",
              syncStatus?.is_syncing
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-accent hover:border-primary/30",
            )}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                syncStatus?.is_syncing && "animate-spin",
              )}
            />
            Refresh Data
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Clear Cache
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  About                                                        */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">About</h2>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <svg viewBox="0 0 100 100" className="h-6 w-6 text-primary" fill="currentColor">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" />
                <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="6" />
                <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="6" />
                <circle cx="50" cy="50" r="7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold">Pokedia</p>
              <p className="text-xs text-muted-foreground">v0.1.0</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A Pokemon encyclopedia for hackrom players. Data provided by{" "}
            <a
              href="https://pokeapi.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              PokéAPI v2
            </a>
            . Built with Tauri, React, and Rust.
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            Pokemon and Pokemon character names are trademarks of Nintendo.
          </p>
        </div>
      </section>

      {/* ── Clear Cache Confirmation Dialog ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-confirm-title"
            aria-describedby="clear-confirm-desc"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h3 id="clear-confirm-title" className="text-sm font-semibold">
                Clear all cached data?
              </h3>
            </div>
            <p id="clear-confirm-desc" className="text-xs text-muted-foreground mb-4">
              This will remove all Pokemon, moves, items, types, and evolution chain
              data. You will need to run a sync again to re-download everything.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearCache}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Language Toggle Row                                                */
/* ------------------------------------------------------------------ */

function LangRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Lang;
  onChange: (v: Lang) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm">{label}</span>
      <div className="flex rounded-lg border border-input overflow-hidden" role="group" aria-label={`${label} language`}>
        <button
          onClick={() => onChange("en")}
          className={cn(
            "px-3.5 py-1.5 text-xs font-medium transition-all",
            value === "en"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
          aria-pressed={value === "en"}
        >
          EN
        </button>
        <button
          onClick={() => onChange("fr")}
          className={cn(
            "px-3.5 py-1.5 text-xs font-medium transition-all border-l border-input",
            value === "fr"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
          aria-pressed={value === "fr"}
        >
          FR
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sync Resource Row                                                  */
/* ------------------------------------------------------------------ */

function SyncResourceRow({
  resource,
}: {
  resource: { resource: string; total: number; completed: number; status: string; error: string | null };
}) {
  const pct =
    resource.total > 0
      ? Math.round((resource.completed / resource.total) * 100)
      : 0;

  const statusIcon = (() => {
    switch (resource.status) {
      case "done":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case "error":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case "syncing":
        return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
      case "partial":
        return <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  })();

  return (
    <>
      <div className="px-4 py-2.5 capitalize border-t border-border">
        {resource.resource.replace(/_/g, " ")}
        {resource.error && (
          <span className="block text-[10px] text-red-400 mt-0.5">
            {resource.error}
          </span>
        )}
      </div>
      <div className="px-4 py-2.5 text-right font-mono border-t border-border">
        <span className="text-foreground">{resource.completed}</span>
        <span className="text-muted-foreground">/{resource.total}</span>
        {resource.total > 0 && (
          <span className="text-muted-foreground ml-1.5">({pct}%)</span>
        )}
      </div>
      <div className="px-4 py-2.5 flex items-center justify-center border-t border-border">
        {statusIcon}
      </div>
    </>
  );
}
