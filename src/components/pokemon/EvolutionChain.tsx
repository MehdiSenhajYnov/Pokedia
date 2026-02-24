import { Link } from "react-router-dom";
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

  const nodeKeys = new Map<string, number>();
  collectNodeKeys(chain, nodeKeys);

  const formsByNodeId = new Map<number, PokemonSummary[]>();
  if (alternateForms) {
    for (const form of alternateForms) {
      let matchedNodeId: number | null = null;

      if (form.species_id !== null && nodeKeys.has(findKeyById(nodeKeys, form.species_id))) {
        matchedNodeId = form.species_id;
      }

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

function collectNodeKeys(node: EvolutionNode, map: Map<string, number>) {
  if (node.pokemon_id !== null) {
    map.set(node.name_key, node.pokemon_id);
  }
  for (const child of node.evolves_to) {
    collectNodeKeys(child, map);
  }
}

function findKeyById(map: Map<string, number>, id: number): string {
  for (const [key, val] of map) {
    if (val === id) return key;
  }
  return "";
}

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
        "flex flex-col items-center gap-1 rounded-2xl glass border p-3 transition-all hover:shadow-warm min-w-[80px]",
        isCurrent ? "ring-2 ring-primary glow-primary border-primary/40" : "border-border/30",
      )}
    >
      <PokemonSprite
        src={node.sprite_url}
        pokemonId={node.pokemon_id ?? undefined}
        alt={name}
        className="h-14 w-14 hover:-translate-y-1 hover:scale-110 transition-transform"
      />
      <span className="font-heading text-xs font-medium text-center">{name}</span>
    </Link>
  );
}

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
        "flex flex-col items-center gap-1 rounded-2xl glass border border-dashed p-3 transition-all hover:shadow-warm min-w-[80px]",
        isCurrent ? "ring-2 ring-primary glow-primary border-primary/40" : "border-purple-400/30",
      )}
    >
      <PokemonSprite
        src={form.sprite_url}
        pokemonId={form.id}
        alt={name}
        className="h-14 w-14 hover:-translate-y-1 hover:scale-110 transition-transform"
      />
      <span className="font-heading text-xs font-medium text-center">{name}</span>
    </Link>
  );
}

function ArrowWithLabel({ trigger, detail }: { trigger: string | null; detail: string | null }) {
  const label = formatTrigger(trigger, detail);
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1">
      {/* SVG arrow line */}
      <svg width="32" height="16" viewBox="0 0 32 16" className="text-muted-foreground">
        <line x1="0" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <polygon points="24,4 32,8 24,12" fill="currentColor" />
      </svg>
      {label && (
        <span className="max-w-[80px] text-center font-heading text-[10px] leading-tight text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

function FormArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1">
      <svg width="28" height="14" viewBox="0 0 28 14" className="text-purple-400/50">
        <line x1="0" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
        <polygon points="20,3.5 28,7 20,10.5" fill="currentColor" />
      </svg>
      <span className="max-w-[80px] text-center text-[9px] leading-tight text-muted-foreground/60 italic">
        {label}
      </span>
    </div>
  );
}

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

  if (totalBranches === 0) {
    return <NodeCard node={node} currentId={currentId} />;
  }

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

  if (forms.length === 1 && children.length === 0) {
    return (
      <div className="flex items-center gap-1">
        <NodeCard node={node} currentId={currentId} />
        <FormArrow label={getFormLabel(forms[0].name_key) ?? "Form"} />
        <FormCard form={forms[0]} currentId={currentId} />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1">
      <div className="flex items-center self-center">
        <NodeCard node={node} currentId={currentId} />
      </div>
      <div className="flex flex-col gap-2 justify-center">
        {children.map((child, idx) => (
          <div key={child.pokemon_id ?? `evo-${idx}`} className="flex items-center gap-1">
            <ArrowWithLabel trigger={child.trigger} detail={child.trigger_detail} />
            <BranchNode node={child} currentId={currentId} formsBySpecies={formsBySpecies} />
          </div>
        ))}
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
