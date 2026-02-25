use crate::models::{PokemonAbility, PokemonDetail, PokemonSummary};
use crate::AppState;
use tauri::State;

/// Get all pokemon (summary list, ordered by ID).
#[tauri::command]
pub async fn get_all_pokemon(
    state: State<'_, AppState>,
) -> Result<Vec<PokemonSummary>, String> {
    let rows: Vec<PokemonSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key, hp, atk, def, spa, spd, spe, base_stat_total, sprite_url, species_id
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
                evolution_chain_id, description_en, description_fr, height, weight, species_id
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
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key, hp, atk, def, spa, spd, spe, base_stat_total, sprite_url, species_id
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
        "SELECT pa.pokemon_id, a.id AS ability_id, pa.ability_key,
                COALESCE(a.name_en, pa.ability_en) AS ability_en,
                COALESCE(a.name_fr, pa.ability_fr) AS ability_fr,
                a.short_effect_en, a.short_effect_fr,
                pa.is_hidden, pa.slot
         FROM pokemon_abilities pa
         LEFT JOIN abilities a ON a.name_key = pa.ability_key
         WHERE pa.pokemon_id = ?1
         ORDER BY pa.slot"
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

/// Get alternate forms (mega, regional, etc.) for all species in a given evolution chain.
/// Finds all pokemon sharing the same evolution_chain_id but NOT present as nodes in the
/// evolution chain JSON. This works regardless of whether species_id is populated.
#[tauri::command]
pub async fn get_alternate_forms(
    state: State<'_, AppState>,
    chain_id: i64,
) -> Result<Vec<PokemonSummary>, String> {
    // 1. Get the evolution chain JSON to find base-form pokemon IDs
    let chain_node = crate::cache::evolution::get_evolution_chain(&state.pool, chain_id)
        .await
        .map_err(|e| e.to_string())?;

    let mut base_ids = Vec::new();
    if let Some(ref node) = chain_node {
        collect_chain_ids(node, &mut base_ids);
    }

    if base_ids.is_empty() {
        return Ok(Vec::new());
    }

    // 2. Get all pokemon with this evolution_chain_id
    let all: Vec<PokemonSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key, hp, atk, def, spa, spd, spe, base_stat_total, sprite_url, species_id
         FROM pokemon
         WHERE evolution_chain_id = ?1
         ORDER BY id"
    )
    .bind(chain_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    // 3. Filter out base-form IDs — what remains are alternate forms
    let base_set: std::collections::HashSet<i64> = base_ids.into_iter().collect();
    let forms: Vec<PokemonSummary> = all.into_iter()
        .filter(|p| !base_set.contains(&p.id))
        .collect();

    Ok(forms)
}

/// Recursively collect all pokemon_ids from an evolution chain tree.
fn collect_chain_ids(node: &crate::models::EvolutionNode, ids: &mut Vec<i64>) {
    if let Some(pid) = node.pokemon_id {
        ids.push(pid);
    }
    for child in &node.evolves_to {
        collect_chain_ids(child, ids);
    }
}
