import { useParams, Link, useNavigate } from "react-router-dom";
import { useMoveById, useAllMoves, useMovePokemon } from "@/hooks/use-moves";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabStore } from "@/stores/tab-store";
import { usePageTitle } from "@/hooks/use-page-title";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { DamageClassIcon } from "@/components/moves/DamageClassIcon";

import { TYPE_COLORS_HEX } from "@/lib/constants";
import { sectionReveal } from "@/lib/motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Swords } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard, GlassPill } from "@/components/ui/liquid-glass";
import type { MovePokemonEntry } from "@/types";

export default function MoveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const moveId = id ? parseInt(id, 10) : null;

  const { data: move, isLoading } = useMoveById(moveId);
  const { data: allMoves } = useAllMoves();
  const { data: movePokemon } = useMovePokemon(moveId);
  const { moveName, pokemonName, description } = useSettingsStore();
  const { openTab } = useTabStore();

  const { prevId, nextId } = useMemo(() => {
    if (!allMoves || !moveId) return { prevId: null, nextId: null };
    const idx = allMoves.findIndex((m) => m.id === moveId);
    return {
      prevId: idx > 0 ? allMoves[idx - 1].id : null,
      nextId: idx >= 0 && idx < allMoves.length - 1 ? allMoves[idx + 1].id : null,
    };
  }, [allMoves, moveId]);

  const name = move ? moveName(move.name_en, move.name_fr) : "";

  usePageTitle(move ? name : "Loading...");

  useEffect(() => {
    if (moveId && move) {
      openTab({
        kind: "move",
        entityId: moveId,
        nameEn: move.name_en ?? "",
        nameFr: move.name_fr ?? "",
        typeKey: move.type_key,
      });
    }
  }, [moveId, move, openTab]);

  const handleKeyNav = useCallback(
    (e: KeyboardEvent) => {
      if (!move) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" && prevId !== null) {
        navigate(`/moves/${prevId}`);
      } else if (e.key === "ArrowRight" && nextId !== null) {
        navigate(`/moves/${nextId}`);
      }
    },
    [move, navigate, prevId, nextId],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyNav);
    return () => window.removeEventListener("keydown", handleKeyNav);
  }, [handleKeyNav]);

  if (isLoading || !move) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 skeleton-shimmer rounded-full" />
            <div className="h-6 w-48 skeleton-shimmer rounded-xl" />
            <div className="flex gap-2">
              <div className="h-5 w-16 skeleton-shimmer rounded-full" />
              <div className="h-5 w-20 skeleton-shimmer rounded-full" />
            </div>
          </div>
          <div className="flex justify-center gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-24 skeleton-shimmer rounded-xl" />
            ))}
          </div>
          <div className="h-20 skeleton-shimmer rounded-xl" />
        </div>
      </div>
    );
  }

  const typeHex = TYPE_COLORS_HEX[move.type_key ?? ""] ?? "#888";
  const effectText = description(move.effect_en, move.effect_fr);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 relative overflow-hidden">
      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <GlassPill>
            <button
              onClick={() => navigate("/moves")}
              className="flex h-8 items-center gap-1.5 px-3 text-xs hover:text-foreground transition-all"
              aria-label="Back to Moves"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Moves
            </button>
          </GlassPill>

          <GlassPill>
            <div className="flex items-center">
              {prevId !== null ? (
                <Link
                  to={`/moves/${prevId}`}
                  className="flex h-8 items-center px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Previous move"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="flex h-8 items-center px-2.5 text-xs text-muted-foreground/30">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="border-x border-white/10 px-2.5 font-mono text-xs text-muted-foreground">
                #{move.id}
              </span>
              {nextId !== null ? (
                <Link
                  to={`/moves/${nextId}`}
                  className="flex h-8 items-center px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Next move"
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
      </div>

      {/* ── Hero ── */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute h-24 w-24 rounded-full"
            style={{
              background: `radial-gradient(circle, ${typeHex}30 0%, transparent 70%)`,
            }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10">
            <Swords className="h-7 w-7" style={{ color: typeHex }} />
          </div>
        </div>

        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold">{name}</h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            {move.type_key && <TypeBadge type={move.type_key} size="md" />}
            <DamageClassIcon damageClass={move.damage_class} showLabel />
          </div>
        </div>
      </div>

      {/* ── Stats Pills ── */}
      <motion.div
        className="flex flex-wrap justify-center gap-3"
        variants={sectionReveal}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
      >
        <StatPill label="Power" value={move.power} />
        <StatPill label="Accuracy" value={move.accuracy !== null ? `${move.accuracy}%` : null} />
        <StatPill label="PP" value={move.pp} />
        <StatPill label="Priority" value={move.priority ?? 0} />
      </motion.div>

      {/* ── Effect ── */}
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
          <GlassCard className="rounded-2xl border border-border/30">
            <div className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {effectText}
              </p>
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* ── Pokemon that learn this move ── */}
      {movePokemon && movePokemon.length > 0 && (
        <MovePokemonSection pokemon={movePokemon} pokemonName={pokemonName} />
      )}
    </div>
  );
}

const LEARN_METHOD_TABS: { key: string; label: string }[] = [
  { key: "level-up", label: "Level Up" },
  { key: "machine", label: "TM/HM" },
  { key: "tutor", label: "Tutor" },
  { key: "egg", label: "Egg" },
];

function MovePokemonSection({
  pokemon,
  pokemonName,
}: {
  pokemon: MovePokemonEntry[];
  pokemonName: (en: string | null, fr: string | null) => string;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, MovePokemonEntry[]>();
    for (const p of pokemon) {
      const existing = map.get(p.learn_method);
      if (existing) existing.push(p);
      else map.set(p.learn_method, [p]);
    }
    return map;
  }, [pokemon]);

  const availableTabs = useMemo(
    () => LEARN_METHOD_TABS.filter((t) => grouped.has(t.key)),
    [grouped],
  );

  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (availableTabs.length > 0 && !grouped.has(activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab, grouped]);

  const currentList = grouped.get(activeTab) ?? [];

  const spriteBase =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

  return (
    <motion.section
      variants={sectionReveal}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
    >
      <h2 className="mb-3 font-heading text-sm font-bold">
        <span className="border-b-2 border-primary pb-0.5">
          Learned by
        </span>
        <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
          {pokemon.length}
        </span>
      </h2>

      {/* Tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-all",
              activeTab === t.key
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className="ml-1.5 font-mono text-[10px] opacity-60">
              {grouped.get(t.key)?.length}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
        {currentList.map((p) => (
          <Link
            key={`${p.pokemon_id}-${p.learn_method}`}
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
                {activeTab === "level-up" && p.level_learned_at > 0 && (
                  <span className="inline-flex items-center rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                    Lv.{p.level_learned_at}
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
  );
}

function StatPill({ label, value }: { label: string; value: number | string | null }) {
  return (
    <GlassCard className="rounded-xl border border-border/30" style={{ borderRadius: "12px" }}>
      <div className="flex flex-col items-center px-5 py-3 min-w-[90px]">
        <span className="font-heading text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="mt-0.5 font-mono text-lg font-semibold">
          {value ?? "\u2014"}
        </span>
      </div>
    </GlassCard>
  );
}
