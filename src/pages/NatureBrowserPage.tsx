import { useMemo } from "react";
import { Leaf, ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAllNatures } from "@/hooks/use-natures";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";
import { sectionReveal } from "@/lib/motion";

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

export default function NatureBrowserPage() {
  usePageTitle("Natures");
  const { data: allNatures, isLoading } = useAllNatures();
  const { natureName } = useSettingsStore();

  const sorted = useMemo(() => {
    if (!allNatures) return [];
    return [...allNatures].sort((a, b) => a.id - b.id);
  }, [allNatures]);

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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <Leaf className="h-5 w-5 text-primary" />
        <h1 className="font-heading text-xl font-bold">Natures</h1>
        <span className="font-mono text-xs text-muted-foreground">
          {sorted.length} natures
        </span>
      </div>

      <motion.div
        className="rounded-2xl glass border border-border/30 overflow-hidden"
        variants={sectionReveal}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
      >
        <table className="w-full text-sm">
          <thead className="glass-heavy">
            <tr className="border-b border-border/30 font-heading text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              <th className="px-4 py-2.5 text-left">Nature</th>
              <th className="px-4 py-2.5 text-left">Increased Stat</th>
              <th className="px-4 py-2.5 text-left">Decreased Stat</th>
              <th className="px-4 py-2.5 text-left">Likes</th>
              <th className="px-4 py-2.5 text-left">Hates</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((nature) => {
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
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-heading font-semibold",
                        isNeutral && "text-muted-foreground",
                      )}
                    >
                      {natureName(nature.name_en, nature.name_fr)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isNeutral ? (
                      <span className="text-xs text-muted-foreground/50">
                        --
                      </span>
                    ) : nature.increased_stat ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          STAT_COLORS[nature.increased_stat] ??
                            "text-foreground",
                        )}
                      >
                        <ArrowUp className="h-3 w-3" />
                        {STAT_LABELS[nature.increased_stat] ??
                          nature.increased_stat}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {isNeutral ? (
                      <span className="text-xs text-muted-foreground/50">
                        --
                      </span>
                    ) : nature.decreased_stat ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                        <ArrowDown className="h-3 w-3" />
                        {STAT_LABELS[nature.decreased_stat] ??
                          nature.decreased_stat}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {isNeutral ? (
                      <span className="text-xs text-muted-foreground/50">
                        --
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {FLAVOR_LABELS[nature.likes_flavor ?? ""] ??
                          nature.likes_flavor ??
                          "--"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isNeutral ? (
                      <span className="text-xs text-muted-foreground/50">
                        --
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
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
      </motion.div>
    </motion.div>
  );
}
