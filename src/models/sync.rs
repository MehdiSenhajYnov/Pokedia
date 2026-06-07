use serde::{Deserialize, Serialize};

/// Overall imported-data status.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub is_syncing: bool,
    pub resources: Vec<SyncResourceStatus>,
}

/// Status of a single resource sync (e.g., "pokemon", "moves").
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncResourceStatus {
    pub resource: String,
    pub total: i64,
    pub completed: i64,
    pub status: String,
    pub error: Option<String>,
}
