import type { PokemonSummary } from "@/types";

/** Minimal fields needed for base-form inference. */
type PokemonLike = Pick<PokemonSummary, "id" | "name_key" | "species_id">;

/**
 * Get the base form ID for a pokemon (for sorting/grouping).
 * Uses species_id if available, otherwise infers from name_key
 * by finding the longest prefix that matches another pokemon with a lower ID.
 */
export function getBaseId(
  p: PokemonLike,
  nameToId: Map<string, number>,
): number {
  if (p.species_id != null) return p.species_id;

  const parts = p.name_key.split("-");
  for (let len = parts.length - 1; len >= 1; len--) {
    const prefix = parts.slice(0, len).join("-");
    const baseId = nameToId.get(prefix);
    if (baseId != null && baseId < p.id) return baseId;
  }

  return p.id;
}

/** Whether a pokemon is an alternate form (not a base form). */
export function isAlternateForm(
  p: PokemonLike,
  nameToId: Map<string, number>,
): boolean {
  return getBaseId(p, nameToId) !== p.id;
}

/** Build a name_key → lowest-id lookup map from a pokemon list. */
export function buildNameToIdMap(
  allPokemon: PokemonSummary[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of allPokemon) {
    if (!map.has(p.name_key) || p.id < map.get(p.name_key)!) {
      map.set(p.name_key, p.id);
    }
  }
  return map;
}

/** Sort pokemon by Pokédex order: base forms grouped with their alternates. */
export function sortByPokedex(
  pokemon: PokemonSummary[],
  nameToId: Map<string, number>,
): PokemonSummary[] {
  return [...pokemon].sort((a, b) => {
    const specA = getBaseId(a, nameToId);
    const specB = getBaseId(b, nameToId);
    if (specA !== specB) return specA - specB;
    // Base form first (lower ID), then alternates
    return a.id - b.id;
  });
}

/**
 * Derive a human-readable form label from the name_key suffix.
 * Returns null for base forms (no suffix detected).
 */
export function getFormLabel(nameKey: string): string | null {
  const suffix = nameKey.toLowerCase();

  if (suffix.includes("-mega-x")) return "Mega X";
  if (suffix.includes("-mega-y")) return "Mega Y";
  if (suffix.includes("-mega")) return "Mega";
  if (suffix.includes("-gmax")) return "Gigantamax";
  if (suffix.includes("-alola")) return "Alolan";
  if (suffix.includes("-galar")) return "Galarian";
  if (suffix.includes("-hisui")) return "Hisuian";
  if (suffix.includes("-paldea")) return "Paldean";
  if (suffix.includes("-primal")) return "Primal";
  if (suffix.includes("-origin")) return "Origin";
  if (suffix.includes("-therian")) return "Therian";
  if (suffix.includes("-incarnate")) return "Incarnate";
  if (suffix.includes("-black")) return "Black";
  if (suffix.includes("-white")) return "White";
  if (suffix.includes("-ash")) return "Ash";
  if (suffix.includes("-totem")) return "Totem";
  if (suffix.includes("-starter")) return "Starter";
  if (suffix.includes("-eternamax")) return "Eternamax";

  // Check if there's a suffix at all
  const parts = nameKey.split("-");
  if (parts.length <= 1) return null;

  // For known base forms that include dashes (mr-mime, ho-oh, etc.), don't treat as alternate
  const knownDashNames = [
    "mr-mime", "mr-rime", "ho-oh", "porygon-z", "type-null",
    "tapu-koko", "tapu-lele", "tapu-bulu", "tapu-fini",
    "chi-yu", "chien-pao", "ting-lu", "wo-chien",
    "great-tusk", "scream-tail", "brute-bonnet", "flutter-mane",
    "slither-wing", "sandy-shocks", "iron-treads", "iron-bundle",
    "iron-hands", "iron-jugulis", "iron-moth", "iron-thorns",
    "iron-valiant", "iron-leaves", "iron-boulder", "iron-crown",
    "roaring-moon", "walking-wake", "gouging-fire", "raging-bolt",
    "nidoran-f", "nidoran-m", "mime-jr",
  ];
  if (knownDashNames.includes(nameKey)) return null;

  // Fallback: capitalize the suffix portion
  const baseName = parts[0];
  const formParts = nameKey.slice(baseName.length + 1);
  if (formParts) {
    return formParts
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return null;
}

/**
 * Format a pokemon ID for display.
 * Uses the base form ID and pads to 3+ digits.
 */
export function formatPokedexId(
  p: PokemonSummary,
  nameToId: Map<string, number>,
): string {
  const baseId = getBaseId(p, nameToId);
  return `#${String(baseId).padStart(3, "0")}`;
}
