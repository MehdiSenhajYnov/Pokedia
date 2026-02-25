import { useMemo, useState } from "react";
import { Leaf, ArrowUp, ArrowDown, Filter, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAllNatures } from "@/hooks/use-natures";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";
import { detailStagger, detailSection } from "@/lib/motion";
import { GlassCard, GlassToolbar } from "@/components/ui/liquid-glass";

const STAT_LABELS: Record<string, string> = {
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const STAT_COLORS: Record<string, string> = {
  attack: "text-orange-500",
  defense: "text-yellow-500",
  "special-attack": "text-indigo-500",
  "special-defense": "text-green-500",
  speed: "text-pink-500",
};

const FLAVOR_LABELS: Record<string, string> = {
  spicy: "Spicy",
  dry: "Dry",
  sweet: "Sweet",
  bitter: "Bitter",
  sour: "Sour",
};

const STAT_FILTER_OPTIONS = [
  { key: "all", label: "All Stats" },
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "special-attack", label: "Sp. Atk" },
  { key: "special-defense", label: "Sp. Def" },
  { key: "speed", label: "Speed" },
];

export default function NatureBrowserPage() {
  usePageTitle("Natures");
  const { data: allNatures, isLoading } = useAllNatures();
  const { natureName } = useSettingsStore();
  const [statFilter, setStatFilter] = useState("all");
  const [hideNeutral, setHideNeutral] = useState(false);

  const filtered = useMemo(() => {
    if (!allNatures) return [];
    let result = [...allNatures].sort((a, b) => a.id - b.id);
    if (hideNeutral) {
      result = result.filter((n) => n.increased_stat !== n.decreased_stat);
    }
    if (statFilter !== "all") {
      result = result.filter(
        (n) => n.increased_stat === statFilter || n.decreased_stat === statFilter,
      );
    }
    return result;
  }, [allNatures, statFilter, hideNeutral]);

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        <div className="h-9 w-48 skeleton-shimmer rounded-full" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-12 skeleton-shimmer rounded-xl"
              style={{ animationDelay: `${i * 0.04}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-4 p-5"
      variants={detailStagger}
      initial="initial"
      animate="animate"
    >
      {/* Toolbar */}
      <motion.div variants={detailSection}>
        <GlassToolbar className="rounded-2xl border border-border/30">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <Leaf className="h-4 w-4 text-primary" />
            <h1 className="font-heading text-lg font-bold mr-2">Natures</h1>

            {/* Stat filter pills */}
            <div className="flex flex-wrap gap-1">
              {STAT_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStatFilter(opt.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    statFilter === opt.key
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.key !== "all" && <Filter className="inline h-2.5 w-2.5 mr-1" />}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Hide neutral toggle */}
            <button
              onClick={() => setHideNeutral((h) => !h)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                hideNeutral
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground",
              )}
            >
              <EyeOff className="h-2.5 w-2.5" />
              Hide Neutral
            </button>

            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {filtered.length} natures
            </span>
          </div>
        </GlassToolbar>
      </motion.div>

      <motion.div variants={detailSection}>
        <GlassCard className="rounded-2xl border border-border/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="glass-heavy">
              <tr className="border-b border-border/30 font-heading text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-3 text-left">Nature</th>
                <th className="px-5 py-3 text-left">Increased Stat</th>
                <th className="px-5 py-3 text-left">Decreased Stat</th>
                <th className="px-5 py-3 text-left">Likes</th>
                <th className="px-5 py-3 text-left">Hates</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((nature) => {
                const isNeutral =
                  nature.increased_stat === nature.decreased_stat;

                return (
                  <tr
                    key={nature.id}
                    className={cn(
                      "border-b border-border/20 transition-colors",
                      isNeutral
                        ? "text-muted-foreground"
                        : "hover:bg-primary/5",
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "font-heading text-[15px] font-semibold",
                          isNeutral && "text-muted-foreground",
                        )}
                      >
                        {natureName(nature.name_en, nature.name_fr)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {isNeutral ? (
                        <span className="text-sm text-muted-foreground/50">
                          --
                        </span>
                      ) : nature.increased_stat ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-sm font-medium",
                            STAT_COLORS[nature.increased_stat] ??
                              "text-foreground",
                          )}
                        >
                          <ArrowUp className="h-4 w-4" />
                          {STAT_LABELS[nature.increased_stat] ??
                            nature.increased_stat}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5">
                      {isNeutral ? (
                        <span className="text-sm text-muted-foreground/50">
                          --
                        </span>
                      ) : nature.decreased_stat ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500">
                          <ArrowDown className="h-4 w-4" />
                          {STAT_LABELS[nature.decreased_stat] ??
                            nature.decreased_stat}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5">
                      {isNeutral ? (
                        <span className="text-sm text-muted-foreground/50">
                          --
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {FLAVOR_LABELS[nature.likes_flavor ?? ""] ??
                            nature.likes_flavor ??
                            "--"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {isNeutral ? (
                        <span className="text-sm text-muted-foreground/50">
                          --
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {FLAVOR_LABELS[nature.hates_flavor ?? ""] ??
                            nature.hates_flavor ??
                            "--"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
