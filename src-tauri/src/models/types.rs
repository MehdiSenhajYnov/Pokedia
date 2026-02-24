use serde::{Deserialize, Serialize};

/// A pokemon type (fire, water, etc.).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TypeEntry {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
}

/// Type effectiveness entry.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TypeEfficacy {
    pub attacking_type_id: i64,
    pub defending_type_id: i64,
    pub damage_factor: i64,
}
