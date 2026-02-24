// ─── Pokemon type colors ────────────────────────────────────────────
// Colors based on the official Pokemon type palette, tuned for
// readability on both dark and light backgrounds.

export const TYPE_COLORS: Record<
  string,
  { bg: string; text: string; hex: string; glow: string }
> = {
  normal:   { bg: "bg-[#9DA0AA]", text: "text-white",            hex: "#9DA0AA", glow: "rgba(157,160,170,0.3)" },
  fire:     { bg: "bg-[#FF9741]", text: "text-white",            hex: "#FF9741", glow: "rgba(255,151,65,0.3)" },
  water:    { bg: "bg-[#3692DC]", text: "text-white",            hex: "#3692DC", glow: "rgba(54,146,220,0.3)" },
  electric: { bg: "bg-[#FBD100]", text: "text-gray-900",         hex: "#FBD100", glow: "rgba(251,209,0,0.3)" },
  grass:    { bg: "bg-[#38BF4B]", text: "text-white",            hex: "#38BF4B", glow: "rgba(56,191,75,0.3)" },
  ice:      { bg: "bg-[#4CD1C0]", text: "text-gray-900",         hex: "#4CD1C0", glow: "rgba(76,209,192,0.3)" },
  fighting: { bg: "bg-[#E0306A]", text: "text-white",            hex: "#E0306A", glow: "rgba(224,48,106,0.3)" },
  poison:   { bg: "bg-[#B567CE]", text: "text-white",            hex: "#B567CE", glow: "rgba(181,103,206,0.3)" },
  ground:   { bg: "bg-[#E87236]", text: "text-white",            hex: "#E87236", glow: "rgba(232,114,54,0.3)" },
  flying:   { bg: "bg-[#89AAE3]", text: "text-white",            hex: "#89AAE3", glow: "rgba(137,170,227,0.3)" },
  psychic:  { bg: "bg-[#FF6675]", text: "text-white",            hex: "#FF6675", glow: "rgba(255,102,117,0.3)" },
  bug:      { bg: "bg-[#83C300]", text: "text-white",            hex: "#83C300", glow: "rgba(131,195,0,0.3)" },
  rock:     { bg: "bg-[#C8B686]", text: "text-gray-900",         hex: "#C8B686", glow: "rgba(200,182,134,0.3)" },
  ghost:    { bg: "bg-[#4C6AB2]", text: "text-white",            hex: "#4C6AB2", glow: "rgba(76,106,178,0.3)" },
  dragon:   { bg: "bg-[#006FC9]", text: "text-white",            hex: "#006FC9", glow: "rgba(0,111,201,0.3)" },
  dark:     { bg: "bg-[#5B5466]", text: "text-white",            hex: "#5B5466", glow: "rgba(91,84,102,0.3)" },
  steel:    { bg: "bg-[#5A8EA2]", text: "text-white",            hex: "#5A8EA2", glow: "rgba(90,142,162,0.3)" },
  fairy:    { bg: "bg-[#FB89EB]", text: "text-gray-900",         hex: "#FB89EB", glow: "rgba(251,137,235,0.3)" },
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
