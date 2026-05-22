import { useCallback, useState, useMemo } from "react";
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
import { ChevronDown, ChevronUp, Calculator, Grid3X3, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { GlassCard } from "@/components/ui/liquid-glass";

const FACTOR_BG: Record<number, string> = {
  0: "bg-gray-500/20 dark:bg-gray-800/80",
  0.25: "bg-emerald-500/20 dark:bg-emerald-900/70",
  0.5: "bg-emerald-500/15 dark:bg-emerald-800/50",
  1: "bg-transparent",
  2: "bg-red-500/15 dark:bg-red-900/50",
  4: "bg-red-500/20 dark:bg-red-800/70",
};

const FACTOR_TEXT: Record<number, string> = {
  0: "text-gray-500 dark:text-gray-500",
  0.25: "text-emerald-600 dark:text-emerald-300 font-bold",
  0.5: "text-emerald-600 dark:text-emerald-300",
  1: "text-muted-foreground/25",
  2: "text-red-600 dark:text-red-300",
  4: "text-red-600 dark:text-red-200 font-bold",
};

const FACTOR_LABEL: Record<number, string> = {
  0: "0",
  0.25: "\u00BC",
  0.5: "\u00BD",
  1: "",
  2: "2",
  4: "4",
};

type ChartHover = {
  atk?: PokemonTypeName;
  def?: PokemonTypeName;
} | null;

type ChartAxis = "atk" | "def";
type ChartAxisState = "empty" | "partial" | "full";

function chartCellKey(atkType: PokemonTypeName, defType: PokemonTypeName) {
  return `${atkType}|${defType}`;
}

function getAxisCellKeys(type: PokemonTypeName, axis: ChartAxis) {
  return ALL_TYPES.map((otherType) =>
    axis === "atk"
      ? chartCellKey(type, otherType)
      : chartCellKey(otherType, type),
  );
}

function getAxisState(
  selectedCells: ReadonlySet<string>,
  type: PokemonTypeName,
  axis: ChartAxis,
): ChartAxisState {
  const selectedCount = getAxisCellKeys(type, axis).filter((cellKey) =>
    selectedCells.has(cellKey),
  ).length;

  if (selectedCount === 0) return "empty";
  if (selectedCount === ALL_TYPES.length) return "full";
  return "partial";
}

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
  const [hoveredCell, setHoveredCell] = useState<ChartHover>(null);
  const [selectedChartCells, setSelectedChartCells] = useState<string[]>([]);
  const [pinnedAtkTypes, setPinnedAtkTypes] = useState<PokemonTypeName[]>([]);
  const [pinnedDefTypes, setPinnedDefTypes] = useState<PokemonTypeName[]>([]);
  const [massSelectedAtkTypes, setMassSelectedAtkTypes] = useState<
    PokemonTypeName[]
  >([]);
  const [massSelectedDefTypes, setMassSelectedDefTypes] = useState<
    PokemonTypeName[]
  >([]);

  const matchups = useMemo(
    () => (type1 ? getDefensiveMatchups(type1, type2) : null),
    [type1, type2],
  );

  const selectedChartCellSet = useMemo(
    () => new Set(selectedChartCells),
    [selectedChartCells],
  );
  const pinnedAtkSet = useMemo(() => new Set(pinnedAtkTypes), [pinnedAtkTypes]);
  const pinnedDefSet = useMemo(() => new Set(pinnedDefTypes), [pinnedDefTypes]);
  const selectedCellAtkSet = useMemo(() => {
    const selectedTypes = new Set<PokemonTypeName>();
    selectedChartCells.forEach((cellKey) => {
      const [atkType] = cellKey.split("|") as [PokemonTypeName, PokemonTypeName];
      selectedTypes.add(atkType);
    });
    return selectedTypes;
  }, [selectedChartCells]);
  const selectedCellDefSet = useMemo(() => {
    const selectedTypes = new Set<PokemonTypeName>();
    selectedChartCells.forEach((cellKey) => {
      const [, defType] = cellKey.split("|") as [PokemonTypeName, PokemonTypeName];
      selectedTypes.add(defType);
    });
    return selectedTypes;
  }, [selectedChartCells]);
  const massSelectedAtkSet = useMemo(
    () =>
      new Set(
        massSelectedAtkTypes.filter(
          (type) => getAxisState(selectedChartCellSet, type, "atk") !== "empty",
        ),
      ),
    [massSelectedAtkTypes, selectedChartCellSet],
  );
  const massSelectedDefSet = useMemo(
    () =>
      new Set(
        massSelectedDefTypes.filter(
          (type) => getAxisState(selectedChartCellSet, type, "def") !== "empty",
        ),
      ),
    [massSelectedDefTypes, selectedChartCellSet],
  );
  const hasActiveAtkTypes =
    selectedCellAtkSet.size > 0 || massSelectedAtkSet.size > 0 || pinnedAtkTypes.length > 0;
  const hasActiveDefTypes =
    selectedCellDefSet.size > 0 || massSelectedDefSet.size > 0 || pinnedDefTypes.length > 0;
  const pinnedAxisCount = pinnedAtkTypes.length + pinnedDefTypes.length;
  const hasChartSelection = selectedChartCells.length > 0 || pinnedAxisCount > 0;

  const togglePinnedAxis = useCallback(
    (type: PokemonTypeName, axis: ChartAxis) => {
      const updatePinnedTypes = (current: PokemonTypeName[]) =>
        current.includes(type)
          ? current.filter((selectedType) => selectedType !== type)
          : [...current, type];

      if (axis === "atk") {
        setPinnedAtkTypes(updatePinnedTypes);
      } else {
        setPinnedDefTypes(updatePinnedTypes);
      }
    },
    [],
  );

  const toggleChartAxis = useCallback(
    (type: PokemonTypeName, axis: ChartAxis) => {
      const nextCells = new Set(selectedChartCells);
      const axisCellKeys = getAxisCellKeys(type, axis);
      const isFullAxis = axisCellKeys.every((cellKey) =>
        nextCells.has(cellKey),
      );

      axisCellKeys.forEach((cellKey) => {
        if (isFullAxis) {
          nextCells.delete(cellKey);
        } else {
          nextCells.add(cellKey);
        }
      });

      setSelectedChartCells([...nextCells]);

      const updateMassSelectedTypes = (current: PokemonTypeName[]) =>
        isFullAxis
          ? current.filter((selectedType) => selectedType !== type)
          : current.includes(type)
            ? current
            : [...current, type];

      if (axis === "atk") {
        setMassSelectedAtkTypes(updateMassSelectedTypes);
      } else {
        setMassSelectedDefTypes(updateMassSelectedTypes);
      }
    },
    [selectedChartCells],
  );

  const selectChartCell = useCallback(
    (atkType: PokemonTypeName, defType: PokemonTypeName) => {
      const nextCells = new Set(selectedChartCells);
      const cellKey = chartCellKey(atkType, defType);

      if (nextCells.has(cellKey)) {
        nextCells.delete(cellKey);
      } else {
        nextCells.add(cellKey);
      }

      setSelectedChartCells([...nextCells]);
      setMassSelectedAtkTypes((current) =>
        current.filter(
          (type) => getAxisState(nextCells, type, "atk") !== "empty",
        ),
      );
      setMassSelectedDefTypes((current) =>
        current.filter(
          (type) => getAxisState(nextCells, type, "def") !== "empty",
        ),
      );
    },
    [selectedChartCells],
  );

  const clearChartSelection = useCallback(() => {
    setSelectedChartCells([]);
    setPinnedAtkTypes([]);
    setPinnedDefTypes([]);
    setMassSelectedAtkTypes([]);
    setMassSelectedDefTypes([]);
  }, []);

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
                <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground mb-2 px-1">
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
                  {hasChartSelection && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-heading text-[9px] font-semibold text-primary">
                        {selectedChartCells.length} cells / {pinnedAxisCount} pinned
                      </span>
                      <button
                        type="button"
                        onClick={clearChartSelection}
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-border/50 bg-muted/40 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                        aria-label="Clear type chart selection"
                        title="Clear selection"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
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
                  {ALL_TYPES.map((defType) => {
                    const axisState = massSelectedDefSet.has(defType)
                      ? getAxisState(selectedChartCellSet, defType, "def")
                      : "empty";
                    const isSelected = axisState !== "empty";
                    const isFull = axisState === "full";
                    const isPartial = axisState === "partial";
                    const isPinned = pinnedDefSet.has(defType);
                    const hasSelectedCell = selectedCellDefSet.has(defType);
                    const isHovered = hoveredCell?.def === defType;
                    const isMuted =
                      (hasActiveDefTypes && !isSelected && !isPinned && !hasSelectedCell && !isHovered) ||
                      (hoveredCell?.def != null && !isHovered);

                    return (
                      <button
                        key={defType}
                        type="button"
                        onClick={(event) => {
                          if (event.shiftKey) {
                            toggleChartAxis(defType, "def");
                          } else {
                            togglePinnedAxis(defType, "def");
                          }
                        }}
                        onMouseEnter={() => setHoveredCell({ def: defType })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={cn(
                          "flex h-7 items-center justify-center rounded-md py-1 transition-all duration-150",
                          hasSelectedCell && "bg-secondary-accent/[0.06] ring-1 ring-secondary-accent/20",
                          isPinned && "bg-secondary-accent/10 ring-1 ring-secondary-accent/35",
                          isPartial && "bg-primary/5 ring-1 ring-primary/25",
                          isFull && "bg-primary/10 ring-1 ring-primary/45 shadow-warm",
                          isMuted && "opacity-45",
                        )}
                        aria-pressed={isFull}
                        aria-label={`Toggle ${defType} defending column`}
                        title={`${defType} defending column`}
                      >
                        <span
                          className={cn(
                            "rounded-md px-1 py-0.5 font-heading text-[8px] font-semibold text-white uppercase transition-all duration-150",
                            hasSelectedCell && "ring-1 ring-white/25",
                            isPinned && "ring-1 ring-white/40",
                            isPartial && "ring-1 ring-white/30",
                            isFull && "scale-105 ring-1 ring-white/60",
                          )}
                          style={{
                            backgroundColor: TYPE_COLORS_HEX[defType],
                          }}
                        >
                          {defType.slice(0, 3)}
                        </span>
                      </button>
                    );
                  })}

                  {ALL_TYPES.map((atkType) => (
                    <GridRow
                      key={atkType}
                      atkType={atkType}
                      hoveredCell={hoveredCell}
                      selectedChartCellSet={selectedChartCellSet}
                      selectedCellAtkSet={selectedCellAtkSet}
                      pinnedAtkSet={pinnedAtkSet}
                      pinnedDefSet={pinnedDefSet}
                      massSelectedAtkSet={massSelectedAtkSet}
                      massSelectedDefSet={massSelectedDefSet}
                      hasChartSelection={hasChartSelection}
                      hasActiveAtkTypes={hasActiveAtkTypes}
                      onHover={setHoveredCell}
                      onToggleRow={(type, massSelect) => {
                        if (massSelect) {
                          toggleChartAxis(type, "atk");
                        } else {
                          togglePinnedAxis(type, "atk");
                        }
                      }}
                      onSelectCell={selectChartCell}
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
  selectedChartCellSet,
  selectedCellAtkSet,
  pinnedAtkSet,
  pinnedDefSet,
  massSelectedAtkSet,
  massSelectedDefSet,
  hasChartSelection,
  hasActiveAtkTypes,
  onHover,
  onToggleRow,
  onSelectCell,
}: {
  atkType: PokemonTypeName;
  hoveredCell: ChartHover;
  selectedChartCellSet: ReadonlySet<string>;
  selectedCellAtkSet: ReadonlySet<PokemonTypeName>;
  pinnedAtkSet: ReadonlySet<PokemonTypeName>;
  pinnedDefSet: ReadonlySet<PokemonTypeName>;
  massSelectedAtkSet: ReadonlySet<PokemonTypeName>;
  massSelectedDefSet: ReadonlySet<PokemonTypeName>;
  hasChartSelection: boolean;
  hasActiveAtkTypes: boolean;
  onHover: (cell: ChartHover) => void;
  onToggleRow: (type: PokemonTypeName, massSelect: boolean) => void;
  onSelectCell: (atkType: PokemonTypeName, defType: PokemonTypeName) => void;
}) {
  const rowState = massSelectedAtkSet.has(atkType)
    ? getAxisState(selectedChartCellSet, atkType, "atk")
    : "empty";
  const isSelectedRow = rowState !== "empty";
  const isFullRow = rowState === "full";
  const isPartialRow = rowState === "partial";
  const hasSelectedCellInRow = selectedCellAtkSet.has(atkType);
  const isPinnedRow = pinnedAtkSet.has(atkType);
  const isHoveredRow = hoveredCell?.atk === atkType;
  const isRowMuted =
    (hasActiveAtkTypes && !isSelectedRow && !isPinnedRow && !hasSelectedCellInRow && !isHoveredRow) ||
    (hoveredCell?.atk != null && !isHoveredRow);

  return (
    <>
      <button
        type="button"
        onClick={(event) => onToggleRow(atkType, event.shiftKey)}
        onMouseEnter={() => onHover({ atk: atkType })}
        onMouseLeave={() => onHover(null)}
        className={cn(
          "flex h-6 items-center justify-end rounded-md pr-2 transition-all duration-150",
          hasSelectedCellInRow && "bg-secondary-accent/[0.06] ring-1 ring-secondary-accent/20",
          isPinnedRow && "bg-secondary-accent/10 ring-1 ring-secondary-accent/35",
          isPartialRow && "bg-primary/5 ring-1 ring-primary/25",
          isFullRow && "bg-primary/10 ring-1 ring-primary/45 shadow-warm",
          isRowMuted && "opacity-45",
        )}
        aria-pressed={isFullRow}
        aria-label={`Toggle ${atkType} attacking row`}
        title={`${atkType} attacking row`}
      >
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 font-heading text-[8px] font-semibold text-white uppercase transition-all duration-150",
            hasSelectedCellInRow && "ring-1 ring-white/25",
            isPinnedRow && "ring-1 ring-white/40",
            isPartialRow && "ring-1 ring-white/30",
            isFullRow && "scale-105 ring-1 ring-white/60",
          )}
          style={{
            backgroundColor: TYPE_COLORS_HEX[atkType],
          }}
        >
          {atkType}
        </span>
      </button>

      {ALL_TYPES.map((defType) => {
        const factor = getTypeFactor(atkType, defType);
        const isPinnedColumn = pinnedDefSet.has(defType);
        const isMassSelectedColumn = massSelectedDefSet.has(defType);
        const isSelectedCell = selectedChartCellSet.has(
          chartCellKey(atkType, defType),
        );
        const isAxisContext =
          isSelectedRow || isMassSelectedColumn || isPinnedRow || isPinnedColumn;
        const isHoveredColumn = hoveredCell?.def === defType;
        const isHoverAxis = isHoveredRow || isHoveredColumn;
        const isHoveredIntersection = isHoveredRow && isHoveredColumn;
        const isDimmed =
          (hasChartSelection || hoveredCell != null) &&
          !isSelectedCell &&
          !isAxisContext &&
          !isHoverAxis;

        return (
          <motion.button
            key={`${atkType}-${defType}`}
            type="button"
            className={cn(
              "relative isolate flex h-6 items-center justify-center overflow-hidden rounded-sm text-[10px] transition-all duration-150",
              FACTOR_BG[factor] ?? FACTOR_BG[1],
              FACTOR_TEXT[factor] ?? FACTOR_TEXT[1],
              isHoverAxis && "ring-1 ring-primary/25",
              isHoveredIntersection && "ring-primary/55",
              isSelectedCell && "z-10 ring-2 ring-primary/70 shadow-warm",
              isDimmed && "opacity-35",
            )}
            onMouseEnter={() => onHover({ atk: atkType, def: defType })}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelectCell(atkType, defType)}
            title={`${atkType} vs ${defType}: ${factor}x`}
            aria-pressed={isSelectedCell}
            aria-label={`${atkType} attacking ${defType} defending, ${factor}x`}
            whileHover={{ scale: 1.15 }}
          >
            {(isAxisContext || isSelectedCell) && (
              <span
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-sm bg-primary/[0.04]",
                  (isPinnedRow || isPinnedColumn) && "bg-secondary-accent/[0.06]",
                  isSelectedCell && "bg-primary/20",
                )}
              />
            )}
            <span className="relative z-10">
              {FACTOR_LABEL[factor] ?? factor}
            </span>
          </motion.button>
        );
      })}
    </>
  );
}
