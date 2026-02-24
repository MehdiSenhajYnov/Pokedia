import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  ALL_TYPES,
  TYPE_COLORS_HEX,
  TYPE_COLORS,
  type PokemonTypeName,
} from "@/lib/constants";
import {
  getTypeFactor,
  getDefensiveMatchups,
} from "@/lib/type-chart";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Calculator, Grid3X3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { GlassCard } from "@/components/ui/liquid-glass";

const FACTOR_BG: Record<number, string> = {
  0: "bg-gray-800/80",
  0.25: "bg-emerald-900/70",
  0.5: "bg-emerald-800/50",
  1: "bg-transparent",
  2: "bg-red-900/50",
  4: "bg-red-800/70",
};

const FACTOR_TEXT: Record<number, string> = {
  0: "text-gray-500",
  0.25: "text-emerald-300 font-bold",
  0.5: "text-emerald-300",
  1: "text-muted-foreground/25",
  2: "text-red-300",
  4: "text-red-200 font-bold",
};

const FACTOR_LABEL: Record<number, string> = {
  0: "0",
  0.25: "\u00BC",
  0.5: "\u00BD",
  1: "",
  2: "2",
  4: "4",
};

const MATCHUP_SECTIONS: {
  factor: number;
  label: string;
  colorClass: string;
  bgClass: string;
}[] = [
  {
    factor: 4,
    label: "Super effective (4x)",
    colorClass: "text-red-400",
    bgClass: "bg-red-500/10 border-red-500/20",
  },
  {
    factor: 2,
    label: "Effective (2x)",
    colorClass: "text-red-300",
    bgClass: "bg-red-500/5 border-red-500/10",
  },
  {
    factor: 1,
    label: "Normal (1x)",
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted/30 border-border/30",
  },
  {
    factor: 0.5,
    label: "Resisted (0.5x)",
    colorClass: "text-emerald-300",
    bgClass: "bg-emerald-500/5 border-emerald-500/10",
  },
  {
    factor: 0.25,
    label: "Double resisted (0.25x)",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    factor: 0,
    label: "Immune (0x)",
    colorClass: "text-gray-400",
    bgClass: "bg-gray-500/10 border-gray-500/20",
  },
];

