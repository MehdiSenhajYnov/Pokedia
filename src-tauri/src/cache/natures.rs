use sqlx::SqlitePool;

use crate::api::natures::ParsedNature;

pub async fn upsert_nature(pool: &SqlitePool, nature: &ParsedNature) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO natures (id, name_key, name_en, name_fr, increased_stat, decreased_stat, likes_flavor, hates_flavor)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
           name_key = excluded.name_key,
           name_en = excluded.name_en,
           name_fr = excluded.name_fr,
           increased_stat = excluded.increased_stat,
           decreased_stat = excluded.decreased_stat,
           likes_flavor = excluded.likes_flavor,
           hates_flavor = excluded.hates_flavor"
    )
    .bind(nature.id)
    .bind(&nature.name_key)
    .bind(&nature.name_en)
    .bind(&nature.name_fr)
    .bind(&nature.increased_stat)
    .bind(&nature.decreased_stat)
    .bind(&nature.likes_flavor)
    .bind(&nature.hates_flavor)
    .execute(pool)
    .await?;

    Ok(())
}
