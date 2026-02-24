import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFormLabel } from "@/lib/pokemon-utils";
import { useSettingsStore } from "@/stores/settings-store";
import { PokemonSprite } from "@/components/ui/pokemon-sprite";
import type { EvolutionNode, PokemonSummary } from "@/types";

interface EvolutionChainProps {
  chain: EvolutionNode | null;
  currentId?: number;
  alternateForms?: PokemonSummary[];
}

export function EvolutionChain({ chain, currentId, alternateForms }: EvolutionChainProps) {
  if (!chain) return null;

  // Collect all chain node name_keys for name-prefix matching
  const nodeKeys = new Map<string, number>(); // name_key → pokemon_id
  collectNodeKeys(chain, nodeKeys);

  // Group alternate forms by the chain node they belong to (by pokemon_id).
  // Strategy: use species_id if available, otherwise match by name prefix.
  const formsByNodeId = new Map<number, PokemonSummary[]>();
  if (alternateForms) {
    for (const form of alternateForms) {
      let matchedNodeId: number | null = null;

      // Try species_id first (direct match to chain node pokemon_id)
      if (form.species_id !== null && nodeKeys.has(findKeyById(nodeKeys, form.species_id))) {
        matchedNodeId = form.species_id;
      }

      // Fallback: match by name prefix (e.g., "charizard-mega-x" matches node "charizard")
      if (matchedNodeId === null) {
        for (const [nodeKey, nodeId] of nodeKeys) {
          if (form.name_key.startsWith(nodeKey + "-")) {
            matchedNodeId = nodeId;
            break;
          }
        }
      }

      if (matchedNodeId !== null) {
        const list = formsByNodeId.get(matchedNodeId) ?? [];
        list.push(form);
        formsByNodeId.set(matchedNodeId, list);
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex items-start gap-2">
        <BranchNode node={chain} currentId={currentId} formsBySpecies={formsByNodeId} />
      </div>
    </div>
  );
}

/** Recursively collect name_key → pokemon_id from all chain nodes. */
function collectNodeKeys(node: EvolutionNode, map: Map<string, number>) {
  if (node.pokemon_id !== null) {
    map.set(node.name_key, node.pokemon_id);
  }
  for (const child of node.evolves_to) {
    collectNodeKeys(child, map);
  }
}

/** Find a node's name_key by its pokemon_id. */
function findKeyById(map: Map<string, number>, id: number): string {
  for (const [key, val] of map) {
    if (val === id) return key;
  }
  return "";
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

/** Renders a single node card (for evolution chain nodes). */
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

/** Renders a card for an alternate form (mega, regional, etc.). */
function FormCard({
  form,
  currentId,
}: {
  form: PokemonSummary;
  currentId?: number;
}) {
  const { pokemonName } = useSettingsStore();
  const isCurrent = form.id === currentId;
  const name = pokemonName(form.name_en, form.name_fr);

  return (
    <Link
      to={`/pokemon/${form.id}`}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border border-dashed p-2 transition-colors hover:bg-accent min-w-[80px]",
        isCurrent ? "border-primary bg-accent" : "border-border",
      )}
    >
      <PokemonSprite
        src={form.sprite_url}
        pokemonId={form.id}
        alt={name}
        className="h-12 w-12"
      />
      <span className="text-xs font-medium text-center">{name}</span>
    </Link>
  );
}

/** Arrow + trigger label between evolution nodes. */
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

/** Arrow + label for alternate forms (smaller, italic). */
function FormArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1">
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
      <span className="max-w-[80px] text-center text-[9px] leading-tight text-muted-foreground/60 italic">
        {label}
      </span>
    </div>
  );
}

/**
 * Recursively renders a node and its children.
 * Handles branching: when a node has multiple evolves_to,
 * the branches are stacked vertically.
 * Alternate forms (megas, regional, etc.) branch to the RIGHT of their
 * base card, just like evolutions but with dashed-border cards.
 */
function BranchNode({
  node,
  currentId,
  formsBySpecies,
}: {
  node: EvolutionNode;
  currentId?: number;
  formsBySpecies: Map<number, PokemonSummary[]>;
}) {
  const children = node.evolves_to;
  const forms = node.pokemon_id !== null ? (formsBySpecies.get(node.pokemon_id) ?? []) : [];
  const totalBranches = children.length + forms.length;

  // Leaf node with no forms — just the card
  if (totalBranches === 0) {
    return <NodeCard node={node} currentId={currentId} />;
  }

  // Single evolution, no forms — render inline horizontally
  if (children.length === 1 && forms.length === 0) {
    const child = children[0];
    return (
      <div className="flex items-center gap-1">
        <NodeCard node={node} currentId={currentId} />
        <ArrowWithLabel trigger={child.trigger} detail={child.trigger_detail} />
        <BranchNode node={child} currentId={currentId} formsBySpecies={formsBySpecies} />
      </div>
    );
  }

  // Single form only, no evolutions — render inline
  if (forms.length === 1 && children.length === 0) {
    return (
      <div className="flex items-center gap-1">
        <NodeCard node={node} currentId={currentId} />
        <FormArrow label={getFormLabel(forms[0].name_key) ?? "Form"} />
        <FormCard form={forms[0]} currentId={currentId} />
      </div>
    );
  }

  // Multiple branches — stack vertically: evolutions first, then forms
  return (
    <div className="flex items-start gap-1">
      <div className="flex items-center self-center">
        <NodeCard node={node} currentId={currentId} />
      </div>
      <div className="flex flex-col gap-2 justify-center">
        {/* Evolution branches */}
        {children.map((child, idx) => (
          <div key={child.pokemon_id ?? `evo-${idx}`} className="flex items-center gap-1">
            <ArrowWithLabel trigger={child.trigger} detail={child.trigger_detail} />
            <BranchNode node={child} currentId={currentId} formsBySpecies={formsBySpecies} />
          </div>
        ))}
        {/* Alternate form branches */}
        {forms.map((form) => (
          <div key={form.id} className="flex items-center gap-1">
            <FormArrow label={getFormLabel(form.name_key) ?? "Form"} />
            <FormCard form={form} currentId={currentId} />
          </div>
        ))}
      </div>
    </div>
  );
}
