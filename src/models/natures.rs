use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct NatureSummary {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub increased_stat: Option<String>,
    pub decreased_stat: Option<String>,
    pub likes_flavor: Option<String>,
    pub hates_flavor: Option<String>,
}
