import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import { PokemonSprite } from "@/components/ui/pokemon-sprite";
import type { EvolutionNode } from "@/types";

interface EvolutionChainProps {
  chain: EvolutionNode | null;
  currentId?: number;
}

export function EvolutionChain({ chain, currentId }: EvolutionChainProps) {
  if (!chain) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <EvolutionNodeView node={chain} currentId={currentId} isRoot />
    </div>
  );
}

/** Format the evolution trigger into a human-readable label. */
function formatTrigger(trigger: string | null, detail: string | null): string | null {
  if (!trigger) return null;

  switch (trigger) {
    case "level-up":
      return detail ?? "Level up";
    case "use-item":
      return detail ?? "Item";
    case "trade":
      return detail ? `Trade (${detail})` : "Trade";
    case "shed":
      return "Shedinja";
    default:
      return detail ?? trigger.replace(/-/g, " ");
  }
}

function EvolutionNodeView({
  node,
  currentId,
  isRoot = false,
}: {
  node: EvolutionNode;
  currentId?: number;
  isRoot?: boolean;
}) {
  const { pokemonName } = useSettingsStore();
  const isCurrent = node.pokemon_id !== null && node.pokemon_id === currentId;
  const name = pokemonName(node.name_en, node.name_fr);
  const linkTo = node.pokemon_id !== null ? `/pokemon/${node.pokemon_id}` : "#";

  return (
    <>
      <Link
        to={linkTo}
        className={cn(
          "flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors hover:bg-accent",
          isCurrent ? "border-primary bg-accent" : "border-border",
        )}
      >
        <PokemonSprite
          src={node.sprite_url}
          pokemonId={node.pokemon_id ?? undefined}
          alt={name}
          className="h-12 w-12"
        />
        <span className="text-xs font-medium">{name}</span>
      </Link>

      {node.evolves_to.map((child, idx) => (
        <div key={child.pokemon_id ?? `evo-${idx}`} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {formatTrigger(child.trigger, child.trigger_detail) && (
              <span className="max-w-[80px] text-center text-[10px] leading-tight text-muted-foreground">
                {formatTrigger(child.trigger, child.trigger_detail)}
              </span>
            )}
          </div>
          <EvolutionNodeView node={child} currentId={currentId} />
        </div>
      ))}
    </>
  );
}
