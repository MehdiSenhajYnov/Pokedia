import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowUp, ArrowDown, CornerDownLeft, Swords, Package } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAllPokemon } from "@/hooks/use-pokemon";
import { useAllMoves } from "@/hooks/use-moves";
import { useAllItems } from "@/hooks/use-items";
import { useSettingsStore } from "@/stores/settings-store";
import { useSearchStore } from "@/stores/search-store";
import { TYPE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PokemonSummary, MoveSummary, ItemSummary } from "@/types";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  kind: "pokemon" | "move" | "item";
  path: string;
  label: string;
  subtitle?: string;
  spriteUrl?: string | null;
  typeKeys?: (string | null)[];
  /** For moves/items: the name to pre-fill in the page search */
  searchName?: string;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: allPokemon } = useAllPokemon();
  const { data: allMoves } = useAllMoves();
  const { data: allItems } = useAllItems();
  const { pokemonName, moveName, itemName } = useSettingsStore();
  const { setMoveQuery, setItemQuery } = useSearchStore();

  // ── Ctrl+K / Escape ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Reset query when closing
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  // ── Filter results ──
  const results = useMemo<SearchResult[]>(() => {
    if (query.length === 0) return [];
    const q = query.toLowerCase();

    const pokemonResults: SearchResult[] = (allPokemon ?? [])
      .filter((p: PokemonSummary) => {
        const nameEn = p.name_en?.toLowerCase() ?? "";
        const nameFr = p.name_fr?.toLowerCase() ?? "";
        return nameEn.includes(q) || nameFr.includes(q) || p.id.toString() === q;
      })
      .slice(0, 8)
      .map((p: PokemonSummary) => ({
        id: `pokemon-${p.id}`,
        kind: "pokemon" as const,
        path: `/pokemon/${p.id}`,
        label: pokemonName(p.name_en ?? "", p.name_fr ?? ""),
        subtitle: `#${String(p.id).padStart(3, "0")}`,
        spriteUrl: p.sprite_url,
        typeKeys: [p.type1_key, p.type2_key].filter(Boolean),
      }));

    const moveResults: SearchResult[] = (allMoves ?? [])
      .filter((m: MoveSummary) => {
        const nameEn = m.name_en?.toLowerCase() ?? "";
        const nameFr = m.name_fr?.toLowerCase() ?? "";
        return nameEn.includes(q) || nameFr.includes(q);
      })
      .slice(0, 5)
      .map((m: MoveSummary) => {
        const label = moveName(m.name_en ?? "", m.name_fr ?? "");
        return {
          id: `move-${m.id}`,
          kind: "move" as const,
          path: "/moves",
          label,
          searchName: label,
          typeKeys: m.type_key ? [m.type_key] : [],
        };
      });

    const itemResults: SearchResult[] = (allItems ?? [])
      .filter((i: ItemSummary) => {
        const nameEn = i.name_en?.toLowerCase() ?? "";
        const nameFr = i.name_fr?.toLowerCase() ?? "";
        return nameEn.includes(q) || nameFr.includes(q);
      })
      .slice(0, 5)
      .map((i: ItemSummary) => {
        const label = itemName(i.name_en ?? "", i.name_fr ?? "");
        return {
          id: `item-${i.id}`,
          kind: "item" as const,
          path: "/items",
          label,
          searchName: label,
          spriteUrl: i.sprite_url,
        };
      });

    return [...pokemonResults, ...moveResults, ...itemResults];
  }, [query, allPokemon, allMoves, allItems, pokemonName, moveName, itemName]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  // ── Keyboard navigation ──
  const handleSelect = useCallback(
    (result: SearchResult) => {
      // Pre-fill the page search when navigating to moves/items
      if (result.kind === "move" && result.searchName) {
        setMoveQuery(result.searchName);
      } else if (result.kind === "item" && result.searchName) {
        setItemQuery(result.searchName);
      }
      navigate(result.path);
      onOpenChange(false);
    },
    [navigate, onOpenChange, setMoveQuery, setItemQuery]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(results.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % Math.max(results.length, 1));
      } else if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      }
    },
    [results, activeIndex, handleSelect]
  );

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Group results for rendering ──
  const pokemonGroup = results.filter((r) => r.kind === "pokemon");
  const moveGroup = results.filter((r) => r.kind === "move");
  const itemGroup = results.filter((r) => r.kind === "item");

  // Calculate global index offsets for groups
  const pokemonOffset = 0;
  const moveOffset = pokemonGroup.length;
  const itemOffset = moveOffset + moveGroup.length;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Search panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative z-50 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-2xl shadow-black/25"
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Pokemon, moves, items..."
                className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {query.length > 0 && (
                <button
                  onClick={() => setQuery("")}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-80 overflow-y-auto overscroll-contain p-1.5">
              {/* Pokemon group */}
              {pokemonGroup.length > 0 && (
                <div>
                  <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Pokemon
                  </div>
                  {pokemonGroup.map((r, i) => {
                    const globalIdx = pokemonOffset + i;
                    return (
                      <button
                        key={r.id}
                        data-active={activeIndex === globalIdx}
                        onClick={() => handleSelect(r)}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-100",
                          activeIndex === globalIdx
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground/80 hover:bg-accent/50"
                        )}
                      >
                        {/* Sprite */}
                        {r.spriteUrl ? (
                          <img
                            src={r.spriteUrl}
                            alt=""
                            className="h-8 w-8 shrink-0 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                            ?
                          </div>
                        )}

                        {/* Name & ID */}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">{r.label}</span>
                          <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                        </div>

                        {/* Type badges */}
                        <div className="flex shrink-0 items-center gap-1">
                          {r.typeKeys?.map((typeKey) => {
                            if (!typeKey) return null;
                            const colors = TYPE_COLORS[typeKey];
                            return (
                              <span
                                key={typeKey}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                                  colors?.bg ?? "bg-gray-500",
                                  colors?.text ?? "text-white"
                                )}
                              >
                                {typeKey}
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Moves group */}
              {moveGroup.length > 0 && (
                <div>
                  <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Moves
                  </div>
                  {moveGroup.map((r, i) => {
                    const globalIdx = moveOffset + i;
                    return (
                      <button
                        key={r.id}
                        data-active={activeIndex === globalIdx}
                        onClick={() => handleSelect(r)}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-100",
                          activeIndex === globalIdx
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground/80 hover:bg-accent/50"
                        )}
                      >
                        {/* Move icon placeholder */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Swords className="h-4 w-4 text-muted-foreground" />
                        </div>

                        {/* Name */}
                        <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>

                        {/* Type badge */}
                        <div className="flex shrink-0 items-center gap-1">
                          {r.typeKeys?.map((typeKey) => {
                            if (!typeKey) return null;
                            const colors = TYPE_COLORS[typeKey];
                            return (
                              <span
                                key={typeKey}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                                  colors?.bg ?? "bg-gray-500",
                                  colors?.text ?? "text-white"
                                )}
                              >
                                {typeKey}
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Items group */}
              {itemGroup.length > 0 && (
                <div>
                  <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Items
                  </div>
                  {itemGroup.map((r, i) => {
                    const globalIdx = itemOffset + i;
                    return (
                      <button
                        key={r.id}
                        data-active={activeIndex === globalIdx}
                        onClick={() => handleSelect(r)}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-100",
                          activeIndex === globalIdx
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground/80 hover:bg-accent/50"
                        )}
                      >
                        {/* Item sprite */}
                        {r.spriteUrl ? (
                          <img
                            src={r.spriteUrl}
                            alt=""
                            className="h-8 w-8 shrink-0 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}

                        {/* Name */}
                        <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Empty states */}
              {query.length > 0 && results.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                </div>
              )}

              {query.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Search for Pokemon, moves, or items...
                  </p>
                </div>
              )}
            </div>

            {/* Footer hints */}
            {results.length > 0 && (
              <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <ArrowDown className="h-3 w-3" />
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" />
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">esc</kbd>
                  close
                </span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
