import { useParams, Link, useNavigate } from "react-router-dom";
import {
  usePokemonById,
  usePokemonAbilities,
  usePokemonEvolutionChain,
  usePokemonMovesList,
} from "@/hooks/use-pokemon";
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Sparkles,
  Heart,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
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

  const { pokemonName, description } = useSettingsStore();
  const { addPokemon, removePokemon, hasPokemon } = useComparisonStore();
  const { addRecent } = useRecentStore();
  const isFavorite = useIsFavorite(pokemonId ?? 0);
  const { mutate: toggleFav } = useToggleFavorite();
  const [showShiny, setShowShiny] = useState(false);

  const name = pokemon ? pokemonName(pokemon.name_en, pokemon.name_fr) : "";
  const idStr = pokemon ? `#${String(pokemon.id).padStart(3, "0")}` : "";

  // Dynamic window title
  usePageTitle(pokemon ? `${name} ${idStr}` : "Loading...");

  // Track recently visited
  useEffect(() => {
    if (pokemonId) addRecent(pokemonId);
  }, [pokemonId, addRecent]);

  // Keyboard navigation: Left/Right arrows for prev/next Pokemon
  const handleKeyNav = useCallback(
    (e: KeyboardEvent) => {
      if (!pokemon) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" && pokemon.id > 1) {
        navigate(`/pokemon/${pokemon.id - 1}`);
      } else if (e.key === "ArrowRight") {
        navigate(`/pokemon/${pokemon.id + 1}`);
      }
    },
    [pokemon, navigate],
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

  // Abilities helper for name display
  const { pokemonName: abilityName } = useSettingsStore();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {pokemon.id > 1 && (
            <Link
              to={`/pokemon/${pokemon.id - 1}`}
              className="flex h-8 items-center gap-1 rounded-md border border-input px-2 text-xs hover:bg-accent"
              aria-label="Previous Pokemon"
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </Link>
          )}
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
          <Link
            to={`/pokemon/${pokemon.id + 1}`}
            className="flex h-8 items-center gap-1 rounded-md border border-input px-2 text-xs hover:bg-accent"
            aria-label="Next Pokemon"
          >
            Next <ChevronRight className="h-3 w-3" />
          </Link>
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
              "absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background hover:bg-accent",
              showShiny && "text-yellow-500",
            )}
            aria-label="Toggle shiny sprite"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="text-xs text-muted-foreground">
            {idStr}
          </div>
          <h1 className="text-2xl font-bold">{name}</h1>

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
                {abilityName(a.ability_en, a.ability_fr)}
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
          <EvolutionChain chain={evolutionChain} currentId={pokemon.id} />
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
