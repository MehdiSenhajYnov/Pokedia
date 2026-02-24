use serde::{Deserialize, Serialize};

/// Lightweight pokemon for list views (includes stats for comparison/sorting).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PokemonSummary {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub type1_key: Option<String>,
    pub type2_key: Option<String>,
    pub hp: Option<i64>,
    pub atk: Option<i64>,
    pub def: Option<i64>,
    pub spa: Option<i64>,
    pub spd: Option<i64>,
    pub spe: Option<i64>,
    pub base_stat_total: Option<i64>,
    pub sprite_url: Option<String>,
}

/// Full pokemon detail including stats, abilities, description.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PokemonDetail {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub type1_key: Option<String>,
    pub type2_key: Option<String>,
    pub hp: Option<i64>,
    pub atk: Option<i64>,
    pub def: Option<i64>,
    pub spa: Option<i64>,
    pub spd: Option<i64>,
    pub spe: Option<i64>,
    pub base_stat_total: Option<i64>,
    pub sprite_url: Option<String>,
    pub evolution_chain_id: Option<i64>,
    pub description_en: Option<String>,
    pub description_fr: Option<String>,
    pub height: Option<i64>,
    pub weight: Option<i64>,
}

/// A pokemon's ability.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PokemonAbility {
    pub pokemon_id: i64,
    pub ability_key: String,
    pub ability_en: Option<String>,
    pub ability_fr: Option<String>,
    pub is_hidden: i64,
    pub slot: i64,
}

/// An entry in a pokemon's move learnset.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PokemonMoveEntry {
    pub pokemon_id: i64,
    pub move_id: i64,
    pub learn_method: String,
    pub level_learned_at: i64,
    // Joined move fields
    pub name_key: Option<String>,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub type_key: Option<String>,
    pub damage_class: Option<String>,
    pub power: Option<i64>,
    pub accuracy: Option<i64>,
    pub pp: Option<i64>,
}

/// A node in an evolution tree (recursive, not FromRow).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvolutionNode {
    pub pokemon_id: Option<i64>,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub sprite_url: Option<String>,
    pub trigger: Option<String>,
    pub trigger_detail: Option<String>,
    pub evolves_to: Vec<EvolutionNode>,
}
