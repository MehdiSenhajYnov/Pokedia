use sqlx::SqlitePool;

use crate::models::EvolutionNode;

/// Upsert an evolution chain record (stores the tree as JSON).
pub async fn upsert_evolution_chain(
    pool: &SqlitePool,
    chain_id: i64,
    root: &EvolutionNode,
) -> Result<(), sqlx::Error> {
    let json = serde_json::to_string(root).unwrap_or_default();

    sqlx::query(
        "INSERT INTO evolution_chains (id, data)
         VALUES (?1, ?2)
         ON CONFLICT(id) DO UPDATE SET
           data = excluded.data"
    )
    .bind(chain_id)
    .bind(&json)
    .execute(pool)
    .await?;

    Ok(())
}

/// Retrieve an evolution chain by ID.
pub async fn get_evolution_chain(
    pool: &SqlitePool,
    chain_id: i64,
) -> Result<Option<EvolutionNode>, sqlx::Error> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT data FROM evolution_chains WHERE id = ?1"
    )
    .bind(chain_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.and_then(|(data,)| serde_json::from_str(&data).ok()))
}
