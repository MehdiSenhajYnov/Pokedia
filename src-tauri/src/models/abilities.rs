use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AbilitySummary {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub short_effect_en: Option<String>,
    pub short_effect_fr: Option<String>,
    pub generation: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AbilityDetail {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub effect_en: Option<String>,
    pub effect_fr: Option<String>,
    pub short_effect_en: Option<String>,
    pub short_effect_fr: Option<String>,
    pub generation: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AbilityPokemonEntry {
    pub pokemon_id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub type1_key: Option<String>,
    pub type2_key: Option<String>,
    pub sprite_url: Option<String>,
    pub is_hidden: i64,
}
