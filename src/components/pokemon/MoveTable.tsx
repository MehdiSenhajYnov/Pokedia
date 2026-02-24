import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TypeBadge } from "./TypeBadge";
import { DamageClassIcon } from "@/components/moves/DamageClassIcon";
import { useSettingsStore } from "@/stores/settings-store";
import type { PokemonMoveEntry } from "@/types";

interface MoveTableProps {
  moves: PokemonMoveEntry[];
}

const TABS = [
  { key: "level-up", label: "Level Up" },
  { key: "machine", label: "TM/HM" },
  { key: "tutor", label: "Tutor" },
  { key: "egg", label: "Egg" },
] as const;

export function MoveTable({ moves }: MoveTableProps) {
  const { moveName } = useSettingsStore();

  const availableTabs = useMemo(
    () => TABS.filter((t) => moves.some((m) => m.learn_method === t.key)),
    [moves],
  );

  const [tab, setTab] = useState<string>(() => availableTabs[0]?.key ?? "level-up");

  const filteredMoves = useMemo(() => {
    const subset = moves.filter((m) => m.learn_method === tab);

    if (tab === "level-up") {
      return subset.sort((a, b) => a.level_learned_at - b.level_learned_at);
    }

    return subset.sort((a, b) => {
      const nameA = moveName(a.name_en, a.name_fr);
      const nameB = moveName(b.name_en, b.name_fr);
      return nameA.localeCompare(nameB);
    });
  }, [moves, tab, moveName]);

  if (availableTabs.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No moves available.
      </p>
    );
  }

  return (
    <div>
      {/* Pill-style segmented tabs */}
      <div className="mb-3 inline-flex rounded-xl bg-white/5 border border-white/10 p-0.5" role="tablist" aria-label="Move learn methods">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            aria-controls="pokemon-move-table"
            onClick={() => setTab(t.key)}
            className="relative rounded-lg px-3 py-1.5 text-xs font-heading font-medium transition-colors"
          >
            {tab === t.key && (
              <motion.div
                layoutId="move-tab-indicator"
                className="absolute inset-0 rounded-lg bg-white/10"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={`relative z-10 ${tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/30" role="tabpanel" id="pokemon-move-table">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30 font-heading text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {tab === "level-up" && (
                <th scope="col" className="w-12 px-2 py-2 text-left">Lv.</th>
              )}
              <th scope="col" className="px-2 py-2 text-left">Move</th>
              <th scope="col" className="w-20 px-2 py-2 text-left">Type</th>
              <th scope="col" className="w-12 px-2 py-2 text-center">Cat.</th>
              <th scope="col" className="w-12 px-2 py-2 text-right">Pow</th>
              <th scope="col" className="w-12 px-2 py-2 text-right">Acc</th>
              <th scope="col" className="w-10 px-2 py-2 text-right">PP</th>
            </tr>
          </thead>
          <tbody>
            {filteredMoves.map((m, i) => (
              <tr
                key={`${m.move_id}-${m.learn_method}-${m.level_learned_at}`}
                className={`border-b border-border/20 hover:bg-primary/5 transition-colors ${i % 2 === 1 ? "bg-muted/5" : ""}`}
              >
                {tab === "level-up" && (
                  <td className="px-2 py-1.5 font-mono text-muted-foreground">
                    {m.level_learned_at || "\u2014"}
                  </td>
                )}
                <td className="px-2 py-1.5 font-heading font-medium">
                  {moveName(m.name_en, m.name_fr)}
                </td>
                <td className="px-2 py-1.5">
                  <TypeBadge type={m.type_key} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  {m.damage_class ? (
                    <DamageClassIcon damageClass={m.damage_class} />
                  ) : (
                    "\u2014"
                  )}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {m.power ?? "\u2014"}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {m.accuracy !== null ? `${m.accuracy}%` : "\u2014"}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {m.pp ?? "\u2014"}
                </td>
              </tr>
            ))}

            {filteredMoves.length === 0 && (
              <tr>
                <td
                  colSpan={tab === "level-up" ? 7 : 6}
                  className="px-2 py-4 text-center text-muted-foreground"
                >
                  No moves found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
