import { useMemo, useEffect, useDeferredValue, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Package, Sparkles, ChevronRight } from "lucide-react";
import { useSearchStore } from "@/stores/search-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabStore } from "@/stores/tab-store";
import { useSearchPokemon } from "@/hooks/use-pokemon";
import { useSearchMoves } from "@/hooks/use-moves";
import { useSearchItems } from "@/hooks/use-items";
import { useSearchAbilities } from "@/hooks/use-abilities";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { DamageClassIcon } from "@/components/moves/DamageClassIcon";
import { cn } from "@/lib/utils";
import type { PokemonSummary, MoveSummary, ItemSummary, AbilitySummary } from "@/types";

const MAX_PER_CATEGORY = 10;

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface SearchCrossResultsProps {
  exclude?: "pokemon" | "moves" | "items" | "abilities" | null;
  onNavigate?: () => void;
}

export function SearchCrossResults({ exclude, onNavigate }: SearchCrossResultsProps) {
  const query = useSearchStore((s) => s.query);
  const dismissSearch = useSearchStore((s) => s.dismissSearch);
  const searchNavIndex = useSearchStore((s) => s.searchNavIndex);
  const setSearchNavTotal = useSearchStore((s) => s.setSearchNavTotal);
  const deferredQuery = useDeferredValue(query);
  const [settledQuery, setSettledQuery] = useState(deferredQuery);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSettledQuery(deferredQuery);
    }, 100);

    return () => window.clearTimeout(handle);
  }, [deferredQuery]);

  const normalizedQuery = settledQuery.toLowerCase().trim();
  const canSearch = normalizedQuery.length >= 2;
  const { pokemonName, moveName, itemName, abilityName } = useSettingsStore();
  const { openTab } = useTabStore();
  const navigate = useNavigate();

  const { data: searchedPokemon } = useSearchPokemon(
    normalizedQuery,
    canSearch && exclude !== "pokemon",
  );
  const { data: searchedMoves } = useSearchMoves(
    normalizedQuery,
    canSearch && exclude !== "moves",
  );
  const { data: searchedItems } = useSearchItems(
    normalizedQuery,
    canSearch && exclude !== "items",
  );
  const { data: searchedAbilities } = useSearchAbilities(
    normalizedQuery,
    canSearch && exclude !== "abilities",
  );

  const pokemonResults = useMemo(() => {
    if (exclude === "pokemon") return [];
    return (searchedPokemon ?? []).slice(0, MAX_PER_CATEGORY);
  }, [exclude, searchedPokemon]);

  const moveResults = useMemo(() => {
    if (exclude === "moves") return [];
    return (searchedMoves ?? []).slice(0, MAX_PER_CATEGORY);
  }, [exclude, searchedMoves]);

  const itemResults = useMemo(() => {
    if (exclude === "items") return [];
    return (searchedItems ?? []).slice(0, MAX_PER_CATEGORY);
  }, [exclude, searchedItems]);

  const abilityResults = useMemo(() => {
    if (exclude === "abilities") return [];
    return (searchedAbilities ?? []).slice(0, MAX_PER_CATEGORY);
  }, [exclude, searchedAbilities]);

  const totalResults = pokemonResults.length + moveResults.length + itemResults.length + abilityResults.length;

  // Sync total count to store for keyboard navigation
  useEffect(() => {
    setSearchNavTotal(totalResults);
  }, [totalResults, setSearchNavTotal]);

  // Scroll active item into view
  useEffect(() => {
    if (searchNavIndex >= 0) {
      const el = document.querySelector(`[data-search-idx="${searchNavIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [searchNavIndex]);

  // Compute flat index offsets per category
  const pokemonOffset = 0;
  const moveOffset = pokemonResults.length;
  const itemOffset = moveOffset + moveResults.length;
  const abilityOffset = itemOffset + itemResults.length;

  if (query.length < 2 || normalizedQuery.length < 2) return null;
  if (totalResults === 0) {
    return (
      <div
        className="border-t border-border/30 pt-4 pb-2 text-center"
      >
        <p className="text-sm text-muted-foreground">
          No results for "<span className="text-foreground font-medium">{query}</span>"
        </p>
      </div>
    );
  }

  const handlePokemonClick = (p: PokemonSummary) => {
    openTab({
      kind: "pokemon",
      entityId: p.id,
      nameEn: p.name_en ?? "",
      nameFr: p.name_fr ?? "",
      typeKey: p.type1_key,
      spriteUrl: p.sprite_url,
    });
    dismissSearch();
    navigate(`/pokemon/${p.id}`);
    onNavigate?.();
  };

  const handleMoveClick = (m: MoveSummary) => {
    openTab({
      kind: "move",
      entityId: m.id,
      nameEn: m.name_en ?? "",
      nameFr: m.name_fr ?? "",
      typeKey: m.type_key,
    });
    dismissSearch();
    navigate(`/moves/${m.id}`);
    onNavigate?.();
  };

  const handleItemClick = (i: ItemSummary) => {
    openTab({
      kind: "item",
      entityId: i.id,
      nameEn: i.name_en ?? "",
      nameFr: i.name_fr ?? "",
      typeKey: null,
    });
    dismissSearch();
    navigate(`/items/${i.id}`);
    onNavigate?.();
  };

  const handleAbilityClick = (a: AbilitySummary) => {
    openTab({
      kind: "ability",
      entityId: a.id,
      nameEn: a.name_en ?? "",
      nameFr: a.name_fr ?? "",
      typeKey: null,
    });
    dismissSearch();
    navigate(`/abilities/${a.id}`);
    onNavigate?.();
  };

  const spriteBase =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

  return (
    <div className="border-t border-border/30 pt-1">
      {/* Pokemon section */}
      {pokemonResults.length > 0 && (
        <div className="px-2 py-1.5">
          <button
            onClick={() => navigate("/")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/8 transition-colors group"
          >
            <img
              src={`${spriteBase}/25.png`}
              alt=""
              className="h-4 w-4 object-contain opacity-60"
            />
            <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Pokemon
            </span>
            <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {pokemonResults.length}
            </span>
            <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </button>
          <div className="grid gap-0.5">
            {pokemonResults.map((p, i) => (
              <button
                key={p.id}
                data-search-idx={pokemonOffset + i}
                onClick={() => handlePokemonClick(p)}
                onMouseDown={(e) => {
                  if (e.button !== 1) return;
                  e.preventDefault();
                  openTab({ kind: "pokemon", entityId: p.id, nameEn: p.name_en ?? "", nameFr: p.name_fr ?? "", typeKey: p.type1_key, spriteUrl: p.sprite_url }, true);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/8",
                  searchNavIndex === pokemonOffset + i && "bg-primary/15 ring-1 ring-primary/30"
                )}
              >
                <img
                  src={p.sprite_url ?? `${spriteBase}/${p.id}.png`}
                  alt=""
                  className="h-6 w-6 shrink-0 object-contain"
                  loading="lazy"
                />
                <span className="truncate font-medium text-xs">
                  <HighlightMatch text={pokemonName(p.name_en ?? "", p.name_fr ?? "")} query={query} />
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  #{String(p.id).padStart(3, "0")}
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <TypeBadge type={p.type1_key} size="sm" />
                  {p.type2_key && <TypeBadge type={p.type2_key} size="sm" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Moves section */}
      {moveResults.length > 0 && (
        <div className="px-2 py-1.5">
          <button
            onClick={() => navigate("/moves")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/8 transition-colors group"
          >
            <Swords className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Moves
            </span>
            <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {moveResults.length}
            </span>
            <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </button>
          <div className="grid gap-0.5">
            {moveResults.map((m, i) => (
              <button
                key={m.id}
                data-search-idx={moveOffset + i}
                onClick={() => handleMoveClick(m)}
                onMouseDown={(e) => {
                  if (e.button !== 1) return;
                  e.preventDefault();
                  openTab({ kind: "move", entityId: m.id, nameEn: m.name_en ?? "", nameFr: m.name_fr ?? "", typeKey: m.type_key }, true);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/8",
                  searchNavIndex === moveOffset + i && "bg-primary/15 ring-1 ring-primary/30"
                )}
              >
                <TypeBadge type={m.type_key} size="sm" />
                <span className="truncate font-medium text-xs">
                  <HighlightMatch text={moveName(m.name_en ?? "", m.name_fr ?? "")} query={query} />
                </span>
                <div className="ml-auto shrink-0">
                  <DamageClassIcon damageClass={m.damage_class} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items section */}
      {itemResults.length > 0 && (
        <div className="px-2 py-1.5">
          <button
            onClick={() => navigate("/items")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/8 transition-colors group"
          >
            <Package className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Items
            </span>
            <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {itemResults.length}
            </span>
            <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </button>
          <div className="grid gap-0.5">
            {itemResults.map((item, i) => (
              <button
                key={item.id}
                data-search-idx={itemOffset + i}
                onClick={() => handleItemClick(item)}
                onMouseDown={(e) => {
                  if (e.button !== 1) return;
                  e.preventDefault();
                  openTab({ kind: "item", entityId: item.id, nameEn: item.name_en ?? "", nameFr: item.name_fr ?? "", typeKey: null, spriteUrl: item.sprite_url }, true);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/8",
                  searchNavIndex === itemOffset + i && "bg-primary/15 ring-1 ring-primary/30"
                )}
              >
                {item.sprite_url ? (
                  <img
                    src={item.sprite_url}
                    alt=""
                    className="h-6 w-6 shrink-0 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/8">
                    <Package className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                <span className="truncate font-medium text-xs">
                  <HighlightMatch text={itemName(item.name_en ?? "", item.name_fr ?? "")} query={query} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Abilities section */}
      {abilityResults.length > 0 && (
        <div className="px-2 py-1.5">
          <button
            onClick={() => navigate("/abilities")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/8 transition-colors group"
          >
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Abilities
            </span>
            <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {abilityResults.length}
            </span>
            <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </button>
          <div className="grid gap-0.5">
            {abilityResults.map((a, i) => (
              <button
                key={a.id}
                data-search-idx={abilityOffset + i}
                onClick={() => handleAbilityClick(a)}
                onMouseDown={(e) => {
                  if (e.button !== 1) return;
                  e.preventDefault();
                  openTab({ kind: "ability", entityId: a.id, nameEn: a.name_en ?? "", nameFr: a.name_fr ?? "", typeKey: null }, true);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/8",
                  searchNavIndex === abilityOffset + i && "bg-primary/15 ring-1 ring-primary/30"
                )}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/8">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <span className="truncate font-medium text-xs">
                  <HighlightMatch text={abilityName(a.name_en ?? "", a.name_fr ?? "")} query={query} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
