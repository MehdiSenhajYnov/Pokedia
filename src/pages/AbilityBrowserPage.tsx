import { useMemo, useRef, useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAllAbilities } from "@/hooks/use-abilities";
import { useSearchStore } from "@/stores/search-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabStore } from "@/stores/tab-store";
import { SearchCrossResults } from "@/components/layout/SearchCrossResults";
import { GlassToolbar } from "@/components/ui/liquid-glass";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AbilitySummary } from "@/types";

const GRID_CARD_MIN_WIDTH = 300;
const GRID_CARD_HEIGHT = 132;
const GRID_GAP = 16;

export default function AbilityBrowserPage() {
  usePageTitle("Abilities");
  const { data: allAbilities, isLoading } = useAllAbilities();
  const { query } = useSearchStore();
  const [genFilter, setGenFilter] = useState<string>("__all__");

  const generations = useMemo(() => {
    if (!allAbilities) return [];
    const gens = new Set(
      allAbilities.map((a) => a.generation).filter((g): g is number => g !== null),
    );
    return Array.from(gens).sort((a, b) => a - b);
  }, [allAbilities]);

  const filtered = useMemo(() => {
    let result = allAbilities ?? [];
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (a) =>
          (a.name_en?.toLowerCase().includes(q) ?? false) ||
          (a.name_fr?.toLowerCase().includes(q) ?? false) ||
          a.id.toString() === q,
      );
    }
    if (genFilter !== "__all__") {
      const gen = parseInt(genFilter, 10);
      result = result.filter((a) => a.generation === gen);
    }
    return result;
  }, [allAbilities, query, genFilter]);

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        <div className="h-9 w-64 skeleton-shimmer rounded-full" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="h-24 skeleton-shimmer rounded-2xl"
              style={{ animationDelay: `${i * 0.04}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Toolbar */}
      <GlassToolbar className="rounded-2xl border border-border/30">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <h1 className="font-heading text-lg font-bold mr-2">Abilities</h1>

          <Select value={genFilter} onValueChange={setGenFilter}>
            <SelectTrigger className="w-auto min-w-[130px]" aria-label="Filter by generation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All generations</SelectItem>
              {generations.map((g) => (
                <SelectItem key={g} value={String(g)}>
                  Generation {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5 ml-auto font-mono text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{filtered.length} abilities</span>
          </div>
        </div>
      </GlassToolbar>

      {filtered.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-16 gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Sparkles className="h-10 w-10 text-muted-foreground/40 animate-[float_3s_ease-in-out_infinite]" />
          <p className="text-sm text-muted-foreground">
            No abilities found matching your search.
          </p>
        </motion.div>
      ) : (
        <VirtualizedAbilityGrid items={filtered} />
      )}

      {query.length >= 2 && <SearchCrossResults exclude="abilities" />}
    </div>
  );
}

function VirtualizedAbilityGrid({ items }: { items: AbilitySummary[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(2);
  const navigate = useNavigate();
  const { abilityName, description } = useSettingsStore();
  const { openTab } = useTabStore();

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      setColumns(Math.max(1, Math.floor((w + GRID_GAP) / (GRID_CARD_MIN_WIDTH + GRID_GAP))));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleClick = useCallback(
    (ability: AbilitySummary) => {
      openTab({
        kind: "ability",
        entityId: ability.id,
        nameEn: ability.name_en ?? "",
        nameFr: ability.name_fr ?? "",
        typeKey: null,
      });
      navigate(`/abilities/${ability.id}`);
    },
    [openTab, navigate],
  );

  const handleMiddleClick = useCallback(
    (ability: AbilitySummary) => {
      openTab({
        kind: "ability",
        entityId: ability.id,
        nameEn: ability.name_en ?? "",
        nameFr: ability.name_fr ?? "",
        typeKey: null,
      }, true);
    },
    [openTab],
  );

  const rowCount = Math.ceil(items.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => GRID_CARD_HEIGHT + GRID_GAP,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto"
      style={{ height: "calc(100vh - 180px)" }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * columns;
          const rowItems = items.slice(startIdx, startIdx + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: virtualRow.start,
                left: 0,
                right: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${GRID_GAP}px`,
              }}
            >
              {rowItems.map((ability) => (
                <AbilityCard
                  key={ability.id}
                  ability={ability}
                  name={abilityName(ability.name_en, ability.name_fr)}
                  effect={description(ability.short_effect_en, ability.short_effect_fr)}
                  onClick={handleClick}
                  onMiddleClick={handleMiddleClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AbilityCardProps {
  ability: AbilitySummary;
  name: string;
  effect: string;
  onClick: (ability: AbilitySummary) => void;
  onMiddleClick: (ability: AbilitySummary) => void;
}

const AbilityCard = memo(function AbilityCard({ ability, name, effect, onClick, onMiddleClick }: AbilityCardProps) {
  return (
    <div
      onClick={() => onClick(ability)}
      onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); onMiddleClick(ability); } }}
      className="group flex gap-3 rounded-2xl glass-flat border border-border/30 px-4 py-4 cursor-pointer hover:border-primary/30 hover:shadow-warm hover:-translate-y-1 transition-all duration-200"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/8 text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-heading text-[15px] font-semibold leading-tight truncate">
            {name || "Unknown Ability"}
          </span>
          {ability.generation && (
            <span className="inline-flex items-center rounded-full bg-white/8 px-2.5 py-1 font-heading text-xs font-medium text-muted-foreground flex-shrink-0">
              Gen {ability.generation}
            </span>
          )}
        </div>
        {effect && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {effect}
          </p>
        )}
      </div>
    </div>
  );
});
