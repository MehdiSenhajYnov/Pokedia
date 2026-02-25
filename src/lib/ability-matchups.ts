import { ALL_TYPES, type PokemonTypeName } from "./constants";
import { getDualTypeFactor } from "./type-chart";

// ── Types ────────────────────────────────────────────────────────────

interface TypeModifier {
  attackingType: PokemonTypeName;
  kind: "immunity" | "multiply";
  /** For immunity → factor becomes 0. For multiply → base factor × value. */
  value: number;
}

interface GlobalModifier {
  kind: "wonder-guard" | "reduce-super-effective";
  /** For reduce-super-effective: multiplier applied to SE hits (e.g. 0.75). */
  value?: number;
}

export interface AbilityMatchupEffect {
  labelEn: string;
  labelFr: string;
  typeModifiers: TypeModifier[];
  globalModifier?: GlobalModifier;
}

// ── Ability mapping ──────────────────────────────────────────────────

export const ABILITY_MATCHUP_EFFECTS: Record<string, AbilityMatchupEffect> = {
  // Immunities
  levitate: {
    labelEn: "Levitate grants Ground immunity",
    labelFr: "Lévitation confère l'immunité Sol",
    typeModifiers: [{ attackingType: "ground", kind: "immunity", value: 0 }],
  },
  "flash-fire": {
    labelEn: "Flash Fire grants Fire immunity",
    labelFr: "Torche confère l'immunité Feu",
    typeModifiers: [{ attackingType: "fire", kind: "immunity", value: 0 }],
  },
  "water-absorb": {
    labelEn: "Water Absorb grants Water immunity",
    labelFr: "Absorb Eau confère l'immunité Eau",
    typeModifiers: [{ attackingType: "water", kind: "immunity", value: 0 }],
  },
  "volt-absorb": {
    labelEn: "Volt Absorb grants Electric immunity",
    labelFr: "Absorb Volt confère l'immunité Électrik",
    typeModifiers: [{ attackingType: "electric", kind: "immunity", value: 0 }],
  },
  "lightning-rod": {
    labelEn: "Lightning Rod grants Electric immunity",
    labelFr: "Paratonnerre confère l'immunité Électrik",
    typeModifiers: [{ attackingType: "electric", kind: "immunity", value: 0 }],
  },
  "motor-drive": {
    labelEn: "Motor Drive grants Electric immunity",
    labelFr: "Motorisé confère l'immunité Électrik",
    typeModifiers: [{ attackingType: "electric", kind: "immunity", value: 0 }],
  },
  "sap-sipper": {
    labelEn: "Sap Sipper grants Grass immunity",
    labelFr: "Herbivore confère l'immunité Plante",
    typeModifiers: [{ attackingType: "grass", kind: "immunity", value: 0 }],
  },
  "storm-drain": {
    labelEn: "Storm Drain grants Water immunity",
    labelFr: "Lavabo confère l'immunité Eau",
    typeModifiers: [{ attackingType: "water", kind: "immunity", value: 0 }],
  },
  "well-baked-body": {
    labelEn: "Well-Baked Body grants Fire immunity",
    labelFr: "Bien Cuit confère l'immunité Feu",
    typeModifiers: [{ attackingType: "fire", kind: "immunity", value: 0 }],
  },
  "earth-eater": {
    labelEn: "Earth Eater grants Ground immunity",
    labelFr: "Géophagie confère l'immunité Sol",
    typeModifiers: [{ attackingType: "ground", kind: "immunity", value: 0 }],
  },

  // Mixed: immunity + weakness amplification
  "dry-skin": {
    labelEn: "Dry Skin grants Water immunity but increases Fire damage by 25%",
    labelFr: "Peau Sèche confère l'immunité Eau mais augmente les dégâts Feu de 25%",
    typeModifiers: [
      { attackingType: "water", kind: "immunity", value: 0 },
      { attackingType: "fire", kind: "multiply", value: 1.25 },
    ],
  },

  // Resistances (0.5x multiplier on specific types)
  "thick-fat": {
    labelEn: "Thick Fat halves Fire and Ice damage",
    labelFr: "Isograisse divise par 2 les dégâts Feu et Glace",
    typeModifiers: [
      { attackingType: "fire", kind: "multiply", value: 0.5 },
      { attackingType: "ice", kind: "multiply", value: 0.5 },
    ],
  },
  heatproof: {
    labelEn: "Heatproof halves Fire damage",
    labelFr: "Ignifugé divise par 2 les dégâts Feu",
    typeModifiers: [{ attackingType: "fire", kind: "multiply", value: 0.5 }],
  },
  "water-bubble": {
    labelEn: "Water Bubble halves Fire damage",
    labelFr: "Hydrobulle divise par 2 les dégâts Feu",
    typeModifiers: [{ attackingType: "fire", kind: "multiply", value: 0.5 }],
  },
  "purifying-salt": {
    labelEn: "Purifying Salt halves Ghost damage",
    labelFr: "Sel Purificateur divise par 2 les dégâts Spectre",
    typeModifiers: [{ attackingType: "ghost", kind: "multiply", value: 0.5 }],
  },

  // Global modifiers
  "wonder-guard": {
    labelEn: "Wonder Guard blocks all non-super-effective moves",
    labelFr: "Garde Mystik bloque toutes les attaques non super efficaces",
    typeModifiers: [],
    globalModifier: { kind: "wonder-guard" },
  },
  filter: {
    labelEn: "Filter reduces super-effective damage by 25%",
    labelFr: "Filtre réduit les dégâts super efficaces de 25%",
    typeModifiers: [],
    globalModifier: { kind: "reduce-super-effective", value: 0.75 },
  },
  "solid-rock": {
    labelEn: "Solid Rock reduces super-effective damage by 25%",
    labelFr: "Solide Roc réduit les dégâts super efficaces de 25%",
    typeModifiers: [],
    globalModifier: { kind: "reduce-super-effective", value: 0.75 },
  },
  "prism-armor": {
    labelEn: "Prism Armor reduces super-effective damage by 25%",
    labelFr: "Prisme-Armure réduit les dégâts super efficaces de 25%",
    typeModifiers: [],
    globalModifier: { kind: "reduce-super-effective", value: 0.75 },
  },
};

