use serde::{Deserialize, Serialize};

/// Lightweight move for list views.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MoveSummary {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub type_key: Option<String>,
    pub damage_class: Option<String>,
    pub power: Option<i64>,
    pub accuracy: Option<i64>,
    pub pp: Option<i64>,
}

/// Full move detail.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MoveDetail {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub type_key: Option<String>,
    pub damage_class: Option<String>,
    pub power: Option<i64>,
    pub accuracy: Option<i64>,
    pub pp: Option<i64>,
    pub priority: Option<i64>,
    pub effect_en: Option<String>,
    pub effect_fr: Option<String>,
}

/// Pokemon that learns a specific move.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MovePokemonEntry {
    pub pokemon_id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub type1_key: Option<String>,
    pub type2_key: Option<String>,
    pub sprite_url: Option<String>,
    pub learn_method: String,
    pub level_learned_at: i64,
}
