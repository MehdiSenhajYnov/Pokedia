import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useAllPokemon,
  usePokemonById,
  usePokemonAbilities,
  usePokemonEvolutionChain,
  usePokemonMovesList,
  useAlternateForms,
} from "@/hooks/use-pokemon";
import {
  useSelectedGame,
  useGameCoverage,
  useGamePokemonMoves,
  useGamePokemonAbilities,
  useGamePokemonLocations,
} from "@/hooks/use-games";
import { buildNameToIdMap, sortByPokedex, getBaseId, getFormLabel, getRegionalSuffix, buildRegionalChain } from "@/lib/pokemon-utils";
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
  Shield,
  Gamepad2,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getDefensiveMatchups } from "@/lib/type-chart";
import {
  ABILITY_MATCHUP_EFFECTS,
  getAbilityAdjustedMatchups,
  type ModifiedTypeInfo,
} from "@/lib/ability-matchups";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem, spriteFloat, detailStagger, detailSection } from "@/lib/motion";

import { GlassCard, GlassPill } from "@/components/ui/liquid-glass";
import type { PokemonTypeName } from "@/lib/constants";

export default function PokemonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pokemonId = id ? parseInt(id, 10) : null;

  const { data: pokemon, isLoading: loadingPokemon } =
    usePokemonById(pokemonId);
  const { data: baseAbilities } = usePokemonAbilities(pokemonId);
  const { data: evolutionChain } = usePokemonEvolutionChain(pokemonId);
  const { data: baseMoves } = usePokemonMovesList(pokemonId);
  const { data: alternateForms } = useAlternateForms(pokemon?.evolution_chain_id ?? null);
  const { data: allPokemon } = useAllPokemon();

  const { pokemonName, abilityName, description } = useSettingsStore();
  const selectedGameId = useSettingsStore((s) => s.selectedGameId);
  const selectedGame = useSelectedGame();
  const { data: gameCoverage } = useGameCoverage();

  // Game-specific data (only fetched when a game is selected)
  const { data: gameMoves } = useGamePokemonMoves(pokemon?.name_key);
  const { data: gameAbilities } = useGamePokemonAbilities(pokemon?.name_key);
  const { data: gameLocations } = useGamePokemonLocations(pokemon?.name_key);

  // Resolve: game data > base data
  const moves = (selectedGameId && gameMoves && gameMoves.length > 0) ? gameMoves : baseMoves;
  const abilities = (selectedGameId && gameAbilities && gameAbilities.length > 0) ? gameAbilities : baseAbilities;

  // Check if pokemon is unavailable in selected game (full coverage + no game data)
  const isUnavailableInGame = selectedGameId
    && gameCoverage != null && gameCoverage === "full"
    && (!gameMoves || gameMoves.length === 0)
    && (!gameAbilities || gameAbilities.length === 0)
    && (!gameLocations || gameLocations.length === 0);

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

  // First non-hidden ability that modifies type matchups (if any)
  const matchupAbility = useMemo(() => {
    if (!abilities) return null;
    const regular = abilities.find((a) => a.is_hidden !== 1 && ABILITY_MATCHUP_EFFECTS[a.ability_key]);
    return regular ?? abilities.find((a) => ABILITY_MATCHUP_EFFECTS[a.ability_key]) ?? null;
  }, [abilities]);

  // Build display chain & forms: regional variants get their own chain
  const { displayChain, displayForms } = useMemo(() => {
    if (!pokemon || !evolutionChain) return { displayChain: evolutionChain ?? null, displayForms: alternateForms };
    const suffix = getRegionalSuffix(pokemon.name_key);
    if (suffix && alternateForms) {
      // Current pokemon is a regional variant — build a regional chain
      const regionalChain = buildRegionalChain(evolutionChain, suffix, alternateForms);
      // Keep only non-regional forms (mega, gmax, etc.)
      const cosmetic = alternateForms.filter((f) => !getRegionalSuffix(f.name_key));
      return { displayChain: regionalChain ?? evolutionChain, displayForms: cosmetic.length > 0 ? cosmetic : undefined };
    }
    // Current pokemon is a base form — filter out regional variants from alternate forms
    const nonRegional = alternateForms?.filter((f) => !getRegionalSuffix(f.name_key));
    return { displayChain: evolutionChain, displayForms: nonRegional && nonRegional.length > 0 ? nonRegional : undefined };
  }, [pokemon, evolutionChain, alternateForms]);

  // Compute matchups (ability-adjusted if applicable, otherwise base)
  const { matchups, modifiedTypes } = useMemo(() => {
    if (!pokemon?.type1_key) return { matchups: null, modifiedTypes: new Map() as Map<PokemonTypeName, ModifiedTypeInfo> };
    const t1 = pokemon.type1_key as PokemonTypeName;
    const t2 = (pokemon.type2_key as PokemonTypeName | null) ?? undefined;
    if (!matchupAbility) {
      return {
        matchups: getDefensiveMatchups(t1, t2),
        modifiedTypes: new Map() as Map<PokemonTypeName, ModifiedTypeInfo>,
      };
    }
    return getAbilityAdjustedMatchups(t1, t2, matchupAbility.ability_key);
  }, [pokemon?.type1_key, pokemon?.type2_key, matchupAbility]);

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
    <motion.div
      className="mx-auto max-w-4xl space-y-10 p-6 relative"
      variants={detailStagger}
      initial="initial"
      animate="animate"
    >
      {/* ── Navigation ── */}
      <motion.div variants={detailSection} className="flex items-center justify-between gap-2">
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
                  onMouseDown={(e) => {
                    if (e.button !== 1 || !allPokemon) return;
                    e.preventDefault();
                    const prev = allPokemon.find((p) => p.id === prevId);
                    if (prev) openTab({ kind: "pokemon", entityId: prev.id, nameEn: prev.name_en ?? "", nameFr: prev.name_fr ?? "", typeKey: prev.type1_key, spriteUrl: prev.sprite_url }, true);
                  }}
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
                  onMouseDown={(e) => {
                    if (e.button !== 1 || !allPokemon) return;
                    e.preventDefault();
                    const next = allPokemon.find((p) => p.id === nextId);
                    if (next) openTab({ kind: "pokemon", entityId: next.id, nameEn: next.name_en ?? "", nameFr: next.name_fr ?? "", typeKey: next.type1_key, spriteUrl: next.sprite_url }, true);
                  }}
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
      </motion.div>

      {/* ── Hero Section ── */}
      <motion.div variants={detailSection} className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Sprite + decorative circle */}
        <div className="relative flex items-center justify-center">
          {/* Type-colored radial gradient circle */}
          <div
            className="absolute h-40 w-40 rounded-full"
            style={{
              background: `radial-gradient(circle, ${typeHex}20 0%, transparent 70%)`,
            }}
          />
          {/* Decorative breathing circles */}
          <motion.div
            className="absolute h-44 w-44 rounded-full border-2 border-dashed"
            style={{ borderColor: `${typeHex}25` }}
            animate={{
              scale: [1, 1.03, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute h-48 w-48 rounded-full border border-dashed"
            style={{ borderColor: `${typeHex}15` }}
            animate={{
              scale: [1.03, 1, 1.03],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
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
                crossFade
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
      </motion.div>

      {/* ── Game indicator ── */}
      {selectedGame && (
        <motion.div variants={detailSection}>
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
            <Gamepad2 className="h-3.5 w-3.5 text-primary" />
            <span>
              Data for <strong className="text-foreground">{selectedGame.name_en}</strong>
              {selectedGame.version && <span className="text-muted-foreground"> v{selectedGame.version}</span>}
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Locations (game-specific) ── */}
      {selectedGameId && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="mb-4 font-heading text-base font-bold">
            <span className="border-b-2 border-primary pb-0.5">Locations</span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            {gameLocations && gameLocations.length > 0 ? (
              <div className="space-y-1.5 p-5">
                {gameLocations.map((loc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0 text-primary" />
                    <span>{loc}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>Not catchable — obtainable via evolution or trade</span>
              </div>
            )}
          </GlassCard>
        </motion.section>
      )}

      {/* ── Abilities ── */}
      {abilities && abilities.length > 0 && (
        <motion.section variants={detailSection}>
          <h2 className="mb-4 font-heading text-base font-bold">
            <span className="border-b-2 border-primary pb-0.5">Abilities</span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            <div className="space-y-2.5 p-5">
              {abilities.map((a) => {
                const displayName = abilityName(a.ability_en, a.ability_fr) || a.ability_key;
                const effectText = description(a.short_effect_en, a.short_effect_fr);
                return (
                  <div key={a.slot} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {a.ability_id ? (
                        <Link
                          to={`/abilities/${a.ability_id}`}
                          onMouseDown={(e) => {
                            if (e.button !== 1 || !a.ability_id) return;
                            e.preventDefault();
                            openTab({ kind: "ability", entityId: a.ability_id, nameEn: a.ability_en ?? "", nameFr: a.ability_fr ?? "", typeKey: null }, true);
                          }}
                          className={cn(
                            "rounded-xl bg-white/5 border px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10",
                            a.is_hidden === 1
                              ? "border-dashed border-purple-400/40 text-purple-300"
                              : "border-white/10",
                          )}
                        >
                          {displayName}
                          {a.is_hidden === 1 && " (Hidden)"}
                        </Link>
                      ) : (
                        <span
                          className={cn(
                            "rounded-xl bg-white/5 border px-4 py-2 text-sm",
                            a.is_hidden === 1
                              ? "border-dashed border-purple-400/40 text-purple-300"
                              : "border-white/10",
                          )}
                        >
                          {displayName}
                          {a.is_hidden === 1 && " (Hidden)"}
                        </span>
                      )}
                    </div>
                    {effectText && (
                      <p className="pl-4 text-xs text-muted-foreground leading-relaxed">{effectText}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* ── Base Stats ── */}
      <motion.section variants={detailSection}>
        <h2 className="mb-4 font-heading text-base font-bold">
          <span className="border-b-2 border-primary pb-0.5">Base Stats</span>
        </h2>
        <GlassCard className="rounded-2xl border border-border/30">
          <div className="p-5">
            <StatsBar stats={stats} />
          </div>
        </GlassCard>
      </motion.section>

      {/* ── Type Matchups ── */}
      {matchups && (
        <motion.section variants={detailSection}>
          <h2 className="mb-4 font-heading text-base font-bold">
            <span className="border-b-2 border-primary pb-0.5">Type Matchups</span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            <motion.div
              key={matchupAbility?.ability_key ?? "base"}
              className="space-y-3 text-sm p-5"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {Object.keys(matchups)
                .map(Number)
                .filter((f) => matchups[f] && matchups[f].length > 0 && f !== 1)
                .sort((a, b) => b - a)
                .map((factor) => (
                  <MatchupRow
                    key={factor}
                    label={factor === 0 ? "0x" : `${factor}x`}
                    types={matchups[factor]}
                    modifiedTypes={modifiedTypes}
                    className={
                      factor >= 4
                        ? "text-red-400"
                        : factor > 1
                          ? "text-orange-400"
                          : factor === 0
                            ? "text-gray-500"
                            : factor <= 0.25
                              ? "text-green-600"
                              : "text-green-400"
                    }
                    glowColor={
                      factor >= 4
                        ? "rgba(239,68,68,0.15)"
                        : factor === 0
                          ? "rgba(156,163,175,0.1)"
                          : undefined
                    }
                  />
                ))}
              {matchupAbility && modifiedTypes.size > 0 && (() => {
                const displayName = abilityName(matchupAbility.ability_en, matchupAbility.ability_fr) || matchupAbility.ability_key;
                const entries = [...modifiedTypes.entries()];
                const byNewFactor = new Map<number, { types: PokemonTypeName[]; oldFactors: Set<number> }>();
                for (const [t, info] of entries) {
                  const existing = byNewFactor.get(info.newFactor);
                  if (existing) { existing.types.push(t); existing.oldFactors.add(info.oldFactor); }
                  else { byNewFactor.set(info.newFactor, { types: [t], oldFactors: new Set([info.oldFactor]) }); }
                }
                return [...byNewFactor.entries()].map(([newFactor, { oldFactors }]) => (
                  <div key={`note-${newFactor}`} className="flex items-center gap-2 rounded-lg bg-primary/5 border-l-2 border-primary px-4 py-2 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      {newFactor === 0 ? "0x" : `${newFactor}x`} grâce à <strong className="text-foreground">{displayName}</strong>
                      {" "}(sans ce talent : {[...oldFactors].map((f) => `${f}x`).join("/")})
                    </span>
                  </div>
                ));
              })()}
            </motion.div>
          </GlassCard>
        </motion.section>
      )}

      {/* ── Evolution Chain ── */}
      {displayChain && (
        <motion.section variants={detailSection}>
          <h2 className="mb-4 font-heading text-base font-bold">
            <span className="border-b-2 border-primary pb-0.5">Evolution</span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            <div className="p-5">
              <EvolutionChain chain={displayChain} currentId={pokemon.id} alternateForms={displayForms} />
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* ── Moves ── */}
      {moves && moves.length > 0 && (
        <motion.section variants={detailSection}>
          <h2 className="mb-4 font-heading text-base font-bold">
            <span className="border-b-2 border-primary pb-0.5">Moves</span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            <div className="p-5">
              <MoveTable moves={moves} />
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* Spin animation for decorative circle */}
    </motion.div>
  );
}

function MatchupRow({
  label,
  types,
  className,
  glowColor,
  modifiedTypes,
}: {
  label: string;
  types: string[] | undefined;
  className?: string;
  glowColor?: string;
  modifiedTypes?: Map<PokemonTypeName, ModifiedTypeInfo>;
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
      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => {
          const mod = modifiedTypes?.get(t as PokemonTypeName);
          return (
            <span key={t} className="relative">
              <TypeBadge type={t} />
              {mod && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary border border-background"
                  title={`Was ${mod.oldFactor}x`}
                />
              )}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}
