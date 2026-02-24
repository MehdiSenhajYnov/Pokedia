use crate::models::{AbilitySummary, AbilityDetail, AbilityPokemonEntry};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_all_abilities(
    state: State<'_, AppState>,
) -> Result<Vec<AbilitySummary>, String> {
    let rows: Vec<AbilitySummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, short_effect_en, short_effect_fr, generation
         FROM abilities ORDER BY id",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub async fn get_ability_by_id(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Option<AbilityDetail>, String> {
    let row: Option<AbilityDetail> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, effect_en, effect_fr, short_effect_en, short_effect_fr, generation
         FROM abilities WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(row)
}

#[tauri::command]
pub async fn search_abilities(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<AbilitySummary>, String> {
    let pattern = format!("%{}%", query.to_lowercase());

    let rows: Vec<AbilitySummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, short_effect_en, short_effect_fr, generation
         FROM abilities
         WHERE LOWER(name_key) LIKE ?1
            OR LOWER(name_en) LIKE ?1
            OR LOWER(name_fr) LIKE ?1
         ORDER BY id
         LIMIT 50",
    )
    .bind(&pattern)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub async fn get_ability_pokemon(
    state: State<'_, AppState>,
    ability_id: i64,
) -> Result<Vec<AbilityPokemonEntry>, String> {
    let rows: Vec<AbilityPokemonEntry> = sqlx::query_as(
        "SELECT p.id AS pokemon_id, p.name_key, p.name_en, p.name_fr, p.type1_key, p.type2_key, p.sprite_url, ap.is_hidden
         FROM ability_pokemon ap
         JOIN pokemon p ON p.id = ap.pokemon_id
         WHERE ap.ability_id = ?1
         ORDER BY p.id",
    )
    .bind(ability_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}
