use crate::models::ItemSummary;
use crate::AppState;
use tauri::State;

/// Get all items (ordered by ID).
#[tauri::command]
pub async fn get_all_items(
    state: State<'_, AppState>,
) -> Result<Vec<ItemSummary>, String> {
    let rows: Vec<ItemSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, category, effect_en, effect_fr, sprite_url
         FROM items ORDER BY id"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Search items by name (supports partial matching).
#[tauri::command]
pub async fn search_items(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<ItemSummary>, String> {
    let pattern = format!("%{}%", query.to_lowercase());

    let rows: Vec<ItemSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, category, effect_en, effect_fr, sprite_url
         FROM items
         WHERE LOWER(name_key) LIKE ?1
            OR LOWER(name_en) LIKE ?1
            OR LOWER(name_fr) LIKE ?1
         ORDER BY id
         LIMIT 50"
    )
    .bind(&pattern)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}