// ── Adjusted matchup computation ─────────────────────────────────────

export interface ModifiedTypeInfo {
  oldFactor: number;
  newFactor: number;
}

export interface AbilityAdjustedResult {
  matchups: Record<number, PokemonTypeName[]>;
  modifiedTypes: Map<PokemonTypeName, ModifiedTypeInfo>;
}

export function getAbilityAdjustedMatchups(
  type1: PokemonTypeName,
  type2: PokemonTypeName | null | undefined,
  abilityKey: string,
): AbilityAdjustedResult {
  const effect = ABILITY_MATCHUP_EFFECTS[abilityKey];
  const modifiedTypes = new Map<PokemonTypeName, ModifiedTypeInfo>();
  const buckets: Record<number, PokemonTypeName[]> = {};

  for (const atkType of ALL_TYPES) {
    let factor = getDualTypeFactor(atkType, type1, type2);
    const baseFactor = factor;

    if (effect) {
      // Apply per-type modifiers
      for (const mod of effect.typeModifiers) {
        if (mod.attackingType === atkType) {
          if (mod.kind === "immunity") {
            factor = 0;
          } else {
            factor *= mod.value;
          }
        }
      }

      // Apply global modifiers
      if (effect.globalModifier) {
        const gm = effect.globalModifier;
        if (gm.kind === "wonder-guard") {
          if (factor <= 1) factor = 0;
        } else if (gm.kind === "reduce-super-effective") {
          if (factor > 1) factor *= gm.value!;
        }
      }
    }

    // Track modifications (only when bucket actually changes)
    if (factor !== baseFactor) {
      modifiedTypes.set(atkType, { oldFactor: baseFactor, newFactor: factor });
    }

    if (!buckets[factor]) buckets[factor] = [];
    buckets[factor].push(atkType);
  }

  return { matchups: buckets, modifiedTypes };
}
