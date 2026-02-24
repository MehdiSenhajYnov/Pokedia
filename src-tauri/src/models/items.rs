use serde::{Deserialize, Serialize};

/// Item for list views and detail.
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
