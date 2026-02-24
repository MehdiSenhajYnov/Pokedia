use crate::models::{PokemonAbility, PokemonDetail, PokemonSummary};
use crate::AppState;
use tauri::State;

/// Get all pokemon (summary list, ordered by ID).
#[tauri::command]
pub async fn get_all_pokemon(
    state: State<'_, AppState>,
) -> Result<Vec<PokemonSummary>, String> {
    let rows: Vec<PokemonSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key, hp, atk, def, spa, spd, spe, base_stat_total, sprite_url
         FROM pokemon ORDER BY id"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Get a single pokemon by ID with full detail.
#[tauri::command]
pub async fn get_pokemon_by_id(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Option<PokemonDetail>, String> {
    let row: Option<PokemonDetail> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key,
                hp, atk, def, spa, spd, spe, base_stat_total, sprite_url,
                evolution_chain_id, description_en, description_fr, height, weight
         FROM pokemon WHERE id = ?1"
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(row)
}

/// Search pokemon by name (supports partial matching).
#[tauri::command]
pub async fn search_pokemon(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<PokemonSummary>, String> {
    let pattern = format!("%{}%", query.to_lowercase());

    let rows: Vec<PokemonSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key, hp, atk, def, spa, spd, spe, base_stat_total, sprite_url
         FROM pokemon
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

/// Get a pokemon's abilities.
#[tauri::command]
pub async fn get_pokemon_abilities(
    state: State<'_, AppState>,
    pokemon_id: i64,
) -> Result<Vec<PokemonAbility>, String> {
    let rows: Vec<PokemonAbility> = sqlx::query_as(
        "SELECT pokemon_id, ability_key, ability_en, ability_fr, is_hidden, slot
         FROM pokemon_abilities
         WHERE pokemon_id = ?1
         ORDER BY slot"
    )
    .bind(pokemon_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Get a pokemon's evolution chain.
#[tauri::command]
pub async fn get_pokemon_evolution_chain(
    state: State<'_, AppState>,
    pokemon_id: i64,
) -> Result<Option<crate::models::EvolutionNode>, String> {
    // First get the evolution_chain_id for this pokemon
    let chain_id: Option<(Option<i64>,)> = sqlx::query_as(
        "SELECT evolution_chain_id FROM pokemon WHERE id = ?1"
    )
    .bind(pokemon_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let chain_id = match chain_id.and_then(|(id,)| id) {
        Some(id) => id,
        None => return Ok(None),
    };

    let node = crate::cache::evolution::get_evolution_chain(&state.pool, chain_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(node)
}
