import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Package, Sparkles, ChevronRight } from "lucide-react";
import { useSearchStore } from "@/stores/search-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabStore } from "@/stores/tab-store";
import { useAllPokemon } from "@/hooks/use-pokemon";
import { useAllMoves } from "@/hooks/use-moves";
import { useAllItems } from "@/hooks/use-items";
import { useAllAbilities } from "@/hooks/use-abilities";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { DamageClassIcon } from "@/components/moves/DamageClassIcon";
import type { PokemonSummary, MoveSummary, ItemSummary, AbilitySummary } from "@/types";

const MAX_PER_CATEGORY = 10;

interface SearchCrossResultsProps {
  exclude?: "pokemon" | "moves" | "items" | "abilities" | null;
  onNavigate?: () => void;
}

export function SearchCrossResults({ exclude, onNavigate }: SearchCrossResultsProps) {
  const { query, dismissSearch } = useSearchStore();
  const { pokemonName, moveName, itemName, abilityName } = useSettingsStore();
  const { openTab } = useTabStore();
  const navigate = useNavigate();

  const { data: allPokemon } = useAllPokemon();
  const { data: allMoves } = useAllMoves();
  const { data: allItems } = useAllItems();
  const { data: allAbilities } = useAllAbilities();

  const pokemonResults = useMemo(() => {
    if (exclude === "pokemon" || query.length < 2) return [];
    const q = query.toLowerCase();
    return (allPokemon ?? [])
      .filter((p: PokemonSummary) => {
        const en = (p.name_en ?? "").toLowerCase();
        const fr = (p.name_fr ?? "").toLowerCase();
        return en.includes(q) || fr.includes(q) || p.id.toString() === q;
      })
      .slice(0, MAX_PER_CATEGORY);
  }, [exclude, query, allPokemon]);

  const moveResults = useMemo(() => {
    if (exclude === "moves" || query.length < 2) return [];
    const q = query.toLowerCase();
    return (allMoves ?? [])
      .filter((m: MoveSummary) => {
        const en = (m.name_en ?? "").toLowerCase();
        const fr = (m.name_fr ?? "").toLowerCase();
        return en.includes(q) || fr.includes(q) || m.id.toString() === q;
      })
      .slice(0, MAX_PER_CATEGORY);
  }, [exclude, query, allMoves]);

  const itemResults = useMemo(() => {
    if (exclude === "items" || query.length < 2) return [];
    const q = query.toLowerCase();
    return (allItems ?? [])
      .filter((i: ItemSummary) => {
        const en = (i.name_en ?? "").toLowerCase();
        const fr = (i.name_fr ?? "").toLowerCase();
        return en.includes(q) || fr.includes(q) || i.id.toString() === q;
      })
      .slice(0, MAX_PER_CATEGORY);
  }, [exclude, query, allItems]);

  const abilityResults = useMemo(() => {
    if (exclude === "abilities" || query.length < 2) return [];
    const q = query.toLowerCase();
    return (allAbilities ?? [])
      .filter((a: AbilitySummary) => {
        const en = (a.name_en ?? "").toLowerCase();
        const fr = (a.name_fr ?? "").toLowerCase();
        return en.includes(q) || fr.includes(q) || a.id.toString() === q;
      })
      .slice(0, MAX_PER_CATEGORY);
  }, [exclude, query, allAbilities]);

  if (query.length < 2) return null;
  if (pokemonResults.length === 0 && moveResults.length === 0 && itemResults.length === 0 && abilityResults.length === 0) return null;

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
            {pokemonResults.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePokemonClick(p)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/8"
              >
                <img
                  src={p.sprite_url ?? `${spriteBase}/${p.id}.png`}
                  alt=""
                  className="h-6 w-6 shrink-0 object-contain"
                  loading="lazy"
                />
                <span className="truncate font-medium text-xs">
                  {pokemonName(p.name_en ?? "", p.name_fr ?? "")}
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
            {moveResults.map((m) => (
              <button
                key={m.id}
                onClick={() => handleMoveClick(m)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/8"
              >
                <TypeBadge type={m.type_key} size="sm" />
                <span className="truncate font-medium text-xs">
                  {moveName(m.name_en ?? "", m.name_fr ?? "")}
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
            {itemResults.map((i) => (
              <button
                key={i.id}
                onClick={() => handleItemClick(i)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/8"
              >
                {i.sprite_url ? (
                  <img
                    src={i.sprite_url}
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
                  {itemName(i.name_en ?? "", i.name_fr ?? "")}
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
            {abilityResults.map((a) => (
              <button
                key={a.id}
                onClick={() => handleAbilityClick(a)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/8"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/8">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <span className="truncate font-medium text-xs">
                  {abilityName(a.name_en ?? "", a.name_fr ?? "")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
