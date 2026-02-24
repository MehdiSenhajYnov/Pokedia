import { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, LayoutGrid, List, Plus, Check, DatabaseZap, Heart } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAllPokemon } from "@/hooks/use-pokemon";
import { useFavorites } from "@/hooks/use-favorites";
import { useSearchStore } from "@/stores/search-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useComparisonStore } from "@/stores/comparison-store";
import { PokemonCard } from "@/components/pokemon/PokemonCard";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { ALL_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PokemonSummary } from "@/types";

/** Generation ID ranges (National Dex) */
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PokemonBrowserPage() {
  usePageTitle("Pokédex");
  const { data: allPokemon, isLoading } = useAllPokemon();
  const {
    pokemonQuery,
    pokemonTypeFilter,
    pokemonSort,
    pokemonViewMode,
    pokemonFavoritesOnly,
    pokemonGenFilter,
    setPokemonQuery,
    setPokemonTypeFilter,
    setPokemonSort,
    setPokemonViewMode,
    setPokemonFavoritesOnly,
    setPokemonGenFilter,
  } = useSearchStore();
  const { pokemonName } = useSettingsStore();
  const { data: favorites } = useFavorites();
  const favSet = useMemo(() => new Set(favorites ?? []), [favorites]);

  // ------ Client-side filter & sort ------
  const filtered = useMemo(() => {
    let result = allPokemon ?? [];

    // Search by name or ID
    if (pokemonQuery) {
      const q = pokemonQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const en = (p.name_en ?? "").toLowerCase();
        const fr = (p.name_fr ?? "").toLowerCase();
        const idStr = p.id.toString();
        const idPadded = idStr.padStart(3, "0");
        return (
          en.includes(q) ||
          fr.includes(q) ||
          idStr === q ||
          idPadded === q
        );
      });
    }

    // Type filter
    if (pokemonTypeFilter) {
      result = result.filter(
        (p) =>
          p.type1_key === pokemonTypeFilter ||
          p.type2_key === pokemonTypeFilter,
      );
    }

    // Favorites filter
    if (pokemonFavoritesOnly) {
      result = result.filter((p) => favSet.has(p.id));
    }

    // Generation filter
    if (pokemonGenFilter !== null) {
      const gen = GENERATIONS[pokemonGenFilter];
      if (gen) {
        result = result.filter((p) => p.id >= gen.min && p.id <= gen.max);
      }
    }

    // Sort
    const sorted = [...result];
    switch (pokemonSort) {
      case "name":
        sorted.sort((a, b) =>
          pokemonName(a.name_en, a.name_fr).localeCompare(
            pokemonName(b.name_en, b.name_fr),
          ),
        );
        break;
      case "bst":
        sorted.sort(
          (a, b) => (b.base_stat_total ?? 0) - (a.base_stat_total ?? 0),
        );
        break;
      case "hp":
        sorted.sort((a, b) => (b.hp ?? 0) - (a.hp ?? 0));
        break;
      case "atk":
        sorted.sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0));
        break;
      case "def":
        sorted.sort((a, b) => (b.def ?? 0) - (a.def ?? 0));
        break;
      case "spa":
        sorted.sort((a, b) => (b.spa ?? 0) - (a.spa ?? 0));
        break;
      case "spd":
        sorted.sort((a, b) => (b.spd ?? 0) - (a.spd ?? 0));
        break;
      case "spe":
        sorted.sort((a, b) => (b.spe ?? 0) - (a.spe ?? 0));
        break;
      default:
        sorted.sort((a, b) => a.id - b.id);
    }

    return sorted;
  }, [allPokemon, pokemonQuery, pokemonTypeFilter, pokemonSort, pokemonName, pokemonFavoritesOnly, favSet, pokemonGenFilter]);

  // ------ Loading skeleton ------
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  // ------ Empty state (no data synced yet) ------
  if (!allPokemon || allPokemon.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <DatabaseZap className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold">No data yet</h2>
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
    <div className="flex flex-col gap-4 p-4">
      <h1 className="sr-only">Pokédex</h1>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={pokemonQuery}
            onChange={(e) => setPokemonQuery(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            aria-label="Search Pokemon"
          />
        </div>

        {/* Type filter */}
        <select
          value={pokemonTypeFilter ?? ""}
          onChange={(e) => setPokemonTypeFilter(e.target.value || null)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        {/* Generation filter */}
        <select
          value={pokemonGenFilter ?? ""}
          onChange={(e) => setPokemonGenFilter(e.target.value ? Number(e.target.value) : null)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filter by generation"
        >
          <option value="">All gens</option>
          {GENERATIONS.map((g, i) => (
            <option key={i} value={i}>{g.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={pokemonSort}
          onChange={(e) => setPokemonSort(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Sort by"
        >
          <option value="id">Sort: #ID</option>
          <option value="name">Sort: Name</option>
          <option value="bst">Sort: BST</option>
          <option value="hp">Sort: HP</option>
          <option value="atk">Sort: Atk</option>
          <option value="def">Sort: Def</option>
          <option value="spa">Sort: SpA</option>
          <option value="spd">Sort: SpD</option>
          <option value="spe">Sort: Spe</option>
        </select>

        {/* Favorites toggle */}
        <button
          onClick={() => setPokemonFavoritesOnly(!pokemonFavoritesOnly)}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
            pokemonFavoritesOnly
              ? "border-red-500/50 bg-red-500/10 text-red-500"
              : "border-input text-muted-foreground hover:text-foreground",
          )}
          aria-label="Show favorites only"
          aria-pressed={pokemonFavoritesOnly}
        >
          <Heart className={cn("h-3.5 w-3.5", pokemonFavoritesOnly && "fill-current")} />
          <span className="hidden sm:inline">Favorites</span>
        </button>

        {/* View toggle */}
        <div className="flex rounded-md border border-input" role="group" aria-label="View mode">
          <button
            onClick={() => setPokemonViewMode("grid")}
            className={cn(
              "flex h-9 w-9 items-center justify-center transition-colors",
              pokemonViewMode === "grid"
                ? "bg-accent text-foreground"
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
              "flex h-9 w-9 items-center justify-center transition-colors",
              pokemonViewMode === "list"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="List view"
            aria-pressed={pokemonViewMode === "list"}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Count */}
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {filtered.length} Pokemon
        </span>
      </div>

      {/* ── Content ── */}
      {pokemonViewMode === "grid" ? (
        <VirtualizedGrid pokemon={filtered} />
      ) : (
        <VirtualizedList pokemon={filtered} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Virtualized Grid view
// ---------------------------------------------------------------------------

const CARD_MIN_WIDTH = 132;
const CARD_HEIGHT = 170;
const GAP = 12;

function VirtualizedGrid({ pokemon }: { pokemon: PokemonSummary[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(5);

  // Track parent width via ResizeObserver so columns update dynamically
  // and also triggers a re-render once the ref is attached (fixing first-render null)
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
  }, []);

  const rowCount = Math.ceil(pokemon.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 5,
  });

  if (pokemon.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No Pokemon match your search.
      </p>
    );
  }

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
          const rowPokemon = pokemon.slice(startIdx, startIdx + columns);

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
              {rowPokemon.map((p) => (
                <PokemonCard key={p.id} pokemon={p} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Virtualized List / table view
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 56;

function VirtualizedList({ pokemon }: { pokemon: PokemonSummary[] }) {
  const { pokemonName } = useSettingsStore();
  const { addPokemon, removePokemon, hasPokemon } = useComparisonStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: pokemon.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  if (pokemon.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No Pokemon match your search.
      </p>
    );
  }

  const spriteBase =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto"
      style={{ height: "calc(100vh - 180px)" }}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="w-14 px-3 py-2.5 text-left" scope="col">#</th>
            <th className="w-10 px-1 py-2.5" scope="col"><span className="sr-only">Sprite</span></th>
            <th className="px-3 py-2.5 text-left" scope="col">Name</th>
            <th className="px-3 py-2.5 text-left" scope="col">Type</th>
            <th className="px-3 py-2.5 text-right" scope="col">HP</th>
            <th className="px-3 py-2.5 text-right" scope="col">Atk</th>
            <th className="px-3 py-2.5 text-right" scope="col">Def</th>
            <th className="px-3 py-2.5 text-right" scope="col">SpA</th>
            <th className="px-3 py-2.5 text-right" scope="col">SpD</th>
            <th className="px-3 py-2.5 text-right" scope="col">Spe</th>
            <th className="px-3 py-2.5 text-right" scope="col">BST</th>
            <th className="w-10 px-3 py-2.5" scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}>
            <td colSpan={12} />
          </tr>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const p = pokemon[virtualRow.index];
            const isCompared = hasPokemon(p.id);
            return (
              <tr
                key={p.id}
                className="border-b border-border/30 transition-colors hover:bg-accent/50"
                style={{ height: ROW_HEIGHT }}
              >
                <td className="px-3 py-2 text-muted-foreground tabular-nums">
                  {String(p.id).padStart(3, "0")}
                </td>
                <td className="px-1 py-1">
                  <Link to={`/pokemon/${p.id}`}>
                    <img
                      src={p.sprite_url ?? `${spriteBase}/${p.id}.png`}
                      alt=""
                      className="h-10 w-10 object-contain"
                      loading="lazy"
                    />
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link
                    to={`/pokemon/${p.id}`}
                    className="font-medium hover:underline"
                  >
                    {pokemonName(p.name_en, p.name_fr)}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <TypeBadge type={p.type1_key} />
                    {p.type2_key && <TypeBadge type={p.type2_key} />}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {p.hp ?? "\u2014"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {p.atk ?? "\u2014"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {p.def ?? "\u2014"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {p.spa ?? "\u2014"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {p.spd ?? "\u2014"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {p.spe ?? "\u2014"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
                  {p.base_stat_total ?? "\u2014"}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() =>
                      isCompared
                        ? removePokemon(p.id)
                        : addPokemon(p.id)
                    }
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
                      isCompared
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                    aria-label={
                      isCompared
                        ? "Remove from comparison"
                        : "Add to comparison"
                    }
                  >
                    {isCompared ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
          <tr style={{ height: virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0) }}>
            <td colSpan={12} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
