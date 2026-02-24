import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Plus, Check, Heart, Eye, GitCompareArrows } from "lucide-react";
import { motion } from "framer-motion";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";
import { TypeBadge } from "./TypeBadge";
import { PokemonSprite } from "@/components/ui/pokemon-sprite";
import { useSettingsStore } from "@/stores/settings-store";
import { useComparisonStore } from "@/stores/comparison-store";
import { useIsFavorite, useToggleFavorite } from "@/hooks/use-favorites";
import type { PokemonSummary } from "@/types";

interface PokemonCardProps {
  pokemon: PokemonSummary;
}

export function PokemonCard({ pokemon }: PokemonCardProps) {
  const navigate = useNavigate();
  const { pokemonName } = useSettingsStore();
  const { addPokemon, removePokemon, hasPokemon } = useComparisonStore();
  const isCompared = hasPokemon(pokemon.id);
  const isFavorite = useIsFavorite(pokemon.id);
  const { mutate: toggleFav } = useToggleFavorite();
  const name = pokemonName(pokemon.name_en, pokemon.name_fr);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Link
            to={`/pokemon/${pokemon.id}`}
            className="group relative flex flex-col items-center rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-accent/50"
          >
            {/* Action buttons */}
            <div className="absolute right-1.5 top-1.5 flex flex-col gap-1">
              {/* Favorite toggle */}
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
                <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
              </button>

              {/* Compare toggle */}
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
                {isCompared ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </button>
            </div>

            {/* ID */}
            <span className="text-[10px] text-muted-foreground">
              #{String(pokemon.id).padStart(3, "0")}
            </span>

            {/* Sprite */}
            <PokemonSprite
              src={pokemon.sprite_url}
              pokemonId={pokemon.id}
              alt={name}
              className="h-16 w-16"
            />

            {/* Name */}
            <span className="mt-1 truncate text-xs font-medium">{name}</span>

            {/* Type badges */}
            <div className="mt-1 flex gap-1">
              <TypeBadge type={pokemon.type1_key} />
              {pokemon.type2_key && <TypeBadge type={pokemon.type2_key} />}
            </div>

            {/* BST */}
            <span className="mt-1 text-[10px] text-muted-foreground">
              BST {pokemon.base_stat_total ?? "\u2014"}
            </span>
          </Link>
        </motion.div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[160px] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <ContextMenu.Item
            className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={() => navigate(`/pokemon/${pokemon.id}`)}
          >
            <Eye className="h-3.5 w-3.5" />
            View Details
          </ContextMenu.Item>

          <ContextMenu.Item
            className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={() => isCompared ? removePokemon(pokemon.id) : addPokemon(pokemon.id)}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            {isCompared ? "Remove from Compare" : "Add to Compare"}
          </ContextMenu.Item>

          <ContextMenu.Item
            className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
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
