import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  useDeferredValue,
  memo,
  type CSSProperties,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid, List, Plus, Check, DatabaseZap, Heart, X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePokemonBrowserPages } from "@/hooks/use-pokemon";
import { useFavorites, useToggleFavorite } from "@/hooks/use-favorites";
import { useSearchStore } from "@/stores/search-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useComparisonStore } from "@/stores/comparison-store";
import { useTabStore } from "@/stores/tab-store";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { ALL_TYPES, STAT_COLORS, TYPE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getFormLabel } from "@/lib/pokemon-utils";
import { GlassToolbar } from "@/components/ui/liquid-glass";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PokemonSummary } from "@/types";

const GENERATIONS = [
  { label: "Gen I", min: 1, max: 151 },
  { label: "Gen II", min: 152, max: 251 },
  { label: "Gen III", min: 252, max: 386 },
  { label: "Gen IV", min: 387, max: 493 },
  { label: "Gen V", min: 494, max: 649 },
  { label: "Gen VI", min: 650, max: 721 },
  { label: "Gen VII", min: 722, max: 809 },
  { label: "Gen VIII", min: 810, max: 905 },
  { label: "Gen IX", min: 906, max: 1025 },
] as const;

type PokemonListItem = PokemonSummary & {
  baseId: number;
  displayName: string;
  formLabel: string | null;
  typeHex: string;
};

