import { ALL_TYPES, type PokemonTypeName } from "./constants";

// Type efficacy chart: attackingType -> defendingType -> damage factor
// 0 = immune, 0.5 = not very effective, 1 = normal, 2 = super effective
const EFFICACY: Record<PokemonTypeName, Partial<Record<PokemonTypeName, number>>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, poison: 0.5, fighting: 2, dragon: 2, dark: 2, steel: 0.5 },
};

/** Get damage factor for a single attacking type vs a single defending type */
export function getTypeFactor(attacking: PokemonTypeName, defending: PokemonTypeName): number {
  return EFFICACY[attacking]?.[defending] ?? 1;
}

/** Get damage factor for an attacking type vs a dual-type defender */
export function getDualTypeFactor(
  attacking: PokemonTypeName,
  type1: PokemonTypeName,
  type2?: PokemonTypeName | null
): number {
  const factor1 = getTypeFactor(attacking, type1);
  const factor2 = type2 ? getTypeFactor(attacking, type2) : 1;
  return factor1 * factor2;
}

/** Get all defensive matchups for a type combination */
export function getDefensiveMatchups(
  type1: PokemonTypeName,
  type2?: PokemonTypeName | null
): Record<number, PokemonTypeName[]> {
  const result: Record<number, PokemonTypeName[]> = {
    0: [],
    0.25: [],
    0.5: [],
    1: [],
    2: [],
    4: [],
  };

  for (const attackingType of ALL_TYPES) {
    const factor = getDualTypeFactor(attackingType, type1, type2);
    if (result[factor]) {
      result[factor].push(attackingType);
    }
  }

  return result;
}
