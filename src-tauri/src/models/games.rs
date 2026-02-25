use serde::{Deserialize, Serialize};

/// Summary of a registered game (hackrom or official).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct GameSummary {
    pub id: String,
    pub name_en: String,
    pub name_fr: Option<String>,
    pub base_rom: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    pub is_hackrom: i64,
    pub sort_order: i64,
    pub coverage: String,
}

/// Move override for a specific game.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct GameMoveOverride {
    pub game_id: String,
    pub move_name_key: String,
    pub power: Option<i64>,
    pub accuracy: Option<i64>,
    pub type_key: Option<String>,
    pub pp: Option<i64>,
    pub damage_class: Option<String>,
    pub effect_en: Option<String>,
}

// ── JSON import structs (deserialized from hackrom JSON files) ──────

#[derive(Debug, Clone, Deserialize)]
pub struct GameDataFile {
    pub game: GameMeta,
    pub pokemon_overrides: Vec<PokemonOverride>,
    #[serde(default)]
    pub move_overrides: Vec<MoveOverrideEntry>,
    #[serde(default)]
    pub item_locations: Vec<ItemLocationEntry>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GameMeta {
    pub id: String,
    pub name_en: String,
    pub name_fr: Option<String>,
    pub base_rom: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    #[serde(default)]
    pub is_hackrom: bool,
    #[serde(default)]
    pub sort_order: i64,
    #[serde(default = "default_coverage")]
    pub coverage: String,
}

fn default_coverage() -> String {
    "full".to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct PokemonOverride {
    pub name_key: String,
    #[serde(default)]
    pub learnset: Vec<LearnsetEntry>,
    #[serde(default)]
    pub abilities: Vec<AbilityOverrideEntry>,
    pub evolution_method: Option<String>,
    #[serde(default)]
    pub locations: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LearnsetEntry {
    pub move_name_key: String,
    pub learn_method: String,
    #[serde(default)]
    pub level: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AbilityOverrideEntry {
    pub ability_key: String,
    pub slot: i64,
    #[serde(default)]
    pub is_hidden: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MoveOverrideEntry {
    pub name_key: String,
    pub power: Option<i64>,
    pub accuracy: Option<i64>,
    pub type_key: Option<String>,
    pub pp: Option<i64>,
    pub damage_class: Option<String>,
    pub effect_en: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ItemLocationEntry {
    pub name_key: String,
    pub locations: Vec<String>,
}