export default function PokemonBrowserPage() {
  usePageTitle("Pokédex");
  const query = useSearchStore((s) => s.query);
  const pokemonTypeFilter = useSearchStore((s) => s.pokemonTypeFilter);
  const pokemonType2Filter = useSearchStore((s) => s.pokemonType2Filter);
  const pokemonSort = useSearchStore((s) => s.pokemonSort);
  const pokemonViewMode = useSearchStore((s) => s.pokemonViewMode);
  const pokemonFavoritesOnly = useSearchStore((s) => s.pokemonFavoritesOnly);
  const pokemonGenFilter = useSearchStore((s) => s.pokemonGenFilter);
  const setPokemonTypeFilter = useSearchStore((s) => s.setPokemonTypeFilter);
  const setPokemonType2Filter = useSearchStore((s) => s.setPokemonType2Filter);
  const setPokemonSort = useSearchStore((s) => s.setPokemonSort);
  const setPokemonViewMode = useSearchStore((s) => s.setPokemonViewMode);
  const setPokemonFavoritesOnly = useSearchStore((s) => s.setPokemonFavoritesOnly);
  const setPokemonGenFilter = useSearchStore((s) => s.setPokemonGenFilter);
  const resetAllFilters = useSearchStore((s) => s.resetAllFilters);
  const pokemonName = useSettingsStore((s) => s.pokemonName);
  const langPokemonNames = useSettingsStore((s) => s.langPokemonNames);

  const deferredQuery = useDeferredValue(query);
  const generation = pokemonGenFilter !== null ? GENERATIONS[pokemonGenFilter] : null;
  const activeQuery = deferredQuery.trim();
  const hasActiveFilters =
    activeQuery.length > 0 ||
    pokemonTypeFilter !== null ||
    pokemonType2Filter !== null ||
    pokemonFavoritesOnly ||
    pokemonGenFilter !== null;

  const pokemonBrowserParams = useMemo(
    () => ({
      query: activeQuery,
      typeFilter: pokemonTypeFilter,
      type2Filter: pokemonType2Filter,
      genMin: generation?.min ?? null,
      genMax: generation?.max ?? null,
      sort: pokemonSort,
      favoritesOnly: pokemonFavoritesOnly,
      nameLang: langPokemonNames,
    }),
    [
      activeQuery,
      pokemonTypeFilter,
      pokemonType2Filter,
      generation,
      pokemonSort,
      pokemonFavoritesOnly,
      langPokemonNames,
    ],
  );

  const {
    data: pokemonPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = usePokemonBrowserPages(pokemonBrowserParams);

  const loadedPokemon = useMemo(
    () => pokemonPages?.pages.flatMap((page) => page.items) ?? [],
    [pokemonPages],
  );
  const totalPokemon = pokemonPages?.pages[0]?.total ?? 0;
  const pokedexRootRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const preparedPokemon = useMemo<PokemonListItem[]>(() => {
    return loadedPokemon.map((p) => {
      const baseId = p.species_id ?? p.id;
      const displayName = pokemonName(p.name_en, p.name_fr);

      return {
        ...p,
        baseId,
        displayName,
        formLabel: baseId !== p.id ? getFormLabel(p.name_key) : null,
        typeHex: TYPE_COLORS[p.type1_key ?? ""]?.hex ?? "#888",
      };
    });
  }, [loadedPokemon, pokemonName]);

  const getActiveScrollElement = useCallback(
    () => (pokemonViewMode === "grid" ? gridScrollRef.current : listScrollRef.current),
    [pokemonViewMode],
  );

  useEffect(() => {
    const handle = window.requestAnimationFrame(() => {
      getActiveScrollElement()?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [
    activeQuery,
    pokemonTypeFilter,
    pokemonType2Filter,
    pokemonSort,
    pokemonFavoritesOnly,
    pokemonGenFilter,
    pokemonViewMode,
    getActiveScrollElement,
  ]);

  const routeWheelToPokedex = useCallback(
    (event: WheelEvent | ReactWheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey) return;

      const scrollEl = getActiveScrollElement();
      if (!scrollEl) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      const rootEl = pokedexRootRef.current;
      if (!rootEl?.contains(target)) return;
      if (scrollEl.contains(target)) return;
      if (shouldLetTargetHandleWheel(target)) return;

      const nativeEvent = "nativeEvent" in event ? event.nativeEvent : event;
      const delta = normalizeWheelDelta(nativeEvent, scrollEl.clientHeight);
      if (delta === 0) return;

      event.preventDefault();
      event.stopPropagation();

      const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
      scrollEl.scrollTop = Math.max(0, Math.min(maxScrollTop, scrollEl.scrollTop + delta));
    },
    [getActiveScrollElement],
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="h-9 w-64 skeleton-shimmer rounded-full" />
          <div className="h-9 w-32 skeleton-shimmer rounded-xl" />
          <div className="h-9 w-32 skeleton-shimmer rounded-xl" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-5">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="h-40 skeleton-shimmer rounded-xl"
              style={{ animationDelay: `${i * 0.04}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (totalPokemon === 0 && !hasActiveFilters) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <DatabaseZap className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="font-heading text-xl font-semibold">No data yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          It looks like the database is empty. Head over to{" "}
          <Link to="/settings" className="font-medium text-primary underline">
            Settings
          </Link>{" "}
          and run a sync to download the latest data from PokeAPI.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={pokedexRootRef}
      className="relative flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5"
      onWheelCapture={routeWheelToPokedex}
    >
      <h1 className="sr-only">Pokédex</h1>
      {/* ── Toolbar ── */}
      <GlassToolbar className="rounded-2xl border border-border/30">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          {/* Type filter */}
          <Select value={pokemonTypeFilter ?? "__all__"} onValueChange={(v) => setPokemonTypeFilter(v === "__all__" ? null : v)}>
            <SelectTrigger className="w-auto min-w-[120px]" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {ALL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Second type filter — only visible when first type is set */}
          {pokemonTypeFilter && (
            <Select value={pokemonType2Filter ?? "__any__"} onValueChange={(v) => setPokemonType2Filter(v === "__any__" ? null : v)}>
              <SelectTrigger className="w-auto min-w-[120px]" aria-label="Filter by second type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">+ Any type</SelectItem>
                {ALL_TYPES.filter((t) => t !== pokemonTypeFilter).map((t) => (
                  <SelectItem key={t} value={t}>
                    + {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Generation filter */}
          <Select value={pokemonGenFilter !== null ? String(pokemonGenFilter) : "__all__"} onValueChange={(v) => setPokemonGenFilter(v === "__all__" ? null : Number(v))}>
            <SelectTrigger className="w-auto min-w-[110px]" aria-label="Filter by generation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All gens</SelectItem>
              {GENERATIONS.map((g, i) => (
                <SelectItem key={i} value={String(i)}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={pokemonSort} onValueChange={setPokemonSort}>
            <SelectTrigger className="w-auto min-w-[120px]" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">Sort: #ID</SelectItem>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="bst">Sort: BST</SelectItem>
              <SelectItem value="hp">Sort: HP</SelectItem>
              <SelectItem value="atk">Sort: Atk</SelectItem>
              <SelectItem value="def">Sort: Def</SelectItem>
              <SelectItem value="spa">Sort: SpA</SelectItem>
              <SelectItem value="spd">Sort: SpD</SelectItem>
              <SelectItem value="spe">Sort: Spe</SelectItem>
            </SelectContent>
          </Select>

          {/* Favorites toggle */}
          <button
            onClick={() => setPokemonFavoritesOnly(!pokemonFavoritesOnly)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm transition-colors",
              pokemonFavoritesOnly
                ? "border-red-500/50 bg-red-500/10 text-red-500"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
            )}
            aria-label="Show favorites only"
            aria-pressed={pokemonFavoritesOnly}
          >
            <Heart className={cn("h-3.5 w-3.5", pokemonFavoritesOnly && "fill-current")} />
            <span className="hidden sm:inline">Favorites</span>
          </button>

          {/* View toggle — segmented control */}
          <div className="relative flex rounded-xl bg-white/5 border border-white/10 p-0.5" role="group" aria-label="View mode">
            <div
              className="absolute top-0.5 bottom-0.5 rounded-lg bg-white/10"
              style={{
                width: "calc(50% - 2px)",
                left: pokemonViewMode === "grid" ? 2 : "calc(50%)",
              }}
            />
            <button
              onClick={() => setPokemonViewMode("grid")}
              className={cn(
                "relative z-10 flex h-8 w-9 items-center justify-center transition-colors",
                pokemonViewMode === "grid"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Grid view"
              aria-pressed={pokemonViewMode === "grid"}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPokemonViewMode("list")}
              className={cn(
                "relative z-10 flex h-8 w-9 items-center justify-center transition-colors",
                pokemonViewMode === "list"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="List view"
              aria-pressed={pokemonViewMode === "list"}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Count */}
          <span className="font-mono text-xs text-muted-foreground" aria-live="polite">
            {totalPokemon} Pokemon
          </span>

          {/* Clear filters */}
          {(pokemonTypeFilter || pokemonType2Filter || pokemonGenFilter !== null || pokemonFavoritesOnly || pokemonSort !== "id" || query) && (
            <button
              onClick={resetAllFilters}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </GlassToolbar>

      {/* ── Content ── */}
      {pokemonViewMode === "grid" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <VirtualizedGrid
            scrollRef={gridScrollRef}
            pokemon={preparedPokemon}
            totalCount={totalPokemon}
            fetchMore={fetchNextPage}
            hasMore={hasNextPage}
            isFetchingMore={isFetchingNextPage}
          >
          </VirtualizedGrid>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <VirtualizedList
            scrollRef={listScrollRef}
            pokemon={preparedPokemon}
            totalCount={totalPokemon}
            fetchMore={fetchNextPage}
            hasMore={hasNextPage}
            isFetchingMore={isFetchingNextPage}
          >
          </VirtualizedList>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Virtualized Grid view
// ---------------------------------------------------------------------------

const CARD_MIN_WIDTH = 200;
const CARD_HEIGHT = 264;
const GAP = 24;

const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

interface VirtualizedPokemonProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  pokemon: PokemonListItem[];
  totalCount: number;
  fetchMore: () => void;
  hasMore: boolean;
  isFetchingMore: boolean;
  children?: React.ReactNode;
}

function normalizeWheelDelta(
  event: Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode">,
  viewportHeight: number,
): number {
  const dominantDelta =
    Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return dominantDelta * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return dominantDelta * viewportHeight;
  }

  return dominantDelta;
}

function shouldLetTargetHandleWheel(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      [
        "[data-slot='select-content']",
        "[data-radix-popper-content-wrapper]",
        "[role='listbox']",
        "[role='dialog']",
        "[data-scroll-lock]",
      ].join(","),
    ),
  );
}

function VirtualizedGrid({
  scrollRef,
  pokemon,
  totalCount,
  fetchMore,
  hasMore,
  isFetchingMore,
  children,
}: VirtualizedPokemonProps) {
  const parentRef = scrollRef;
  const [columns, setColumns] = useState(5);
  const navigate = useNavigate();
  const addPokemon = useComparisonStore((s) => s.addPokemon);
  const removePokemon = useComparisonStore((s) => s.removePokemon);
  const comparisonIds = useComparisonStore((s) => s.pokemonIds);
  const comparisonSet = useMemo(() => new Set(comparisonIds), [comparisonIds]);
  const { openTab } = useTabStore();
  const { data: favorites } = useFavorites();
  const favSet = useMemo(() => new Set(favorites ?? []), [favorites]);
  const { mutate: toggleFav } = useToggleFavorite();

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setColumns(Math.max(1, Math.floor((w + GAP) / (CARD_MIN_WIDTH + GAP))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [parentRef]);

  const handleCardClick = useCallback((p: PokemonSummary) => {
    navigate(`/pokemon/${p.id}`);
  }, [navigate]);

  const handleMiddleClick = useCallback((p: PokemonSummary) => {
    openTab({
      kind: "pokemon",
      entityId: p.id,
      nameEn: p.name_en ?? "",
      nameFr: p.name_fr ?? "",
      typeKey: p.type1_key,
      spriteUrl: p.sprite_url,
    }, true);
  }, [openTab]);

  const handleToggleFav = useCallback((id: number) => {
    const wasFav = favSet.has(id);
    toggleFav(id);
    toast(wasFav ? "Removed from favorites" : "Added to favorites", { duration: 1500 });
  }, [toggleFav, favSet]);

  const handleToggleCompare = useCallback((id: number, isCompared: boolean) => {
    if (isCompared) {
      removePokemon(id);
      toast("Removed from comparison", { duration: 1500 });
    } else {
      addPokemon(id);
      toast("Added to comparison", { duration: 1500 });
    }
  }, [addPokemon, removePokemon]);

  const rowCount = Math.ceil(totalCount / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 2,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtualRow = virtualItems.at(-1);
  const lastVirtualRowIndex = lastVirtualRow?.index ?? -1;

  useEffect(() => {
    if (lastVirtualRowIndex < 0 || !hasMore || isFetchingMore) return;
    const loadedRows = Math.ceil(pokemon.length / columns);
    if (lastVirtualRowIndex >= loadedRows - 3) {
      fetchMore();
    }
  }, [columns, fetchMore, hasMore, isFetchingMore, lastVirtualRowIndex, pokemon.length]);

  if (totalCount === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3"
      >
        <DatabaseZap className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No Pokemon match your search.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="pokedex-scroll flex-1 min-h-0 overflow-y-auto"
      tabIndex={-1}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const startIdx = virtualRow.index * columns;

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
                gap: `${GAP}px`,
              }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => {
                const itemIndex = startIdx + colIndex;
                if (itemIndex >= totalCount) {
                  return <div key={`empty-${itemIndex}`} />;
                }

                const p = pokemon[itemIndex];
                if (!p) {
                  return <PokemonGridCardSkeleton key={`loading-${itemIndex}`} />;
                }

                return (
                  <div key={p.id}>
                  <PokemonGridCard
                    pokemon={p}
                    isFavorite={favSet.has(p.id)}
                    isCompared={comparisonSet.has(p.id)}
                    onToggleFav={handleToggleFav}
                    onToggleCompare={handleToggleCompare}
                    onClick={handleCardClick}
                    onMiddleClick={handleMiddleClick}
                  />
                </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}

function PokemonGridCardSkeleton() {
  return (
    <div
      className="pokedex-card rounded-xl glass-flat border border-border/30 p-5"
      style={{ height: CARD_HEIGHT }}
      aria-hidden="true"
    >
      <div className="mx-auto h-4 w-12 skeleton-shimmer rounded-full" />
      <div className="mx-auto mt-4 h-24 w-24 skeleton-shimmer rounded-full" />
      <div className="mx-auto mt-4 h-4 w-24 skeleton-shimmer rounded-full" />
      <div className="mx-auto mt-3 flex justify-center gap-1.5">
        <div className="h-5 w-14 skeleton-shimmer rounded-full" />
        <div className="h-5 w-14 skeleton-shimmer rounded-full" />
      </div>
      <div className="mx-auto mt-4 h-4 w-16 skeleton-shimmer rounded-full" />
    </div>
  );
}

// Pure presentational grid card — ZERO hooks inside
interface PokemonGridCardProps {
  pokemon: PokemonListItem;
  isFavorite: boolean;
  isCompared: boolean;
  onToggleFav: (id: number) => void;
  onToggleCompare: (id: number, isCompared: boolean) => void;
  onClick: (p: PokemonSummary) => void;
  onMiddleClick: (p: PokemonSummary) => void;
}

const PokemonGridCard = memo(function PokemonGridCard({
  pokemon,
  isFavorite, isCompared,
  onToggleFav, onToggleCompare, onClick, onMiddleClick,
}: PokemonGridCardProps) {
  return (
    <div
      className="group"
      onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); onMiddleClick(pokemon); } }}
    >
      <div
        onClick={() => onClick(pokemon)}
        className="pokedex-card relative flex flex-col items-center rounded-xl glass-flat border border-border/30 p-5 cursor-pointer transition-[border-color,box-shadow,transform] duration-150 hover:border-[var(--type-color)] hover:shadow-[0_4px_18px_var(--type-glow)] active:scale-[0.98]"
        style={{
          "--type-color": `${pokemon.typeHex}60`,
          "--type-glow": `${pokemon.typeHex}20`,
          backgroundImage: `radial-gradient(circle at 20% 0%, ${pokemon.typeHex}0C, transparent 50%), linear-gradient(to bottom, transparent 40%, ${pokemon.typeHex}18)`,
        } as React.CSSProperties}
      >
        {/* Action buttons */}
        <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav(pokemon.id); }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition-all",
              isFavorite
                ? "text-red-500"
                : "text-muted-foreground/40 opacity-40 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 hover:text-red-400",
            )}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onToggleCompare(pokemon.id, isCompared); }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200",
              isCompared
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground opacity-40 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100",
            )}
            aria-label={isCompared ? "Remove from comparison" : "Add to comparison"}
          >
            {isCompared ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </button>
        </div>

        {/* ID */}
        <span className="font-mono text-[13px] text-muted-foreground/60">
          #{String(pokemon.baseId).padStart(3, "0")}
        </span>

        {/* Sprite — plain img, no hooks */}
        <div className="h-24 w-24 transition-transform duration-200 ease-out group-hover:-translate-y-2">
          <img
            src={pokemon.sprite_url ?? `${SPRITE_BASE}/${pokemon.id}.png`}
            alt={pokemon.displayName}
            className="h-24 w-24 object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Name + form label */}
        <span className="mt-2 truncate font-heading text-[15px] font-semibold max-w-full">{pokemon.displayName}</span>
        {pokemon.formLabel && (
          <span className="truncate text-[13px] text-muted-foreground max-w-full">{pokemon.formLabel}</span>
        )}

        {/* Type badges */}
        <div className="mt-2 flex gap-1.5">
          <TypeBadge type={pokemon.type1_key} />
          {pokemon.type2_key && <TypeBadge type={pokemon.type2_key} />}
        </div>

        {/* BST */}
        <span className="mt-2 font-mono text-[13px] text-muted-foreground">
          BST {pokemon.base_stat_total ?? "\u2014"}
        </span>
      </div>
    </div>
  );
})

// ---------------------------------------------------------------------------
// Virtualized List / table view
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 72;
const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
const LIST_GRID_COLUMNS =
  "56px 56px minmax(150px,1.4fr) minmax(126px,1fr) repeat(6,minmax(40px,58px)) minmax(56px,64px) 48px";

function VirtualizedList({
  scrollRef,
  pokemon,
  totalCount,
  fetchMore,
  hasMore,
  isFetchingMore,
  children,
}: VirtualizedPokemonProps) {
  const addPokemon = useComparisonStore((s) => s.addPokemon);
  const removePokemon = useComparisonStore((s) => s.removePokemon);
  const comparisonIds = useComparisonStore((s) => s.pokemonIds);
  const comparisonSet = useMemo(() => new Set(comparisonIds), [comparisonIds]);
  const { openTab } = useTabStore();
  const navigate = useNavigate();
  const parentRef = scrollRef;

  const virtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtualItem = virtualItems.at(-1);
  const lastVirtualItemIndex = lastVirtualItem?.index ?? -1;

  const handleOpen = useCallback((id: number) => {
    navigate(`/pokemon/${id}`);
  }, [navigate]);

  const handleMiddleOpen = useCallback((p: PokemonListItem) => {
    openTab({
      kind: "pokemon",
      entityId: p.id,
      nameEn: p.name_en ?? "",
      nameFr: p.name_fr ?? "",
      typeKey: p.type1_key,
      spriteUrl: p.sprite_url,
    }, true);
  }, [openTab]);

  const handleToggleCompare = useCallback((id: number, isCompared: boolean) => {
    if (isCompared) {
      removePokemon(id);
      toast("Removed from comparison", { duration: 1500 });
    } else {
      addPokemon(id);
      toast("Added to comparison", { duration: 1500 });
    }
  }, [addPokemon, removePokemon]);

  useEffect(() => {
    if (lastVirtualItemIndex < 0 || !hasMore || isFetchingMore) return;
    if (lastVirtualItemIndex >= pokemon.length - 24) {
      fetchMore();
    }
  }, [fetchMore, hasMore, isFetchingMore, lastVirtualItemIndex, pokemon.length]);

  if (totalCount === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3"
      >
        <DatabaseZap className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No Pokemon match your search.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="pokedex-scroll flex-1 min-h-0 overflow-y-auto"
      tabIndex={-1}
    >
      <div role="table" aria-rowcount={totalCount} className="w-full text-sm">
        <PokemonListHeader />
        <div
          role="rowgroup"
          style={{
            height: virtualizer.getTotalSize(),
            position: "relative",
            width: "100%",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const rowStyle: CSSProperties = {
              height: ROW_HEIGHT,
              left: 0,
              position: "absolute",
              right: 0,
              top: 0,
              transform: `translateY(${virtualRow.start}px)`,
            };
            const p = pokemon[virtualRow.index];

            if (!p) {
              return <PokemonListRowSkeleton key={virtualRow.key} style={rowStyle} />;
            }

            return (
              <PokemonListRow
                key={p.id}
                pokemon={p}
                isCompared={comparisonSet.has(p.id)}
                style={rowStyle}
                onOpen={handleOpen}
                onMiddleOpen={handleMiddleOpen}
                onToggleCompare={handleToggleCompare}
              />
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}

function PokemonListHeader() {
  return (
    <div
      role="row"
      className="glass-heavy sticky top-0 z-10 grid h-11 items-center border-b border-border/30 font-heading text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground"
      style={{ gridTemplateColumns: LIST_GRID_COLUMNS }}
    >
      <div className="px-4" role="columnheader">#</div>
      <div className="px-1" role="columnheader"><span className="sr-only">Sprite</span></div>
      <div className="px-4" role="columnheader">Name</div>
      <div className="px-4" role="columnheader">Type</div>
      {STAT_KEYS.map((s) => (
        <div
          key={s}
          className="px-3 text-right"
          role="columnheader"
          style={{ color: STAT_COLORS[s] }}
        >
          {s === "hp" ? "HP" : s === "atk" ? "Atk" : s === "def" ? "Def" : s === "spa" ? "SpA" : s === "spd" ? "SpD" : "Spe"}
        </div>
      ))}
      <div className="px-3 text-right" role="columnheader">BST</div>
      <div className="px-2" role="columnheader"><span className="sr-only">Actions</span></div>
    </div>
  );
}

interface PokemonListRowProps {
  pokemon: PokemonListItem;
  isCompared: boolean;
  style: CSSProperties;
  onOpen: (id: number) => void;
  onMiddleOpen: (pokemon: PokemonListItem) => void;
  onToggleCompare: (id: number, isCompared: boolean) => void;
}

const PokemonListRow = memo(function PokemonListRow({
  pokemon,
  isCompared,
  style,
  onOpen,
  onMiddleOpen,
  onToggleCompare,
}: PokemonListRowProps) {
  const isForm = pokemon.baseId !== pokemon.id;

  return (
    <div
      role="row"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        onOpen(pokemon.id);
      }}
      onMouseDown={(e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        onMiddleOpen(pokemon);
      }}
      className={cn(
        "pokedex-row grid cursor-pointer items-center border-b border-border/20 transition-colors hover:bg-primary/5",
        isForm && "bg-muted/30",
      )}
      style={{ ...style, gridTemplateColumns: LIST_GRID_COLUMNS }}
    >
      <div className="px-4 font-mono text-muted-foreground tabular-nums" role="cell">
        {String(pokemon.baseId).padStart(3, "0")}
      </div>
      <div className="px-1" role="cell">
        <Link to={`/pokemon/${pokemon.id}`} className="flex h-12 w-12 items-center justify-center">
          <img
            src={pokemon.sprite_url ?? `${SPRITE_BASE}/${pokemon.id}.png`}
            alt=""
            className="h-12 w-12 object-contain"
            loading="lazy"
            decoding="async"
          />
        </Link>
      </div>
      <div className="min-w-0 px-4" role="cell">
        <Link
          to={`/pokemon/${pokemon.id}`}
          className="block truncate font-heading text-[15px] font-medium hover:underline"
        >
          {pokemon.displayName}
          {pokemon.formLabel && (
            <span className="ml-1.5 text-[13px] font-body font-normal text-muted-foreground">
              · {pokemon.formLabel}
            </span>
          )}
        </Link>
      </div>
      <div className="min-w-0 px-4" role="cell">
        <div className="flex min-w-0 gap-1">
          <TypeBadge type={pokemon.type1_key} />
          {pokemon.type2_key && <TypeBadge type={pokemon.type2_key} />}
        </div>
      </div>
      {STAT_KEYS.map((s) => (
        <div
          key={s}
          className="px-3 text-right font-mono text-[13px]"
          role="cell"
          style={{ color: pokemon[s] !== null ? STAT_COLORS[s] : undefined }}
        >
          {pokemon[s] ?? "\u2014"}
        </div>
      ))}
      <div className="px-3 text-right font-mono text-[13px] font-semibold" role="cell">
        {pokemon.base_stat_total ?? "\u2014"}
      </div>
      <div className="px-2" role="cell">
        <button
          onClick={() => onToggleCompare(pokemon.id, isCompared)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
            isCompared
              ? "border-primary bg-primary text-primary-foreground"
              : "border-white/10 text-muted-foreground hover:bg-white/10",
          )}
          aria-label={isCompared ? "Remove from comparison" : "Add to comparison"}
        >
          {isCompared ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
});

function PokemonListRowSkeleton({ style }: { style: CSSProperties }) {
  return (
    <div
      role="row"
      className="pokedex-row grid items-center border-b border-border/20"
      style={{ ...style, gridTemplateColumns: LIST_GRID_COLUMNS }}
      aria-hidden="true"
    >
      <div className="px-4" role="cell">
        <div className="h-4 w-10 skeleton-shimmer rounded-full" />
      </div>
      <div className="px-1" role="cell">
        <div className="h-12 w-12 skeleton-shimmer rounded-full" />
      </div>
      <div className="px-4" role="cell">
        <div className="h-4 w-32 skeleton-shimmer rounded-full" />
      </div>
      <div className="px-4" role="cell">
        <div className="flex gap-1">
          <div className="h-5 w-14 skeleton-shimmer rounded-full" />
          <div className="h-5 w-14 skeleton-shimmer rounded-full" />
        </div>
      </div>
      {STAT_KEYS.map((stat) => (
        <div key={stat} className="px-3" role="cell">
          <div className="ml-auto h-4 w-8 skeleton-shimmer rounded-full" />
        </div>
      ))}
      <div className="px-3" role="cell">
        <div className="ml-auto h-4 w-10 skeleton-shimmer rounded-full" />
      </div>
      <div className="px-2" role="cell">
        <div className="h-7 w-7 skeleton-shimmer rounded-full" />
      </div>
    </div>
  );
}
