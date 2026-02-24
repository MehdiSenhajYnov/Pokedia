use tauri::State;

use crate::AppState;

#[tauri::command]
pub async fn toggle_favorite(
    pokemon_id: i64,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let pool = &state.pool;

    // Check if already favorited
    let exists: Option<i64> = sqlx::query_scalar(
        "SELECT pokemon_id FROM favorites WHERE pokemon_id = ?1",
    )
    .bind(pokemon_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    if exists.is_some() {
        sqlx::query("DELETE FROM favorites WHERE pokemon_id = ?1")
            .bind(pokemon_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(false) // No longer favorited
    } else {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("INSERT INTO favorites (pokemon_id, added_at) VALUES (?1, ?2)")
            .bind(pokemon_id)
            .bind(&now)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(true) // Now favorited
    }
}

#[tauri::command]
pub async fn get_favorites(state: State<'_, AppState>) -> Result<Vec<i64>, String> {
    let pool = &state.pool;

    let ids: Vec<i64> = sqlx::query_scalar(
        "SELECT pokemon_id FROM favorites ORDER BY added_at DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(ids)
}
