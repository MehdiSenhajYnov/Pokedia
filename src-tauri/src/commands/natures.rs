use crate::models::NatureSummary;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_all_natures(
    state: State<'_, AppState>,
) -> Result<Vec<NatureSummary>, String> {
    let rows: Vec<NatureSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, increased_stat, decreased_stat, likes_flavor, hates_flavor
         FROM natures ORDER BY id",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}
