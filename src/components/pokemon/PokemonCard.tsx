import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Plus, Check, Heart, Eye, GitCompareArrows } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";
import { TypeBadge } from "./TypeBadge";
import { PokemonSprite } from "@/components/ui/pokemon-sprite";
import { useSettingsStore } from "@/stores/settings-store";
import { useComparisonStore } from "@/stores/comparison-store";
import { useIsFavorite, useToggleFavorite } from "@/hooks/use-favorites";
import { getBaseId, getFormLabel } from "@/lib/pokemon-utils";
import { TYPE_COLORS } from "@/lib/constants";
import { heartBurst, scalePop, springPlayful } from "@/lib/motion";
import type { PokemonSummary } from "@/types";
import { useCallback, useRef } from "react";

interface PokemonCardProps {
  pokemon: PokemonSummary;
  nameToIdMap?: Map<string, number>;
}

export function PokemonCard({ pokemon, nameToIdMap }: PokemonCardProps) {
  const navigate = useNavigate();
  const { pokemonName } = useSettingsStore();
  const { addPokemon, removePokemon, hasPokemon } = useComparisonStore();
  const isCompared = hasPokemon(pokemon.id);
  const isFavorite = useIsFavorite(pokemon.id);
  const { mutate: toggleFav } = useToggleFavorite();
  const name = pokemonName(pokemon.name_en, pokemon.name_fr);
  const baseId = nameToIdMap ? getBaseId(pokemon, nameToIdMap) : pokemon.id;
  const formLabel = nameToIdMap && baseId !== pokemon.id ? getFormLabel(pokemon.name_key) : null;
  const typeHex = TYPE_COLORS[pokemon.type1_key ?? ""]?.hex ?? "#888";

  // 3D tilt
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 16}deg) rotateX(${-y * 16}deg) scale(1.02)`;
  }, []);
  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)";
  }, []);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transition: "transform 0.15s ease-out, box-shadow 0.2s ease",
          }}
          className="group"
        >
          <motion.div whileTap={{ scale: 0.97 }}>
          <Link
            to={`/pokemon/${pokemon.id}`}
            className="relative flex flex-col items-center rounded-xl glass border border-transparent p-4 transition-all duration-200 hover:border-[var(--type-color)] hover:shadow-[0_8px_30px_var(--type-glow)]"
            style={{
              "--type-color": `${typeHex}60`,
              "--type-glow": `${typeHex}20`,
              backgroundImage: `radial-gradient(circle at 20% 0%, ${typeHex}0C, transparent 50%), linear-gradient(to bottom, transparent 40%, ${typeHex}18)`,
            } as React.CSSProperties}
          >
            {/* Action buttons */}
            <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 z-10">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFav(pokemon.id);
                }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                  isFavorite
                    ? "text-red-500"
                    : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-red-400",
                )}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isFavorite ? "fav" : "not-fav"}
                    variants={heartBurst}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
                  </motion.div>
                </AnimatePresence>
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  isCompared ? removePokemon(pokemon.id) : addPokemon(pokemon.id);
                }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                  isCompared
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground opacity-0 group-hover:opacity-100",
                )}
                aria-label={isCompared ? "Remove from comparison" : "Add to comparison"}
              >
                <AnimatePresence mode="wait">
                  {isCompared ? (
                    <motion.div key="check" variants={scalePop} initial="initial" animate="animate" exit="exit">
                      <Check className="h-3 w-3" />
                    </motion.div>
                  ) : (
                    <motion.div key="plus" variants={scalePop} initial="initial" animate="animate" exit="exit">
                      <Plus className="h-3 w-3" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {/* ID */}
            <span className="font-mono text-[10px] text-muted-foreground/60">
              #{String(baseId).padStart(3, "0")}
            </span>

            {/* Sprite */}
            <motion.div
              className="h-20 w-20"
              whileHover={{ y: -8, rotate: [-2, 2, 0] }}
              transition={springPlayful}
            >
              <PokemonSprite
                src={pokemon.sprite_url}
                pokemonId={pokemon.id}
                alt={name}
                className="h-20 w-20"
              />
            </motion.div>

            {/* Name + form label */}
            <span className="mt-2 truncate font-heading text-xs font-semibold">{name}</span>
            {formLabel && (
              <span className="truncate text-[10px] text-muted-foreground">{formLabel}</span>
            )}

            {/* Type badges */}
            <div className="mt-2 flex gap-1">
              <TypeBadge type={pokemon.type1_key} />
              {pokemon.type2_key && <TypeBadge type={pokemon.type2_key} />}
            </div>

            {/* BST */}
            <span className="mt-1.5 font-mono text-[10px] text-muted-foreground">
              BST {pokemon.base_stat_total ?? "\u2014"}
            </span>
          </Link>
          </motion.div>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[160px] overflow-hidden rounded-xl glass border border-border/40 p-1 text-popover-foreground shadow-warm animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <ContextMenu.Item
            className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={() => navigate(`/pokemon/${pokemon.id}`)}
          >
            <Eye className="h-3.5 w-3.5" />
            View Details
          </ContextMenu.Item>

          <ContextMenu.Item
            className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={() => isCompared ? removePokemon(pokemon.id) : addPokemon(pokemon.id)}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            {isCompared ? "Remove from Compare" : "Add to Compare"}
          </ContextMenu.Item>

          <ContextMenu.Item
            className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={() => toggleFav(pokemon.id)}
          >
            <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-red-500 text-red-500")} />
            {isFavorite ? "Remove Favorite" : "Add to Favorites"}
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
