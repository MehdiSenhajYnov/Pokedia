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
import { springSnappy } from "@/lib/motion";
import { toast } from "sonner";

type Lang = "en" | "fr";

export default function SettingsPage() {
  usePageTitle("Settings");
  const {
    theme,
    langPokemonNames,
    langMoveNames,
    langItemNames,
    langAbilityNames,
    langNatureNames,
    langDescriptions,
    setTheme,
    setLangPokemonNames,
    setLangMoveNames,
    setLangItemNames,
    setLangAbilityNames,
    setLangNatureNames,
    setLangDescriptions,
    setAllLangs,
  } = useSettingsStore();
  const { data: syncStatus } = useSyncStatus();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
        <h1 className="font-heading text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the look and behavior of Pokedia.
        </p>
      </div>

      {/* Theme */}
      <section className="space-y-3 rounded-2xl glass border border-border/30 p-5 shadow-glass">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-sm font-semibold">Appearance</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all",
              theme === "dark"
                ? "border-primary text-primary ring-2 ring-primary/20 glow-primary"
                : "border-border/40 hover:border-primary/30 hover:bg-accent text-muted-foreground",
            )}
          >
            <Moon className="h-4.5 w-4.5" />
            Dark
          </button>
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all",
              theme === "light"
                ? "border-primary text-primary ring-2 ring-primary/20 glow-primary"
                : "border-border/40 hover:border-primary/30 hover:bg-accent text-muted-foreground",
            )}
          >
            <Sun className="h-4.5 w-4.5" />
            Light
          </button>
        </div>
      </section>

      {/* Languages */}
      <section className="space-y-3 rounded-2xl glass border border-border/30 p-5 shadow-glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-sm font-semibold">Language</h2>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setAllLangs("en")}
              className="rounded-lg glass-light border border-border/40 px-3 py-1 text-xs font-medium hover:shadow-warm transition-all"
            >
              All EN
            </button>
            <button
              onClick={() => setAllLangs("fr")}
              className="rounded-lg glass-light border border-border/40 px-3 py-1 text-xs font-medium hover:shadow-warm transition-all"
            >
              All FR
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border/30 overflow-hidden divide-y divide-border/30">
          <LangRow label="Pokemon names" value={langPokemonNames} onChange={setLangPokemonNames} />
          <LangRow label="Move names" value={langMoveNames} onChange={setLangMoveNames} />
          <LangRow label="Ability names" value={langAbilityNames} onChange={setLangAbilityNames} />
          <LangRow label="Item names" value={langItemNames} onChange={setLangItemNames} />
          <LangRow label="Nature names" value={langNatureNames} onChange={setLangNatureNames} />
          <LangRow label="Descriptions" value={langDescriptions} onChange={setLangDescriptions} />
        </div>
      </section>

      {/* Data Cache */}
      <section className="space-y-3 rounded-2xl glass border border-border/30 p-5 shadow-glass">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-sm font-semibold">Data Cache</h2>
        </div>

        {syncStatus && syncStatus.resources.length > 0 && (
          <div className="rounded-xl border border-border/30 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs">
              <div className="px-4 py-2 glass-heavy font-heading font-medium text-muted-foreground">
                Resource
              </div>
              <div className="px-4 py-2 glass-heavy font-heading font-medium text-muted-foreground text-right">
                Progress
              </div>
              <div className="px-4 py-2 glass-heavy font-heading font-medium text-muted-foreground text-center">
                Status
              </div>

              {syncStatus.resources.map((r) => (
                <SyncResourceRow key={r.resource} resource={r} />
              ))}
            </div>
          </div>
        )}

        {syncStatus?.is_syncing && (
          <div className="flex items-center gap-2 text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Syncing in progress...</span>
          </div>
        )}

        <div className="flex gap-3">
          <motion.button
            onClick={() => startSync()}
            disabled={syncStatus?.is_syncing}
            className={cn(
              "flex items-center gap-2 rounded-xl glass-light border border-border/40 px-4 py-2.5 text-sm font-medium transition-all",
              syncStatus?.is_syncing
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-accent hover:border-primary/30",
            )}
            whileHover={syncStatus?.is_syncing ? {} : { scale: 1.02 }}
            whileTap={syncStatus?.is_syncing ? {} : { scale: 0.98 }}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                syncStatus?.is_syncing && "animate-spin",
              )}
            />
            Refresh Data
          </motion.button>
          <motion.button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 rounded-xl glass-light border border-border/40 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 className="h-4 w-4" />
            Clear Cache
          </motion.button>
        </div>
      </section>

      {/* About */}
      <section className="space-y-3 rounded-2xl glass border border-border/30 p-5 shadow-glass">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-sm font-semibold">About</h2>
        </div>

        <div className="rounded-xl border border-border/30 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 glow-primary">
              <svg viewBox="0 0 100 100" className="h-6 w-6 text-primary animate-[float_4s_ease-in-out_infinite]" fill="currentColor">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" />
                <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="6" />
                <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="6" />
                <circle cx="50" cy="50" r="7" />
              </svg>
            </div>
            <div>
              <p className="font-heading text-sm font-semibold">Pokedia</p>
              <p className="font-mono text-xs text-muted-foreground">v0.1.0</p>
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

      {/* Clear Cache Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-4 w-full max-w-sm rounded-2xl glass border border-border/30 p-6 shadow-glass"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-confirm-title"
            aria-describedby="clear-confirm-desc"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h3 id="clear-confirm-title" className="font-heading text-sm font-semibold">
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
                className="rounded-xl glass-light border border-border/40 px-4 py-2 text-sm font-medium hover:shadow-warm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearCache}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
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
      <div className="relative flex rounded-lg overflow-hidden border border-border/30" role="group" aria-label={`${label} language`}>
        {/* Sliding indicator */}
        <motion.div
          className="absolute inset-y-0 w-1/2 bg-primary rounded-md"
          animate={{ x: value === "en" ? 0 : "100%" }}
          transition={springSnappy}
        />
        <button
          onClick={() => onChange("en")}
          className={cn(
            "relative z-10 px-3.5 py-1.5 text-xs font-medium transition-colors",
            value === "en"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={value === "en"}
        >
          EN
        </button>
        <button
          onClick={() => onChange("fr")}
          className={cn(
            "relative z-10 px-3.5 py-1.5 text-xs font-medium transition-colors",
            value === "fr"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={value === "fr"}
        >
          FR
        </button>
      </div>
    </div>
  );
}

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
      <div className="px-4 py-2.5 capitalize border-t border-border/30">
        {resource.resource.replace(/_/g, " ")}
        {resource.error && (
          <span className="block text-[10px] text-red-400 mt-0.5">
            {resource.error}
          </span>
        )}
      </div>
      <div className="px-4 py-2.5 text-right font-mono border-t border-border/30">
        <span className="text-foreground">{resource.completed}</span>
        <span className="text-muted-foreground">/{resource.total}</span>
        {resource.total > 0 && (
          <span className="text-muted-foreground ml-1.5">({pct}%)</span>
        )}
      </div>
      <div className="px-4 py-2.5 flex items-center justify-center border-t border-border/30">
        {statusIcon}
      </div>
    </>
  );
}
