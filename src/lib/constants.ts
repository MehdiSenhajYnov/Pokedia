// ─── Pokemon type colors ────────────────────────────────────────────
// Colors based on the official Pokemon type palette, tuned for
// readability on both dark and light backgrounds.

export const TYPE_COLORS: Record<
  string,
  { bg: string; text: string; hex: string }
> = {
  normal:   { bg: "bg-[#9DA0AA]", text: "text-white",            hex: "#9DA0AA" },
  fire:     { bg: "bg-[#FF9741]", text: "text-white",            hex: "#FF9741" },
  water:    { bg: "bg-[#3692DC]", text: "text-white",            hex: "#3692DC" },
  electric: { bg: "bg-[#FBD100]", text: "text-gray-900",         hex: "#FBD100" },
  grass:    { bg: "bg-[#38BF4B]", text: "text-white",            hex: "#38BF4B" },
  ice:      { bg: "bg-[#4CD1C0]", text: "text-gray-900",         hex: "#4CD1C0" },
  fighting: { bg: "bg-[#E0306A]", text: "text-white",            hex: "#E0306A" },
  poison:   { bg: "bg-[#B567CE]", text: "text-white",            hex: "#B567CE" },
  ground:   { bg: "bg-[#E87236]", text: "text-white",            hex: "#E87236" },
  flying:   { bg: "bg-[#89AAE3]", text: "text-white",            hex: "#89AAE3" },
  psychic:  { bg: "bg-[#FF6675]", text: "text-white",            hex: "#FF6675" },
  bug:      { bg: "bg-[#83C300]", text: "text-white",            hex: "#83C300" },
  rock:     { bg: "bg-[#C8B686]", text: "text-gray-900",         hex: "#C8B686" },
  ghost:    { bg: "bg-[#4C6AB2]", text: "text-white",            hex: "#4C6AB2" },
  dragon:   { bg: "bg-[#006FC9]", text: "text-white",            hex: "#006FC9" },
  dark:     { bg: "bg-[#5B5466]", text: "text-white",            hex: "#5B5466" },
  steel:    { bg: "bg-[#5A8EA2]", text: "text-white",            hex: "#5A8EA2" },
  fairy:    { bg: "bg-[#FB89EB]", text: "text-gray-900",         hex: "#FB89EB" },
};

// ─── Ordered list of all types ──────────────────────────────────────

export const ALL_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type PokemonTypeName = (typeof ALL_TYPES)[number];

// ─── Hex color lookup (for inline styles) ────────────────────────────

export const TYPE_COLORS_HEX: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_COLORS).map(([k, v]) => [k, v.hex]),
);

// ─── Stat display names ─────────────────────────────────────────────

export const STAT_NAMES: Record<string, string> = {
  hp:  "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

// ─── Stat bar colors ────────────────────────────────────────────────
// Chosen for clear differentiation on both dark and light surfaces.

export const STAT_COLORS: Record<string, string> = {
  hp:  "#EF4444",
  atk: "#F97316",
  def: "#EAB308",
  spa: "#6366F1",
  spd: "#22C55E",
  spe: "#EC4899",
};
