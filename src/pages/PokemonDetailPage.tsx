import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useAllPokemon,
  usePokemonById,
  usePokemonAbilities,
  usePokemonEvolutionChain,
  usePokemonMovesList,
  useAlternateForms,
} from "@/hooks/use-pokemon";
import { buildNameToIdMap, sortByPokedex, getBaseId, getFormLabel } from "@/lib/pokemon-utils";
import { useSettingsStore } from "@/stores/settings-store";
import { useComparisonStore } from "@/stores/comparison-store";
import { useRecentStore } from "@/stores/recent-store";
import { useIsFavorite, useToggleFavorite } from "@/hooks/use-favorites";
import { usePageTitle } from "@/hooks/use-page-title";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { StatsBar } from "@/components/pokemon/StatsBar";
import { EvolutionChain } from "@/components/pokemon/EvolutionChain";
import { MoveTable } from "@/components/pokemon/MoveTable";
import { PokemonSprite } from "@/components/ui/pokemon-sprite";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Sparkles,
  Heart,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getDefensiveMatchups } from "@/lib/type-chart";
import { cn } from "@/lib/utils";
import type { PokemonTypeName } from "@/lib/constants";

export default function PokemonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pokemonId = id ? parseInt(id, 10) : null;

  // Separate queries as specified
  const { data: pokemon, isLoading: loadingPokemon } =
    usePokemonById(pokemonId);
  const { data: abilities } = usePokemonAbilities(pokemonId);
  const { data: evolutionChain } = usePokemonEvolutionChain(pokemonId);
  const { data: moves } = usePokemonMovesList(pokemonId);
  const { data: alternateForms } = useAlternateForms(pokemon?.evolution_chain_id ?? null);
  const { data: allPokemon } = useAllPokemon();

  const { pokemonName, description } = useSettingsStore();

  // Compute sorted Pokédex order for Prev/Next navigation
  const { prevId, nextId } = useMemo(() => {
    if (!allPokemon || !pokemonId) return { prevId: null, nextId: null };
    const nameToId = buildNameToIdMap(allPokemon);
    const sorted = sortByPokedex(allPokemon, nameToId);
    const idx = sorted.findIndex((p) => p.id === pokemonId);
    return {
      prevId: idx > 0 ? sorted[idx - 1].id : null,
      nextId: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1].id : null,
    };
  }, [allPokemon, pokemonId]);
  const { addPokemon, removePokemon, hasPokemon } = useComparisonStore();
  const { addRecent } = useRecentStore();
  const isFavorite = useIsFavorite(pokemonId ?? 0);
  const { mutate: toggleFav } = useToggleFavorite();
  const [showShiny, setShowShiny] = useState(false);

  const name = pokemon ? pokemonName(pokemon.name_en, pokemon.name_fr) : "";
  // Show base form ID for consistent numbering
  const nameToIdMapDetail = useMemo(
    () => buildNameToIdMap(allPokemon ?? []),
    [allPokemon],
  );
  const baseId = pokemon ? getBaseId(pokemon, nameToIdMapDetail) : null;
  const idStr = baseId !== null ? `#${String(baseId).padStart(3, "0")}` : "";
  const formLabelDetail = pokemon && baseId !== pokemon.id ? getFormLabel(pokemon.name_key) : null;

  // Dynamic window title
  usePageTitle(pokemon ? `${name} ${idStr}` : "Loading...");

  // Track recently visited
  useEffect(() => {
    if (pokemonId) addRecent(pokemonId);
  }, [pokemonId, addRecent]);

  // Keyboard navigation: Left/Right arrows for prev/next Pokemon (follows Pokédex sort)
  const handleKeyNav = useCallback(
    (e: KeyboardEvent) => {
      if (!pokemon) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" && prevId !== null) {
        navigate(`/pokemon/${prevId}`);
      } else if (e.key === "ArrowRight" && nextId !== null) {
        navigate(`/pokemon/${nextId}`);
      }
    },
    [pokemon, navigate, prevId, nextId],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyNav);
    return () => window.removeEventListener("keydown", handleKeyNav);
  }, [handleKeyNav]);

  // Loading state
  if (loadingPokemon || !pokemon) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const desc = description(pokemon.description_en, pokemon.description_fr);
  const isCompared = hasPokemon(pokemon.id);

  const stats: Record<string, number | null> = {
    hp: pokemon.hp,
    atk: pokemon.atk,
    def: pokemon.def,
    spa: pokemon.spa,
    spd: pokemon.spd,
    spe: pokemon.spe,
  };

  // Type matchups (only compute when type1 is available)
  const matchups = pokemon.type1_key
    ? getDefensiveMatchups(
        pokemon.type1_key as PokemonTypeName,
        (pokemon.type2_key as PokemonTypeName | null) ?? undefined,
      )
    : null;

  // Sprite: prefer sprite_url from DB, fallback to GitHub
  const spriteBase =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const defaultSprite = pokemon.sprite_url ?? `${spriteBase}/${pokemon.id}.png`;
  const spriteUrl = showShiny
    ? `${spriteBase}/shiny/${pokemon.id}.png`
    : defaultSprite;

  // Height / Weight (stored in decimetres / hectograms)
  const heightStr =
    pokemon.height !== null ? `${(pokemon.height / 10).toFixed(1)} m` : "\u2014";
  const weightStr =
    pokemon.weight !== null ? `${(pokemon.weight / 10).toFixed(1)} kg` : "\u2014";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {/* Back to Pokédex */}
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-xs hover:bg-accent"
            aria-label="Go back"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          {/* Prev / Next in Pokédex (follows sorted order) */}
          <div className="flex items-center rounded-md border border-input">
            {prevId !== null ? (
              <Link
                to={`/pokemon/${prevId}`}
                className="flex h-8 items-center px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Previous Pokemon"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="flex h-8 items-center px-2 text-xs text-muted-foreground/30">
                <ChevronLeft className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="border-x border-input px-2 text-xs text-muted-foreground">{idStr}</span>
            {nextId !== null ? (
              <Link
                to={`/pokemon/${nextId}`}
                className="flex h-8 items-center px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Next Pokemon"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="flex h-8 items-center px-2 text-xs text-muted-foreground/30">
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Favorite button */}
          <button
            onClick={() => toggleFav(pokemon.id)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md border border-input px-3 text-xs hover:bg-accent",
              isFavorite && "text-red-500",
            )}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={cn("h-3 w-3", isFavorite && "fill-current")} />
            {isFavorite ? "Favorited" : "Favorite"}
          </button>

          {/* Compare button */}
          <button
            onClick={() =>
              isCompared
                ? removePokemon(pokemon.id)
                : addPokemon(pokemon.id)
            }
            className="flex h-8 items-center gap-1.5 rounded-md border border-input px-3 text-xs hover:bg-accent"
            aria-label={isCompared ? "Remove from comparison" : "Add to comparison"}
          >
            {isCompared ? (
              <>
                <Check className="h-3 w-3" /> In Comparison
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" /> Compare
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* Sprite + shiny toggle */}
        <div className="relative">
          <PokemonSprite
            src={spriteUrl}
            pokemonId={pokemon.id}
            alt={name}
            className="h-32 w-32"
          />
          <button
            onClick={() => setShowShiny((s) => !s)}
            className={cn(
              "absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
              showShiny
                ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
                : "border-border bg-background text-muted-foreground hover:bg-accent",
            )}
            aria-label="Toggle shiny sprite"
          >
            <Sparkles className="h-3 w-3" />
            {showShiny ? "Shiny" : "Normal"}
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="text-xs text-muted-foreground">
            {idStr}
          </div>
          <h1 className="text-2xl font-bold">
            {name}
            {formLabelDetail && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                · {formLabelDetail}
              </span>
            )}
          </h1>

          <div className="mt-1 flex gap-1.5 justify-center sm:justify-start">
            <TypeBadge type={pokemon.type1_key} size="md" />
            {pokemon.type2_key && (
              <TypeBadge type={pokemon.type2_key} size="md" />
            )}
          </div>

          {desc && (
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          )}

          <div className="mt-2 flex gap-4 text-xs text-muted-foreground justify-center sm:justify-start">
            <span>Height: {heightStr}</span>
            <span>Weight: {weightStr}</span>
          </div>
        </div>
      </div>

      {/* ── Abilities ── */}
      {abilities && abilities.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Abilities</h2>
          <div className="flex flex-wrap gap-2">
            {abilities.map((a) => (
              <span
                key={a.slot}
                className={`rounded-md border px-2 py-1 text-xs ${
                  a.is_hidden === 1
                    ? "border-dashed border-muted-foreground/50 text-muted-foreground"
                    : "border-border"
                }`}
              >
                {pokemonName(a.ability_en, a.ability_fr)}
                {a.is_hidden === 1 && " (Hidden)"}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Base Stats ── */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Base Stats</h2>
        <StatsBar stats={stats} />
      </section>

      {/* ── Type Matchups ── */}
      {matchups && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Type Matchups</h2>
          <div className="space-y-1.5 text-xs">
            <MatchupRow label="4x" types={matchups[4]} className="text-red-400" />
            <MatchupRow label="2x" types={matchups[2]} className="text-orange-400" />
            <MatchupRow label="0.5x" types={matchups[0.5]} className="text-green-400" />
            <MatchupRow label="0.25x" types={matchups[0.25]} className="text-green-600" />
            <MatchupRow label="0x" types={matchups[0]} className="text-gray-500" />
          </div>
        </section>
      )}

      {/* ── Evolution Chain ── */}
      {evolutionChain && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Evolution</h2>
          <EvolutionChain chain={evolutionChain} currentId={pokemon.id} alternateForms={alternateForms} />
        </section>
      )}

      {/* ── Moves ── */}
      {moves && moves.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Moves</h2>
          <MoveTable moves={moves} />
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helper for type matchup rows
// ---------------------------------------------------------------------------

function MatchupRow({
  label,
  types,
  className,
}: {
  label: string;
  types: string[] | undefined;
  className?: string;
}) {
  if (!types || types.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className={`w-12 text-right font-medium ${className ?? ""}`}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
    </div>
  );
}
