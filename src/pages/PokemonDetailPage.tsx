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
import { useTabStore } from "@/stores/tab-store";
import { useIsFavorite, useToggleFavorite } from "@/hooks/use-favorites";
import { usePageTitle } from "@/hooks/use-page-title";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { StatsBar } from "@/components/pokemon/StatsBar";
import { EvolutionChain } from "@/components/pokemon/EvolutionChain";
import { MoveTable } from "@/components/pokemon/MoveTable";
import { PokemonSprite } from "@/components/ui/pokemon-sprite";
import { TYPE_COLORS_HEX } from "@/lib/constants";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Sparkles,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getDefensiveMatchups } from "@/lib/type-chart";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem, spriteFloat, sectionReveal } from "@/lib/motion";

import { GlassCard, GlassPill } from "@/components/ui/liquid-glass";
import type { PokemonTypeName } from "@/lib/constants";

export default function PokemonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pokemonId = id ? parseInt(id, 10) : null;

  const { data: pokemon, isLoading: loadingPokemon } =
    usePokemonById(pokemonId);
  const { data: abilities } = usePokemonAbilities(pokemonId);
  const { data: evolutionChain } = usePokemonEvolutionChain(pokemonId);
  const { data: moves } = usePokemonMovesList(pokemonId);
  const { data: alternateForms } = useAlternateForms(pokemon?.evolution_chain_id ?? null);
  const { data: allPokemon } = useAllPokemon();

  const { pokemonName, description } = useSettingsStore();

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
  const { openTab } = useTabStore();
  const isFavorite = useIsFavorite(pokemonId ?? 0);
  const { mutate: toggleFav } = useToggleFavorite();
  const [showShiny, setShowShiny] = useState(false);

  const name = pokemon ? pokemonName(pokemon.name_en, pokemon.name_fr) : "";
  const nameToIdMapDetail = useMemo(
    () => buildNameToIdMap(allPokemon ?? []),
    [allPokemon],
  );
  const baseId = pokemon ? getBaseId(pokemon, nameToIdMapDetail) : null;
  const idStr = baseId !== null ? `#${String(baseId).padStart(3, "0")}` : "";
  const formLabelDetail = pokemon && baseId !== pokemon.id ? getFormLabel(pokemon.name_key) : null;

  usePageTitle(pokemon ? `${name} ${idStr}` : "Loading...");

  useEffect(() => {
    if (pokemonId && pokemon) {
      addRecent(pokemonId);
      openTab({
        kind: "pokemon",
        entityId: pokemonId,
        nameEn: pokemon.name_en ?? "",
        nameFr: pokemon.name_fr ?? "",
        typeKey: pokemon.type1_key,
        spriteUrl: pokemon.sprite_url,
      });
    }
  }, [pokemonId, pokemon, addRecent, openTab]);

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

  if (loadingPokemon || !pokemon) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-40 w-40 skeleton-shimmer rounded-full" />
            <div className="h-6 w-48 skeleton-shimmer rounded-xl" />
            <div className="flex gap-2">
              <div className="h-5 w-16 skeleton-shimmer rounded-full" />
              <div className="h-5 w-16 skeleton-shimmer rounded-full" />
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 skeleton-shimmer rounded-xl" style={{ animationDelay: `${i * 0.06}s`, width: `${70 + Math.random() * 30}%` }} />
            ))}
          </div>
        </div>
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

  const matchups = pokemon.type1_key
    ? getDefensiveMatchups(
        pokemon.type1_key as PokemonTypeName,
        (pokemon.type2_key as PokemonTypeName | null) ?? undefined,
      )
    : null;

  const spriteBase =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const defaultSprite = pokemon.sprite_url ?? `${spriteBase}/${pokemon.id}.png`;
  const spriteUrl = showShiny
    ? `${spriteBase}/shiny/${pokemon.id}.png`
    : defaultSprite;

  const heightStr =
    pokemon.height !== null ? `${(pokemon.height / 10).toFixed(1)} m` : "\u2014";
  const weightStr =
    pokemon.weight !== null ? `${(pokemon.weight / 10).toFixed(1)} kg` : "\u2014";

  const typeHex = TYPE_COLORS_HEX[pokemon.type1_key ?? ""] ?? "#888";

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 relative overflow-hidden">
      {/* ── Navigation ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <GlassPill>
            <button
              onClick={() => navigate("/")}
              className="flex h-8 items-center gap-1.5 px-3 text-xs hover:text-foreground transition-all"
              aria-label="Back to Pokédex"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Pokédex
            </button>
          </GlassPill>

          <GlassPill>
            <div className="flex items-center">
              {prevId !== null ? (
                <Link
                  to={`/pokemon/${prevId}`}
                  className="flex h-8 items-center px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Previous Pokemon"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="flex h-8 items-center px-2.5 text-xs text-muted-foreground/30">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="border-x border-white/10 px-2.5 font-mono text-xs text-muted-foreground">{idStr}</span>
              {nextId !== null ? (
                <Link
                  to={`/pokemon/${nextId}`}
                  className="flex h-8 items-center px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Next Pokemon"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="flex h-8 items-center px-2.5 text-xs text-muted-foreground/30">
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </GlassPill>
        </div>
        <div className="flex gap-2">
          <GlassPill>
            <button
              onClick={() => toggleFav(pokemon.id)}
              className={cn(
                "flex h-8 items-center gap-1.5 px-3 text-xs transition-all",
                isFavorite ? "text-red-500" : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={cn("h-3 w-3", isFavorite && "fill-current")} />
              {isFavorite ? "Favorited" : "Favorite"}
            </button>
          </GlassPill>

          <GlassPill>
            <button
              onClick={() =>
                isCompared
                  ? removePokemon(pokemon.id)
                  : addPokemon(pokemon.id)
              }
              className="flex h-8 items-center gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground transition-all"
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
          </GlassPill>
        </div>
      </div>

      {/* ── Hero Section ── */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Sprite + decorative circle */}
        <div className="relative flex items-center justify-center">
          {/* Type-colored radial gradient circle */}
          <div
            className="absolute h-40 w-40 rounded-full"
            style={{
              background: `radial-gradient(circle, ${typeHex}20 0%, transparent 70%)`,
            }}
          />
          {/* Decorative rotating dashed circle */}
          <div
            className="absolute h-44 w-44 rounded-full border-2 border-dashed"
            style={{
              borderColor: `${typeHex}25`,
              animation: "spin 20s linear infinite",
            }}
          />
          {/* Counter-rotating second circle */}
          <div
            className="absolute h-48 w-48 rounded-full border border-dashed"
            style={{
              borderColor: `${typeHex}15`,
              animation: "spin 20s linear infinite reverse",
            }}
          />
          {/* ID watermark */}
          <span className="absolute font-heading text-6xl font-bold text-muted/20 select-none">
            {baseId !== null ? String(baseId).padStart(3, "0") : ""}
          </span>

          <div className="relative">
            <motion.div
              variants={spriteFloat}
              animate="animate"
            >
              <PokemonSprite
                src={spriteUrl}
                pokemonId={pokemon.id}
                alt={name}
                className="h-40 w-40"
              />
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowShiny((s) => !s)}
              className={cn(
                "absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-white/8 border px-2.5 py-0.5 text-[10px] font-medium transition-all",
                showShiny
                  ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
                  : "border-white/10 text-muted-foreground hover:bg-white/12",
              )}
              aria-label="Toggle shiny sprite"
            >
              <motion.div
                animate={{ rotate: showShiny ? 360 : 0 }}
                transition={{ duration: 0.5 }}
              >
                <Sparkles className="h-3 w-3" />
              </motion.div>
              {showShiny ? "Shiny" : "Normal"}
            </motion.button>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="font-mono text-xs text-muted-foreground">
            {idStr}
          </div>
          <h1 className="font-heading text-3xl font-bold">
            {name}
            {formLabelDetail && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                · {formLabelDetail}
              </span>
            )}
          </h1>

          <div className="mt-1.5 flex gap-1.5 justify-center sm:justify-start">
            <TypeBadge type={pokemon.type1_key} size="md" />
            {pokemon.type2_key && (
              <TypeBadge type={pokemon.type2_key} size="md" />
            )}
          </div>

          {desc && (
            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
          )}

          <div className="mt-2.5 flex gap-3 justify-center sm:justify-start">
            <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-muted-foreground">
              Height: {heightStr}
            </span>
            <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-muted-foreground">
              Weight: {weightStr}
            </span>
          </div>
        </div>
      </div>

      {/* ── Abilities ── */}
      {abilities && abilities.length > 0 && (
        <motion.section
          variants={sectionReveal}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h2 className="mb-3 font-heading text-sm font-bold">
            <span className="border-b-2 border-primary pb-0.5">Abilities</span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            <div className="flex flex-wrap gap-2 p-4">
              {abilities.map((a) => (
                <span
                  key={a.slot}
                  className={cn(
                    "rounded-xl bg-white/5 border px-3 py-1.5 text-xs",
                    a.is_hidden === 1
                      ? "border-dashed border-purple-400/40 text-purple-300"
                      : "border-white/10",
                  )}
                >
                  {pokemonName(a.ability_en, a.ability_fr)}
                  {a.is_hidden === 1 && " (Hidden)"}
                </span>
              ))}
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* ── Base Stats ── */}
      <motion.section
        variants={sectionReveal}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
      >
        <h2 className="mb-3 font-heading text-sm font-bold">
          <span className="border-b-2 border-primary pb-0.5">Base Stats</span>
        </h2>
        <GlassCard className="rounded-2xl border border-border/30">
          <div className="p-4">
            <StatsBar stats={stats} />
          </div>
        </GlassCard>
      </motion.section>

      {/* ── Type Matchups ── */}
      {matchups && (
        <motion.section
          variants={sectionReveal}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h2 className="mb-3 font-heading text-sm font-bold">
            <span className="border-b-2 border-primary pb-0.5">Type Matchups</span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            <motion.div
              className="space-y-1.5 text-xs p-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <MatchupRow label="4x" types={matchups[4]} className="text-red-400" glowColor="rgba(239,68,68,0.15)" />
              <MatchupRow label="2x" types={matchups[2]} className="text-orange-400" />
              <MatchupRow label="0.5x" types={matchups[0.5]} className="text-green-400" />
              <MatchupRow label="0.25x" types={matchups[0.25]} className="text-green-600" />
              <MatchupRow label="0x" types={matchups[0]} className="text-gray-500" glowColor="rgba(156,163,175,0.1)" />
            </motion.div>
          </GlassCard>
        </motion.section>
      )}

      {/* ── Evolution Chain ── */}
      {evolutionChain && (
        <motion.section
          variants={sectionReveal}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h2 className="mb-3 font-heading text-sm font-bold">
            <span className="border-b-2 border-primary pb-0.5">Evolution</span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            <div className="p-4">
              <EvolutionChain chain={evolutionChain} currentId={pokemon.id} alternateForms={alternateForms} />
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* ── Moves ── */}
      {moves && moves.length > 0 && (
        <motion.section
          variants={sectionReveal}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h2 className="mb-3 font-heading text-sm font-bold">
            <span className="border-b-2 border-primary pb-0.5">Moves</span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            <div className="p-4">
              <MoveTable moves={moves} />
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* Spin animation for decorative circle */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MatchupRow({
  label,
  types,
  className,
  glowColor,
}: {
  label: string;
  types: string[] | undefined;
  className?: string;
  glowColor?: string;
}) {
  if (!types || types.length === 0) return null;

  return (
    <motion.div
      className="flex items-center gap-2"
      variants={staggerItem}
      style={glowColor ? { textShadow: `0 0 8px ${glowColor}` } : undefined}
    >
      <span className={`w-12 text-right font-heading font-semibold ${className ?? ""}`}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
    </motion.div>
  );
}
