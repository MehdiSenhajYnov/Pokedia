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
    <div className="overflow-x-auto">
      <div className="inline-flex items-start gap-2">
        <BranchNode node={chain} currentId={currentId} />
      </div>
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

/** Renders a single node card. */
function NodeCard({
  node,
  currentId,
}: {
  node: EvolutionNode;
  currentId?: number;
}) {
  const { pokemonName } = useSettingsStore();
  const isCurrent = node.pokemon_id !== null && node.pokemon_id === currentId;
  const name = pokemonName(node.name_en, node.name_fr);
  const linkTo = node.pokemon_id !== null ? `/pokemon/${node.pokemon_id}` : "#";

  return (
    <Link
      to={linkTo}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors hover:bg-accent min-w-[80px]",
        isCurrent ? "border-primary bg-accent" : "border-border",
      )}
    >
      <PokemonSprite
        src={node.sprite_url}
        pokemonId={node.pokemon_id ?? undefined}
        alt={name}
        className="h-12 w-12"
      />
      <span className="text-xs font-medium text-center">{name}</span>
    </Link>
  );
}

/** Arrow + trigger label between nodes. */
function ArrowWithLabel({ trigger, detail }: { trigger: string | null; detail: string | null }) {
  const label = formatTrigger(trigger, detail);
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1">
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      {label && (
        <span className="max-w-[80px] text-center text-[10px] leading-tight text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Recursively renders a node and its children.
 * Handles branching: when a node has multiple evolves_to,
 * the branches are stacked vertically.
 */
function BranchNode({
  node,
  currentId,
}: {
  node: EvolutionNode;
  currentId?: number;
}) {
  const children = node.evolves_to;

  if (children.length === 0) {
    // Leaf node — just the card
    return <NodeCard node={node} currentId={currentId} />;
  }

  if (children.length === 1) {
    // Single evolution — render inline horizontally
    const child = children[0];
    return (
      <div className="flex items-center gap-1">
        <NodeCard node={node} currentId={currentId} />
        <ArrowWithLabel trigger={child.trigger} detail={child.trigger_detail} />
        <BranchNode node={child} currentId={currentId} />
      </div>
    );
  }

  // Multiple evolutions — branch vertically
  return (
    <div className="flex items-center gap-1">
      <NodeCard node={node} currentId={currentId} />
      <div className="flex flex-col gap-2">
        {children.map((child, idx) => (
          <div key={child.pokemon_id ?? `branch-${idx}`} className="flex items-center gap-1">
            <ArrowWithLabel trigger={child.trigger} detail={child.trigger_detail} />
            <BranchNode node={child} currentId={currentId} />
          </div>
        ))}
      </div>
    </div>
  );
}
