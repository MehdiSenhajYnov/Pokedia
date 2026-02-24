use sqlx::SqlitePool;

use crate::api::items::ParsedItem;

/// Upsert an item record.
pub async fn upsert_item(pool: &SqlitePool, item: &ParsedItem) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO items (id, name_key, name_en, name_fr, category, effect_en, effect_fr, sprite_url)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
           name_key = excluded.name_key,
           name_en = excluded.name_en,
           name_fr = excluded.name_fr,
           category = excluded.category,
           effect_en = excluded.effect_en,
           effect_fr = excluded.effect_fr,
           sprite_url = excluded.sprite_url"
    )
    .bind(item.id)
    .bind(&item.name_key)
    .bind(&item.name_en)
    .bind(&item.name_fr)
    .bind(&item.category)
    .bind(&item.effect_en)
    .bind(&item.effect_fr)
    .bind(&item.sprite_url)
    .execute(pool)
    .await?;

    Ok(())
}
