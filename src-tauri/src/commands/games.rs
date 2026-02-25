use crate::models::games::{GameDataFile, GameMoveOverride, GameSummary};
use crate::models::{PokemonAbility, PokemonMoveEntry};
use crate::AppState;
use tauri::State;

/// Get all registered games (hackroms + officials), sorted by sort_order.
#[tauri::command]
pub async fn get_all_games(
    state: State<'_, AppState>,
) -> Result<Vec<GameSummary>, String> {
    let rows: Vec<GameSummary> = sqlx::query_as(
        "SELECT id, name_en, name_fr, base_rom, version, author, is_hackrom, sort_order, coverage
         FROM games ORDER BY sort_order, name_en"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Get the coverage type of a game.
#[tauri::command]
pub async fn get_game_coverage(
    state: State<'_, AppState>,
    game_id: String,
) -> Result<String, String> {
    let coverage: Option<String> = sqlx::query_scalar(
        "SELECT coverage FROM games WHERE id = ?1"
    )
    .bind(&game_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(coverage.unwrap_or_else(|| "full".to_string()))
}

/// Get pokemon moves for a specific game, joined with move details.
/// Returns the same PokemonMoveEntry format as get_pokemon_moves, with
/// COALESCE for move overrides.
#[tauri::command]
pub async fn get_game_pokemon_moves(
    state: State<'_, AppState>,
    game_id: String,
    pokemon_name_key: String,
) -> Result<Vec<PokemonMoveEntry>, String> {
    let rows: Vec<PokemonMoveEntry> = sqlx::query_as(
        "SELECT
           0 AS pokemon_id,
           COALESCE(m.id, 0) AS move_id,
           gpm.learn_method,
           gpm.level_learned_at,
           gpm.move_name_key AS name_key,
           m.name_en,
           m.name_fr,
           COALESCE(gmo.type_key, m.type_key) AS type_key,
           COALESCE(gmo.damage_class, m.damage_class) AS damage_class,
           COALESCE(gmo.power, m.power) AS power,
           COALESCE(gmo.accuracy, m.accuracy) AS accuracy,
           COALESCE(gmo.pp, m.pp) AS pp
         FROM game_pokemon_moves gpm
         LEFT JOIN moves m ON m.name_key = gpm.move_name_key
         LEFT JOIN game_move_overrides gmo ON gmo.game_id = gpm.game_id AND gmo.move_name_key = gpm.move_name_key
         WHERE gpm.game_id = ?1 AND gpm.pokemon_name_key = ?2
         ORDER BY gpm.learn_method, gpm.level_learned_at, gpm.move_name_key"
    )
    .bind(&game_id)
    .bind(&pokemon_name_key)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Get pokemon abilities for a specific game, joined with ability details.
#[tauri::command]
pub async fn get_game_pokemon_abilities(
    state: State<'_, AppState>,
    game_id: String,
    pokemon_name_key: String,
) -> Result<Vec<PokemonAbility>, String> {
    let rows: Vec<PokemonAbility> = sqlx::query_as(
        "SELECT
           0 AS pokemon_id,
           a.id AS ability_id,
           gpa.ability_key,
           a.name_en AS ability_en,
           a.name_fr AS ability_fr,
           a.short_effect_en,
           a.short_effect_fr,
           gpa.is_hidden,
           gpa.slot
         FROM game_pokemon_abilities gpa
         LEFT JOIN abilities a ON a.name_key = gpa.ability_key
         WHERE gpa.game_id = ?1 AND gpa.pokemon_name_key = ?2
         ORDER BY gpa.slot"
    )
    .bind(&game_id)
    .bind(&pokemon_name_key)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Get pokemon locations for a specific game.
#[tauri::command]
pub async fn get_game_pokemon_locations(
    state: State<'_, AppState>,
    game_id: String,
    pokemon_name_key: String,
) -> Result<Vec<String>, String> {
    let rows: Vec<String> = sqlx::query_scalar(
        "SELECT location FROM game_pokemon_locations
         WHERE game_id = ?1 AND pokemon_name_key = ?2
         ORDER BY location"
    )
    .bind(&game_id)
    .bind(&pokemon_name_key)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Get move overrides for a specific game and move.
#[tauri::command]
pub async fn get_game_move_override(
    state: State<'_, AppState>,
    game_id: String,
    move_name_key: String,
) -> Result<Option<GameMoveOverride>, String> {
    let row: Option<GameMoveOverride> = sqlx::query_as(
        "SELECT game_id, move_name_key, power, accuracy, type_key, pp, damage_class, effect_en
         FROM game_move_overrides
         WHERE game_id = ?1 AND move_name_key = ?2"
    )
    .bind(&game_id)
    .bind(&move_name_key)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(row)
}

/// Get item locations for a specific game and item.
#[tauri::command]
pub async fn get_game_item_locations(
    state: State<'_, AppState>,
    game_id: String,
    item_name_key: String,
) -> Result<Vec<String>, String> {
    let rows: Vec<String> = sqlx::query_scalar(
        "SELECT location FROM game_item_locations
         WHERE game_id = ?1 AND item_name_key = ?2
         ORDER BY location"
    )
    .bind(&game_id)
    .bind(&item_name_key)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Import game data from a JSON string.
#[tauri::command]
pub async fn import_game_data(
    state: State<'_, AppState>,
    json_data: String,
) -> Result<String, String> {
    let data: GameDataFile = serde_json::from_str(&json_data)
        .map_err(|e| format!("Failed to parse game JSON: {}", e))?;

    let game_id = crate::cache::games::import_game_data(&state.pool, &data)
        .await
        .map_err(|e| format!("Failed to import game data: {}", e))?;

    log::info!("Imported game data for: {}", game_id);
    Ok(game_id)
}