export default function TypeChartPage() {
  usePageTitle("Type Chart");
  const [type1, setType1] = useState<PokemonTypeName | null>(null);
  const [type2, setType2] = useState<PokemonTypeName | null>(null);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    atk: string;
    def: string;
  } | null>(null);

  const matchups = useMemo(
    () => (type1 ? getDefensiveMatchups(type1, type2) : null),
    [type1, type2],
  );

  return (
    <motion.div
      className="p-5 space-y-6 max-w-5xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Type Calculator */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Type Calculator</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Select one or two defending types to see which attacking types are
          effective, resisted, or have no effect.
        </p>

        {/* Type 1 selector */}
        <div className="space-y-2">
          <label className="font-heading text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Type 1
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TYPES.map((t) => (
              <motion.button
                key={t}
                onClick={() => {
                  if (type1 === t) {
                    setType1(null);
                    setType2(null);
                  } else {
                    setType1(t);
                    if (type2 === t) setType2(null);
                  }
                }}
                className={cn(
                  "rounded-full px-3 py-1 font-heading text-[11px] font-medium uppercase transition-all duration-150",
                  type1 === t
                    ? "ring-2 ring-offset-2 ring-offset-background scale-105 shadow-lg"
                    : "opacity-70 hover:opacity-100 hover:scale-105",
                )}
                style={{
                  backgroundColor: TYPE_COLORS_HEX[t],
                  color: "white",
                  ...(type1 === t
                    ? { boxShadow: `0 0 16px ${TYPE_COLORS[t]?.glow ?? "transparent"}`, ringColor: `${TYPE_COLORS_HEX[t]}` }
                    : {}),
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                {t}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Type 2 selector */}
        <div className="space-y-2">
          <label className="font-heading text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Type 2{" "}
            <span className="normal-case tracking-normal font-body font-normal">
              (optional)
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TYPES.map((t) => {
              const isDisabled = t === type1 || type1 === null;
              return (
                <motion.button
                  key={t}
                  onClick={() => {
                    if (!isDisabled) {
                      setType2(type2 === t ? null : t);
                    }
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "rounded-full px-3 py-1 font-heading text-[11px] font-medium uppercase transition-all duration-150",
                    type2 === t
                      ? "ring-2 ring-offset-2 ring-offset-background scale-105 shadow-lg"
                      : "opacity-70 hover:opacity-100 hover:scale-105",
                    isDisabled && "!opacity-20 cursor-not-allowed",
                  )}
                  style={{
                    backgroundColor: TYPE_COLORS_HEX[t],
                    color: "white",
                    ...(type2 === t
                      ? { boxShadow: `0 0 16px ${TYPE_COLORS[t]?.glow ?? "transparent"}` }
                      : {}),
                  }}
                  whileHover={isDisabled ? {} : { scale: 1.08 }}
                  whileTap={isDisabled ? {} : { scale: 0.95 }}
                >
                  {t}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {matchups ? (
            <motion.div
              key={`${type1}-${type2}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
            <GlassCard className="rounded-2xl border border-border/30 shadow-glass">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-medium text-muted-foreground">
                  Defending:
                </span>
                {type1 && <TypeBadge type={type1} size="md" />}
                {type2 && (
                  <>
                    <span className="text-muted-foreground">/</span>
                    <TypeBadge type={type2} size="md" />
                  </>
                )}
              </div>

              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {MATCHUP_SECTIONS.map(({ factor, label, colorClass, bgClass }) => {
                  const types = matchups[factor];
                  if (!types || types.length === 0) return null;
                  return (
                    <motion.div
                      key={factor}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3",
                        bgClass,
                      )}
                      variants={staggerItem}
                    >
                      <span
                        className={cn(
                          "font-heading text-xs font-semibold whitespace-nowrap w-44 pt-0.5",
                          colorClass,
                        )}
                      >
                        {label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {types.map((t) => (
                          <TypeBadge key={t} type={t} size="md" />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
            </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
            <GlassCard className="rounded-2xl border border-dashed border-border/30">
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Select a type above to see defensive matchups.
                </p>
              </div>
            </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Full Type Chart (collapsible) */}
      <section className="space-y-3">
        <GlassCard className="rounded-2xl border border-border/30" onClick={() => setChartExpanded(!chartExpanded)}>
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:shadow-warm transition-all"
        >
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
            <span className="font-heading text-sm font-semibold">Full Type Chart</span>
            <span className="text-xs text-muted-foreground">
              (18 x 18 grid)
            </span>
          </div>
          {chartExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        </GlassCard>

        <AnimatePresence>
          {chartExpanded && (
            <motion.div
              className="overflow-x-auto"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
            <GlassCard className="rounded-2xl border border-border/30">
              <div className="min-w-[750px] p-2">
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground mb-2 px-1">
                  <span>Row = Attacking type</span>
                  <span className="text-muted-foreground/40">|</span>
                  <span>Column = Defending type</span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-900/50" />
                    Super effective
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-800/50" />
                    Not effective
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-800/80" />
                    No effect
                  </span>
                </div>

                <div
                  className="grid gap-px"
                  style={{
                    gridTemplateColumns: `72px repeat(${ALL_TYPES.length}, 1fr)`,
                  }}
                >
                  {/* Column header row */}
                  <div className="flex items-end justify-center pb-1 font-heading text-[8px] text-muted-foreground/50">
                    ATK\DEF
                  </div>
                  {ALL_TYPES.map((defType) => (
                    <div
                      key={defType}
                      className={cn(
                        "flex items-center justify-center py-1 transition-opacity duration-100",
                        hoveredCell && hoveredCell.def !== defType && hoveredCell.atk !== defType
                          ? "opacity-50"
                          : "",
                      )}
                    >
                      <span
                        className="rounded-md px-1 py-0.5 font-heading text-[8px] font-semibold text-white uppercase"
                        style={{
                          backgroundColor: TYPE_COLORS_HEX[defType],
                        }}
                      >
                        {defType.slice(0, 3)}
                      </span>
                    </div>
                  ))}

                  {ALL_TYPES.map((atkType) => (
                    <GridRow
                      key={atkType}
                      atkType={atkType}
                      hoveredCell={hoveredCell}
                      onHover={setHoveredCell}
                    />
                  ))}
                </div>
              </div>
            </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </motion.div>
  );
}

function GridRow({
  atkType,
  hoveredCell,
  onHover,
}: {
  atkType: PokemonTypeName;
  hoveredCell: { atk: string; def: string } | null;
  onHover: (cell: { atk: string; def: string } | null) => void;
}) {
  const isRowHighlighted = hoveredCell?.atk === atkType;

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-end pr-2 transition-opacity duration-100",
          hoveredCell && !isRowHighlighted && hoveredCell.def !== atkType
            ? "opacity-50"
            : "",
        )}
      >
        <span
          className="rounded-md px-1.5 py-0.5 font-heading text-[8px] font-semibold text-white uppercase"
          style={{
            backgroundColor: TYPE_COLORS_HEX[atkType],
          }}
        >
          {atkType}
        </span>
      </div>

      {ALL_TYPES.map((defType) => {
        const factor = getTypeFactor(atkType, defType);
        const isHighlighted =
          hoveredCell &&
          (hoveredCell.atk === atkType || hoveredCell.def === defType);
        const isDimmed = hoveredCell && !isHighlighted;

        return (
          <motion.div
            key={`${atkType}-${defType}`}
            className={cn(
              "flex items-center justify-center h-6 text-[10px] rounded-sm cursor-default transition-all duration-100",
              FACTOR_BG[factor] ?? FACTOR_BG[1],
              FACTOR_TEXT[factor] ?? FACTOR_TEXT[1],
              isHighlighted && "ring-1 ring-primary/40",
              isDimmed && "opacity-40",
            )}
            onMouseEnter={() => onHover({ atk: atkType, def: defType })}
            onMouseLeave={() => onHover(null)}
            title={`${atkType} vs ${defType}: ${factor}x`}
            whileHover={{ scale: 1.15 }}
          >
            {FACTOR_LABEL[factor] ?? factor}
          </motion.div>
        );
      })}
    </>
  );
}
