// ── Pokemon ──────────────────────────────────────────────────────

export interface PokemonSummary {
  id: number;
  name_key: string;
  name_en: string | null;
  name_fr: string | null;
  type1_key: string | null;
  type2_key: string | null;
  hp: number | null;
  atk: number | null;
  def: number | null;
  spa: number | null;
  spd: number | null;
  spe: number | null;
  base_stat_total: number | null;
  sprite_url: string | null;
}

export interface PokemonDetail {
  id: number;
  name_key: string;
  name_en: string | null;
  name_fr: string | null;
  type1_key: string | null;
  type2_key: string | null;
  hp: number | null;
  atk: number | null;
  def: number | null;
  spa: number | null;
  spd: number | null;
  spe: number | null;
  base_stat_total: number | null;
  sprite_url: string | null;
  evolution_chain_id: number | null;
  description_en: string | null;
  description_fr: string | null;
  height: number | null;
  weight: number | null;
}

export interface PokemonAbility {
  pokemon_id: number;
  ability_key: string;
  ability_en: string | null;
  ability_fr: string | null;
  is_hidden: number; // 0 or 1 (SQLite integer)
  slot: number;
}

export interface PokemonMoveEntry {
  pokemon_id: number;
  move_id: number;
  learn_method: string;
  level_learned_at: number;
  name_key: string | null;
  name_en: string | null;
  name_fr: string | null;
  type_key: string | null;
  damage_class: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface EvolutionNode {
  pokemon_id: number | null;
  name_key: string;
  name_en: string | null;
  name_fr: string | null;
  sprite_url: string | null;
  trigger: string | null;
  trigger_detail: string | null;
  evolves_to: EvolutionNode[];
}

// ── Moves ────────────────────────────────────────────────────────

export interface MoveSummary {
  id: number;
  name_key: string;
  name_en: string | null;
  name_fr: string | null;
  type_key: string | null;
  damage_class: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveDetail {
  id: number;
  name_key: string;
  name_en: string | null;
  name_fr: string | null;
  type_key: string | null;
  damage_class: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number | null;
  effect_en: string | null;
  effect_fr: string | null;
}

// ── Items ────────────────────────────────────────────────────────

export interface ItemSummary {
  id: number;
  name_key: string;
  name_en: string | null;
  name_fr: string | null;
  category: string | null;
  effect_en: string | null;
  effect_fr: string | null;
  sprite_url: string | null;
}

// ── Types ────────────────────────────────────────────────────────

export interface TypeEntry {
  id: number;
  name_key: string;
  name_en: string | null;
  name_fr: string | null;
}

export interface TypeEfficacy {
  attacking_type_id: number;
  defending_type_id: number;
  damage_factor: number;
}

// ── Sync ─────────────────────────────────────────────────────────

export interface SyncStatus {
  is_syncing: boolean;
  resources: SyncResourceStatus[];
}

export interface SyncResourceStatus {
  resource: string;
  total: number;
  completed: number;
  status: string;
  error: string | null;
}

// ── Settings ─────────────────────────────────────────────────────

export interface AppSettings {
  lang_pokemon_names: string;
  lang_move_names: string;
  lang_item_names: string;
  lang_descriptions: string;
  theme: string;
}
