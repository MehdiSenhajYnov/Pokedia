use crate::models::{TypeEfficacy, TypeEntry};
use crate::AppState;
use tauri::State;

/// Get all types.
#[tauri::command]
pub async fn get_all_types(
    state: State<'_, AppState>,
) -> Result<Vec<TypeEntry>, String> {
    let rows: Vec<TypeEntry> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr FROM types ORDER BY id"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Get the full type efficacy matrix.
#[tauri::command]
pub async fn get_type_efficacy(
    state: State<'_, AppState>,
) -> Result<Vec<TypeEfficacy>, String> {
    let rows: Vec<TypeEfficacy> = sqlx::query_as(
        "SELECT attacking_type_id, defending_type_id, damage_factor
         FROM type_efficacy
         ORDER BY attacking_type_id, defending_type_id"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}
