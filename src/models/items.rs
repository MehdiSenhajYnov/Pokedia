use serde::{Deserialize, Serialize};

/// Item for list views.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ItemSummary {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub category: Option<String>,
    pub effect_en: Option<String>,
    pub effect_fr: Option<String>,
    pub sprite_url: Option<String>,
}

/// Full item data for detail views (same fields, separate type for clarity).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ItemDetail {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub category: Option<String>,
    pub effect_en: Option<String>,
    pub effect_fr: Option<String>,
    pub sprite_url: Option<String>,
}
