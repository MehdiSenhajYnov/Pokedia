import { useMemo, useState, useCallback } from "react";
import { X, Plus, Search, Trash2, GitCompareArrows } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useComparisonStore } from "@/stores/comparison-store";
import { useAllPokemon } from "@/hooks/use-pokemon";
import { useSettingsStore } from "@/stores/settings-store";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { PokemonSprite } from "@/components/ui/pokemon-sprite";
import { getDefensiveMatchups } from "@/lib/type-chart";
import { STAT_COLORS } from "@/lib/constants";
import { dialogOverlay, dialogContent } from "@/lib/motion";
import type { PokemonSummary } from "@/types";
import type { PokemonTypeName } from "@/lib/constants";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard, GlassModal } from "@/components/ui/liquid-glass";

const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

export default function ComparisonPage() {
  usePageTitle("Compare");
  const { pokemonIds, removePokemon, clearAll } = useComparisonStore();
  const { data: allPokemon } = useAllPokemon();
  const { pokemonName } = useSettingsStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const selectedPokemon = useMemo(() => {
    if (!allPokemon) return [];
    return pokemonIds
      .map((id) => allPokemon.find((p) => p.id === id))
      .filter((p): p is PokemonSummary => p !== undefined);
  }, [pokemonIds, allPokemon]);

  const maxStats = useMemo(() => {
    const maxes: Record<string, number> = {};
    for (const key of STAT_KEYS) {
      maxes[key] = Math.max(
        ...selectedPokemon.map((p) => p[key] ?? 0),
        1,
      );
    }
    maxes["bst"] = Math.max(
      ...selectedPokemon.map((p) => p.base_stat_total ?? 0),
      1,
    );
    return maxes;
  }, [selectedPokemon]);

  const bestStats = useMemo(() => {
    const bests: Record<string, number> = {};
    for (const key of STAT_KEYS) {
      bests[key] = Math.max(...selectedPokemon.map((p) => p[key] ?? 0));
    }
    bests["bst"] = Math.max(
      ...selectedPokemon.map((p) => p.base_stat_total ?? 0),
    );
    return bests;
  }, [selectedPokemon]);

  if (pokemonIds.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-[70vh] gap-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
          <GitCompareArrows className="h-8 w-8 text-muted-foreground animate-[float_3s_ease-in-out_infinite]" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="font-heading text-lg font-semibold">No Pokemon to Compare</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Start by adding Pokemon from the{" "}
            <Link to="/" className="text-primary hover:underline font-medium">
              Pokedex
            </Link>{" "}
            using the compare button, or use the button below.
          </p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 glow-primary transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Pokemon
        </button>

        <AnimatePresence>
          {pickerOpen && (
            <PokemonPicker onClose={() => setPickerOpen(false)} />
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-5 space-y-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">
          Comparison{" "}
          <span className="text-muted-foreground font-normal">
            ({pokemonIds.length} Pokemon)
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 text-xs font-medium hover:shadow-warm transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Add Pokemon
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex h-8 items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear All
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <GlassCard className="overflow-x-auto rounded-2xl border border-border/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="sticky left-0 z-10 glass-heavy px-4 py-3 text-left font-heading text-xs font-medium text-muted-foreground w-24 min-w-24">
                Stat
              </th>
              <AnimatePresence mode="popLayout">
                {selectedPokemon.map((p) => (
                  <motion.th
                    key={p.id}
                    className="min-w-[140px] px-3 py-3 text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                    layout
                  >
                    <div className="flex flex-col items-center gap-1.5 relative group">
                      <button
                        onClick={() => removePokemon(p.id)}
                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Remove from comparison"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <Link
                        to={`/pokemon/${p.id}`}
                        className="hover:scale-110 transition-transform"
                      >
                        <PokemonSprite
                          src={p.sprite_url}
                          pokemonId={p.id}
                          alt={pokemonName(p.name_en, p.name_fr)}
                          className="h-14 w-14"
                        />
                      </Link>
                      <span className="font-heading text-xs font-semibold leading-tight">
                        {pokemonName(p.name_en, p.name_fr)}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        #{String(p.id).padStart(3, "0")}
                      </span>
                    </div>
                  </motion.th>
                ))}
              </AnimatePresence>
            </tr>
          </thead>
          <tbody>
            {/* Types row */}
            <tr className="border-b border-border/20">
              <td className="sticky left-0 z-10 glass-heavy px-4 py-2.5 font-heading text-xs font-medium text-muted-foreground">
                Types
              </td>
              {selectedPokemon.map((p) => (
                <td key={p.id} className="px-3 py-2.5 text-center">
                  <div className="flex gap-1 justify-center">
                    {p.type1_key && <TypeBadge type={p.type1_key} />}
                    {p.type2_key && <TypeBadge type={p.type2_key} />}
                    {!p.type1_key && !p.type2_key && (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Stat rows */}
            {STAT_KEYS.map((stat) => (
              <tr key={stat} className="border-b border-border/20">
                <td className="sticky left-0 z-10 glass-heavy px-4 py-2.5 font-heading text-xs font-medium"
                  style={{ color: STAT_COLORS[stat] }}
                >
                  {STAT_LABELS[stat]}
                </td>
                {selectedPokemon.map((p) => {
                  const value = p[stat] ?? 0;
                  const pct = (value / maxStats[stat]) * 100;
                  const isBest =
                    selectedPokemon.length > 1 &&
                    value > 0 &&
                    value === bestStats[stat];

                  return (
                    <td key={p.id} className="px-3 py-2.5">
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={`font-mono text-xs ${
                            isBest
                              ? "font-bold text-primary glow-primary"
                              : p[stat] === null
                                ? "text-muted-foreground"
                                : ""
                          }`}
                        >
                          {p[stat] !== null ? value : "--"}
                        </span>
                        <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: STAT_COLORS[stat],
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{
                              duration: 0.5,
                              ease: "easeOut",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* BST row */}
            <tr className="border-b border-border/20 bg-muted/10">
              <td className="sticky left-0 z-10 glass-heavy bg-muted/10 px-4 py-2.5 font-heading text-xs font-bold text-primary">
                BST
              </td>
              {selectedPokemon.map((p) => {
                const bst = p.base_stat_total ?? 0;
                const isBest =
                  selectedPokemon.length > 1 &&
                  bst > 0 &&
                  bst === bestStats["bst"];

                return (
                  <td
                    key={p.id}
                    className={`px-3 py-2.5 text-center font-mono text-xs ${
                      isBest ? "font-bold text-primary" : "font-semibold"
                    }`}
                  >
                    {p.base_stat_total !== null ? bst : "--"}
                  </td>
                );
              })}
            </tr>

            {/* Weaknesses row */}
            <tr className="border-b border-border/20">
              <td className="sticky left-0 z-10 glass-heavy px-4 py-2.5 font-heading text-xs font-medium text-red-400">
                Weak
              </td>
              {selectedPokemon.map((p) => {
                if (!p.type1_key) {
                  return (
                    <td key={p.id} className="px-3 py-2.5 text-center">
                      <span className="text-xs text-muted-foreground">--</span>
                    </td>
                  );
                }
                const matchups = getDefensiveMatchups(
                  p.type1_key as PokemonTypeName,
                  (p.type2_key as PokemonTypeName) ?? null,
                );
                const weak4x = matchups[4] ?? [];
                const weak2x = matchups[2] ?? [];
                return (
                  <td key={p.id} className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {weak4x.map((t) => (
                        <span key={t} className="relative">
                          <TypeBadge type={t} />
                          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white">
                            4
                          </span>
                        </span>
                      ))}
                      {weak2x.map((t) => (
                        <TypeBadge key={t} type={t} />
                      ))}
                      {weak4x.length === 0 && weak2x.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          None
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Resistances row */}
            <tr className="border-b border-border/20">
              <td className="sticky left-0 z-10 glass-heavy px-4 py-2.5 font-heading text-xs font-medium text-green-400">
                Resist
              </td>
              {selectedPokemon.map((p) => {
                if (!p.type1_key) {
                  return (
                    <td key={p.id} className="px-3 py-2.5 text-center">
                      <span className="text-xs text-muted-foreground">--</span>
                    </td>
                  );
                }
                const matchups = getDefensiveMatchups(
                  p.type1_key as PokemonTypeName,
                  (p.type2_key as PokemonTypeName) ?? null,
                );
                const resist025 = matchups[0.25] ?? [];
                const resist05 = matchups[0.5] ?? [];
                return (
                  <td key={p.id} className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {resist025.map((t) => (
                        <span key={t} className="relative">
                          <TypeBadge type={t} />
                          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-green-500 text-[7px] font-bold text-white">
                            4
                          </span>
                        </span>
                      ))}
                      {resist05.map((t) => (
                        <TypeBadge key={t} type={t} />
                      ))}
                      {resist025.length === 0 && resist05.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          None
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Immunities row */}
            <tr>
              <td className="sticky left-0 z-10 glass-heavy px-4 py-2.5 font-heading text-xs font-medium text-gray-400">
                Immune
              </td>
              {selectedPokemon.map((p) => {
                if (!p.type1_key) {
                  return (
                    <td key={p.id} className="px-3 py-2.5 text-center">
                      <span className="text-xs text-muted-foreground">--</span>
                    </td>
                  );
                }
                const matchups = getDefensiveMatchups(
                  p.type1_key as PokemonTypeName,
                  (p.type2_key as PokemonTypeName) ?? null,
                );
                const immune = matchups[0] ?? [];
                return (
                  <td key={p.id} className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {immune.map((t) => (
                        <TypeBadge key={t} type={t} />
                      ))}
                      {immune.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          None
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </GlassCard>

      {/* Picker dialog */}
      <AnimatePresence>
        {pickerOpen && (
          <PokemonPicker onClose={() => setPickerOpen(false)} />
        )}
      </AnimatePresence>

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-4 w-full max-w-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-compare-title"
            aria-describedby="clear-compare-desc"
          >
          <GlassModal className="rounded-2xl border border-border/30 shadow-glass">
            <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h3 id="clear-compare-title" className="font-heading text-sm font-semibold">
                Clear comparison?
              </h3>
            </div>
            <p id="clear-compare-desc" className="text-xs text-muted-foreground mb-4">
              This will remove all {pokemonIds.length} Pokemon from your comparison.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-medium hover:shadow-warm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAll();
                  setShowClearConfirm(false);
                }}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Clear All
              </button>
            </div>
            </div>
          </GlassModal>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function PokemonPicker({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { data: allPokemon } = useAllPokemon();
  const { addPokemon, hasPokemon } = useComparisonStore();
  const { pokemonName } = useSettingsStore();

  const filtered = useMemo(() => {
    if (!allPokemon) return [];
    if (!query) return allPokemon.slice(0, 50);
    const q = query.toLowerCase();
    return allPokemon
      .filter(
        (p) =>
          (p.name_en?.toLowerCase().includes(q) ?? false) ||
          (p.name_fr?.toLowerCase().includes(q) ?? false) ||
          p.id.toString() === q,
      )
      .slice(0, 50);
  }, [allPokemon, query]);

  const handleAdd = useCallback(
    (id: number) => {
      addPokemon(id);
    },
    [addPokemon],
  );

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        variants={dialogOverlay}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
      />

      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        variants={dialogContent}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2 }}
      >
        <div className="pointer-events-auto w-full max-w-lg overflow-hidden" role="dialog" aria-modal="true" aria-label="Add Pokemon to comparison">
        <GlassModal className="rounded-2xl border border-border/30 shadow-glass">
          <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or number..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 font-body"
            />
            <button
              onClick={onClose}
              className="flex-shrink-0 rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-white/8 transition-colors"
            >
              ESC
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No Pokemon found.
              </div>
            )}
            {filtered.map((p) => {
              const alreadyAdded = hasPokemon(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (!alreadyAdded) handleAdd(p.id);
                  }}
                  disabled={alreadyAdded}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/8 disabled:opacity-40 transition-colors"
                >
                  <PokemonSprite
                    src={p.sprite_url}
                    pokemonId={p.id}
                    alt={pokemonName(p.name_en, p.name_fr)}
                    className="h-8 w-8"
                  />
                  <span className="font-mono text-xs text-muted-foreground w-10 text-right">
                    #{String(p.id).padStart(3, "0")}
                  </span>
                  <span className="flex-1 text-left font-heading font-medium">
                    {pokemonName(p.name_en, p.name_fr)}
                  </span>
                  <div className="flex gap-1">
                    {p.type1_key && <TypeBadge type={p.type1_key} />}
                    {p.type2_key && <TypeBadge type={p.type2_key} />}
                  </div>
                  {alreadyAdded ? (
                    <span className="text-[10px] font-medium text-muted-foreground ml-1">
                      Added
                    </span>
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </GlassModal>
        </div>
      </motion.div>
    </>
  );
}
