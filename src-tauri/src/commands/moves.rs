use crate::models::{MoveDetail, MovePokemonEntry, MoveSummary, PokemonMoveEntry};
use crate::AppState;
use tauri::State;

/// Get all moves (summary list, ordered by ID).
#[tauri::command]
pub async fn get_all_moves(
    state: State<'_, AppState>,
) -> Result<Vec<MoveSummary>, String> {
    let rows: Vec<MoveSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type_key, damage_class, power, accuracy, pp
         FROM moves ORDER BY id"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Get a single move by ID with full detail.
#[tauri::command]
pub async fn get_move_by_id(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Option<MoveDetail>, String> {
    let row: Option<MoveDetail> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type_key, damage_class,
                power, accuracy, pp, priority, effect_en, effect_fr
         FROM moves WHERE id = ?1"
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(row)
}

/// Search moves by name (supports partial matching).
#[tauri::command]
pub async fn search_moves(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<MoveSummary>, String> {
    let pattern = format!("%{}%", query.to_lowercase());

    let rows: Vec<MoveSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type_key, damage_class, power, accuracy, pp
         FROM moves
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

/// Get all pokemon that learn a specific move.
#[tauri::command]
pub async fn get_move_pokemon(
    state: State<'_, AppState>,
    move_id: i64,
) -> Result<Vec<MovePokemonEntry>, String> {
    let rows: Vec<MovePokemonEntry> = sqlx::query_as(
        "SELECT p.id AS pokemon_id, p.name_key, p.name_en, p.name_fr, p.type1_key, p.type2_key, p.sprite_url,
                pm.learn_method, pm.level_learned_at
         FROM pokemon_moves pm
         JOIN pokemon p ON p.id = pm.pokemon_id
         WHERE pm.move_id = ?1
         ORDER BY pm.learn_method, pm.level_learned_at, p.id"
    )
    .bind(move_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Get all moves for a specific pokemon (joined with move details).
#[tauri::command]
pub async fn get_pokemon_moves(
    state: State<'_, AppState>,
    pokemon_id: i64,
) -> Result<Vec<PokemonMoveEntry>, String> {
    let rows: Vec<PokemonMoveEntry> = sqlx::query_as(
        "SELECT pm.pokemon_id, pm.move_id, pm.learn_method, pm.level_learned_at,
                m.name_key, m.name_en, m.name_fr, m.type_key, m.damage_class,
                m.power, m.accuracy, m.pp
         FROM pokemon_moves pm
         JOIN moves m ON pm.move_id = m.id
         WHERE pm.pokemon_id = ?1
         ORDER BY pm.learn_method, pm.level_learned_at, m.name_key"
    )
    .bind(pokemon_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}
