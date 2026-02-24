use sqlx::SqlitePool;

use crate::api::types::{ParsedType, ParsedTypeEfficacy};

/// Upsert a type record.
pub async fn upsert_type(pool: &SqlitePool, t: &ParsedType) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO types (id, name_key, name_en, name_fr)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET
           name_key = excluded.name_key,
           name_en = excluded.name_en,
           name_fr = excluded.name_fr"
    )
    .bind(t.id)
    .bind(&t.name_key)
    .bind(&t.name_en)
    .bind(&t.name_fr)
    .execute(pool)
    .await?;

    Ok(())
}

/// Upsert a type efficacy record.
pub async fn upsert_type_efficacy(
    pool: &SqlitePool,
    te: &ParsedTypeEfficacy,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO type_efficacy (attacking_type_id, defending_type_id, damage_factor)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(attacking_type_id, defending_type_id) DO UPDATE SET
           damage_factor = excluded.damage_factor"
    )
    .bind(te.attacking_type_id)
    .bind(te.defending_type_id)
    .bind(te.damage_factor)
    .execute(pool)
    .await?;

    Ok(())
}
