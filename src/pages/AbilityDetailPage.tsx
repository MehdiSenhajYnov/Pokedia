import { useParams, Link, useNavigate } from "react-router-dom";
import { useAbilityById, useAllAbilities, useAbilityPokemon } from "@/hooks/use-abilities";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabStore } from "@/stores/tab-store";
import { usePageTitle } from "@/hooks/use-page-title";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { sectionReveal } from "@/lib/motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

export default function AbilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const abilityId = id ? parseInt(id, 10) : null;

  const { data: ability, isLoading } = useAbilityById(abilityId);
  const { data: allAbilities } = useAllAbilities();
  const { data: abilityPokemon } = useAbilityPokemon(abilityId);
  const { abilityName, pokemonName, description } = useSettingsStore();
  const { openTab } = useTabStore();

  const { prevId, nextId } = useMemo(() => {
    if (!allAbilities || !abilityId) return { prevId: null, nextId: null };
    const idx = allAbilities.findIndex((a) => a.id === abilityId);
    return {
      prevId: idx > 0 ? allAbilities[idx - 1].id : null,
      nextId: idx >= 0 && idx < allAbilities.length - 1 ? allAbilities[idx + 1].id : null,
    };
  }, [allAbilities, abilityId]);

  const name = ability ? abilityName(ability.name_en, ability.name_fr) : "";

  usePageTitle(ability ? name : "Loading...");

  useEffect(() => {
    if (abilityId && ability) {
      openTab({
        kind: "ability",
        entityId: abilityId,
        nameEn: ability.name_en ?? "",
        nameFr: ability.name_fr ?? "",
        typeKey: null,
      });
    }
  }, [abilityId, ability, openTab]);

  const handleKeyNav = useCallback(
    (e: KeyboardEvent) => {
      if (!ability) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" && prevId !== null) {
        navigate(`/abilities/${prevId}`);
      } else if (e.key === "ArrowRight" && nextId !== null) {
        navigate(`/abilities/${nextId}`);
      }
    },
    [ability, navigate, prevId, nextId],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyNav);
    return () => window.removeEventListener("keydown", handleKeyNav);
  }, [handleKeyNav]);

  if (isLoading || ability === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 skeleton-shimmer rounded-full" />
            <div className="h-6 w-48 skeleton-shimmer rounded-xl" />
            <div className="h-4 w-24 skeleton-shimmer rounded-full" />
          </div>
          <div className="h-20 skeleton-shimmer rounded-xl" />
        </div>
      </div>
    );
  }

  if (ability === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Sparkles className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="font-heading text-xl font-semibold">Ability not found</h2>
        <button
          onClick={() => navigate("/abilities")}
          className="flex h-8 items-center gap-1.5 rounded-full glass-light border border-border/40 px-3 text-xs hover:shadow-warm transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Abilities
        </button>
      </div>
    );
  }

  const effectText = description(ability.effect_en, ability.effect_fr);
  const shortEffectText = description(ability.short_effect_en, ability.short_effect_fr);

  const spriteBase =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 relative overflow-hidden">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/abilities")}
            className="flex h-8 items-center gap-1.5 rounded-full glass-light border border-border/40 px-3 text-xs hover:shadow-warm transition-all"
            aria-label="Back to Abilities"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Abilities
          </button>

          <div className="flex items-center rounded-full glass-light border border-border/40">
            {prevId !== null ? (
              <Link
                to={`/abilities/${prevId}`}
                className="flex h-8 items-center px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Previous ability"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="flex h-8 items-center px-2.5 text-xs text-muted-foreground/30">
                <ChevronLeft className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="border-x border-border/30 px-2.5 font-mono text-xs text-muted-foreground">
              #{ability.id}
            </span>
            {nextId !== null ? (
              <Link
                to={`/abilities/${nextId}`}
                className="flex h-8 items-center px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Next ability"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="flex h-8 items-center px-2.5 text-xs text-muted-foreground/30">
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute h-24 w-24 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)",
            }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full glass-light border border-border/30">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold">{name}</h1>
          {ability.generation && (
            <div className="mt-2 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full glass-light border border-border/30 px-3 py-1 text-xs text-muted-foreground">
                Generation {ability.generation}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Short Effect */}
      {shortEffectText && (
        <motion.div
          className="text-center text-sm text-muted-foreground"
          variants={sectionReveal}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {shortEffectText}
        </motion.div>
      )}

      {/* Full Effect */}
      {effectText && (
        <motion.section
          variants={sectionReveal}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h2 className="mb-3 font-heading text-sm font-bold">
            <span className="border-b-2 border-primary pb-0.5">Effect</span>
          </h2>
          <div className="rounded-2xl glass border border-border/30 p-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {effectText}
            </p>
          </div>
        </motion.section>
      )}

      {/* Pokemon with this ability */}
      {abilityPokemon && abilityPokemon.length > 0 && (
        <motion.section
          variants={sectionReveal}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h2 className="mb-3 font-heading text-sm font-bold">
            <span className="border-b-2 border-primary pb-0.5">
              Pokemon with this ability
            </span>
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              {abilityPokemon.length}
            </span>
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
            {abilityPokemon.map((p) => (
              <Link
                key={`${p.pokemon_id}-${p.is_hidden}`}
                to={`/pokemon/${p.pokemon_id}`}
                className="flex items-center gap-2.5 rounded-xl glass-flat border border-border/30 px-3 py-2 hover:border-primary/30 hover:shadow-warm transition-all"
              >
                <img
                  src={p.sprite_url ?? `${spriteBase}/${p.pokemon_id}.png`}
                  alt=""
                  className="h-8 w-8 shrink-0 object-contain"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-heading text-xs font-semibold">
                      {pokemonName(p.name_en, p.name_fr)}
                    </span>
                    {p.is_hidden === 1 && (
                      <span className={cn(
                        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
                        "glass-light-flat text-[9px] font-medium text-amber-500",
                      )}>
                        <Eye className="h-2.5 w-2.5" />
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <TypeBadge type={p.type1_key} size="sm" />
                    {p.type2_key && <TypeBadge type={p.type2_key} size="sm" />}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
