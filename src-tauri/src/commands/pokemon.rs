use crate::models::{PokemonAbility, PokemonDetail, PokemonPage, PokemonSummary};
use crate::AppState;
use sqlx::{QueryBuilder, Sqlite};
use std::cmp::Ordering;
use tauri::State;

fn fold_search_text(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let mut previous_space = true;

    for ch in value.chars().flat_map(|c| c.to_lowercase()) {
        let replacement = match ch {
            'à' | 'á' | 'â' | 'ã' | 'ä' | 'å' => "a",
            'ç' => "c",
            'è' | 'é' | 'ê' | 'ë' => "e",
            'ì' | 'í' | 'î' | 'ï' => "i",
            'ñ' => "n",
            'ò' | 'ó' | 'ô' | 'õ' | 'ö' => "o",
            'ù' | 'ú' | 'û' | 'ü' => "u",
            'ý' | 'ÿ' => "y",
            'æ' => "ae",
            'œ' => "oe",
            '♀' => " f ",
            '♂' => " m ",
            c if c.is_ascii_alphanumeric() => {
                out.push(c);
                previous_space = false;
                continue;
            }
            _ => " ",
        };

        for c in replacement.chars() {
            if c.is_ascii_whitespace() {
                if !previous_space {
                    out.push(' ');
                    previous_space = true;
                }
            } else {
                out.push(c);
                previous_space = false;
            }
        }
    }

    out.trim().to_owned()
}

fn pokemon_search_rank(pokemon: &PokemonSummary, folded_query: &str) -> Option<i64> {
    if folded_query.is_empty() {
        return Some(0);
    }

    let id = pokemon.id.to_string();
    let padded_id = format!("{:03}", pokemon.id);
    if folded_query == id || folded_query == padded_id {
        return Some(0);
    }

    let name_key = fold_search_text(&pokemon.name_key);
    let name_key_spaced = fold_search_text(&pokemon.name_key.replace('-', " "));
    let name_en = fold_search_text(pokemon.name_en.as_deref().unwrap_or_default());
    let name_fr = fold_search_text(pokemon.name_fr.as_deref().unwrap_or_default());
    let names = [&name_key, &name_key_spaced, &name_en, &name_fr];

    if names.iter().any(|name| name.as_str() == folded_query) {
        return Some(1);
    }
    if names.iter().any(|name| name.starts_with(folded_query)) {
        return Some(2);
    }

    let blob = format!("{id} {padded_id} {name_key} {name_key_spaced} {name_en} {name_fr}");
    if blob.contains(folded_query) {
        return Some(3);
    }

    let mut tokens = folded_query.split_whitespace();
    if tokens.all(|token| blob.contains(token)) {
        return Some(4);
    }

    None
}

fn compare_optional_desc(left: Option<i64>, right: Option<i64>) -> Ordering {
    right.unwrap_or(-1).cmp(&left.unwrap_or(-1))
}

fn compare_pokemon_for_browser(
    left: &PokemonSummary,
    right: &PokemonSummary,
    sort: &str,
    name_lang: &str,
) -> Ordering {
    let sort_order = match sort {
        "name" => {
            let left_name = if name_lang == "fr" {
                left.name_fr.as_ref().or(left.name_en.as_ref())
            } else {
                left.name_en.as_ref().or(left.name_fr.as_ref())
            };
            let right_name = if name_lang == "fr" {
                right.name_fr.as_ref().or(right.name_en.as_ref())
            } else {
                right.name_en.as_ref().or(right.name_fr.as_ref())
            };
            fold_search_text(left_name.map(String::as_str).unwrap_or(&left.name_key)).cmp(
                &fold_search_text(right_name.map(String::as_str).unwrap_or(&right.name_key)),
            )
        }
        "bst" => compare_optional_desc(left.base_stat_total, right.base_stat_total),
        "hp" => compare_optional_desc(left.hp, right.hp),
        "atk" => compare_optional_desc(left.atk, right.atk),
        "def" => compare_optional_desc(left.def, right.def),
        "spa" => compare_optional_desc(left.spa, right.spa),
        "spd" => compare_optional_desc(left.spd, right.spd),
        "spe" => compare_optional_desc(left.spe, right.spe),
        _ => Ordering::Equal,
    };

    sort_order
        .then_with(|| {
            left.species_id
                .unwrap_or(left.id)
                .cmp(&right.species_id.unwrap_or(right.id))
        })
        .then_with(|| left.id.cmp(&right.id))
}

fn push_pokemon_browser_filters(
    query: &mut QueryBuilder<'_, Sqlite>,
    normalized_query: &str,
    like_pattern: &str,
    type_filter: Option<&str>,
    type2_filter: Option<&str>,
    gen_min: Option<i64>,
    gen_max: Option<i64>,
    favorites_only: bool,
) {
    let mut has_where = false;

    if !normalized_query.is_empty() {
        query.push(" WHERE (CAST(p.id AS TEXT) = ");
        query.push_bind(normalized_query.to_owned());
        query.push(" OR printf('%03d', p.id) = ");
        query.push_bind(normalized_query.to_owned());
        query.push(" OR LOWER(p.name_key) LIKE ");
        query.push_bind(like_pattern.to_owned());
        query.push(" OR LOWER(p.name_en) LIKE ");
        query.push_bind(like_pattern.to_owned());
        query.push(" OR LOWER(p.name_fr) LIKE ");
        query.push_bind(like_pattern.to_owned());
        query.push(")");
        has_where = true;
    }

    if let Some(type_key) = type_filter {
        if has_where {
            query.push(" AND ");
        } else {
            query.push(" WHERE ");
            has_where = true;
        }

        if let Some(type2_key) = type2_filter {
            query.push("((p.type1_key = ");
            query.push_bind(type_key.to_owned());
            query.push(" AND p.type2_key = ");
            query.push_bind(type2_key.to_owned());
            query.push(") OR (p.type1_key = ");
            query.push_bind(type2_key.to_owned());
            query.push(" AND p.type2_key = ");
            query.push_bind(type_key.to_owned());
            query.push("))");
        } else {
            query.push("(p.type1_key = ");
            query.push_bind(type_key.to_owned());
            query.push(" OR p.type2_key = ");
            query.push_bind(type_key.to_owned());
            query.push(")");
        }
    }

    if let (Some(min), Some(max)) = (gen_min, gen_max) {
        if has_where {
            query.push(" AND ");
        } else {
            query.push(" WHERE ");
            has_where = true;
        }
        query.push("p.id BETWEEN ");
        query.push_bind(min);
        query.push(" AND ");
        query.push_bind(max);
    }

    if favorites_only {
        if has_where {
            query.push(" AND ");
        } else {
            query.push(" WHERE ");
        }
        query.push("EXISTS (SELECT 1 FROM favorites f WHERE f.pokemon_id = p.id)");
    }
}

fn pokemon_browser_order_by(sort: &str, name_lang: &str) -> &'static str {
    match sort {
        "name" if name_lang == "fr" => {
            "LOWER(COALESCE(p.name_fr, p.name_en, p.name_key)) ASC, COALESCE(p.species_id, p.id) ASC, p.id ASC"
        }
        "name" => {
            "LOWER(COALESCE(p.name_en, p.name_fr, p.name_key)) ASC, COALESCE(p.species_id, p.id) ASC, p.id ASC"
        }
        "bst" => "COALESCE(p.base_stat_total, -1) DESC, COALESCE(p.species_id, p.id) ASC, p.id ASC",
        "hp" => "COALESCE(p.hp, -1) DESC, COALESCE(p.species_id, p.id) ASC, p.id ASC",
        "atk" => "COALESCE(p.atk, -1) DESC, COALESCE(p.species_id, p.id) ASC, p.id ASC",
        "def" => "COALESCE(p.def, -1) DESC, COALESCE(p.species_id, p.id) ASC, p.id ASC",
        "spa" => "COALESCE(p.spa, -1) DESC, COALESCE(p.species_id, p.id) ASC, p.id ASC",
        "spd" => "COALESCE(p.spd, -1) DESC, COALESCE(p.species_id, p.id) ASC, p.id ASC",
        "spe" => "COALESCE(p.spe, -1) DESC, COALESCE(p.species_id, p.id) ASC, p.id ASC",
        _ => "COALESCE(p.species_id, p.id) ASC, p.id ASC",
    }
}

/// Get all pokemon (summary list, ordered by ID).
#[tauri::command]
pub async fn get_all_pokemon(state: State<'_, AppState>) -> Result<Vec<PokemonSummary>, String> {
    let rows: Vec<PokemonSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key, hp, atk, def, spa, spd, spe, base_stat_total, sprite_url, species_id
         FROM pokemon ORDER BY id"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Get one filtered/sorted Pokédex page for virtualized browser views.
#[tauri::command]
pub async fn get_pokemon_page(
    state: State<'_, AppState>,
    query: String,
    type_filter: Option<String>,
    type2_filter: Option<String>,
    gen_min: Option<i64>,
    gen_max: Option<i64>,
    sort: String,
    favorites_only: bool,
    name_lang: String,
    limit: i64,
    offset: i64,
) -> Result<PokemonPage, String> {
    let normalized_query = query.trim().to_lowercase();
    let folded_query = fold_search_text(&query);
    let like_pattern = format!("%{}%", normalized_query);
    let type_filter = type_filter.as_deref().filter(|value| !value.is_empty());
    let type2_filter = type2_filter.as_deref().filter(|value| !value.is_empty());
    let limit = limit.clamp(1, 200);
    let offset = offset.max(0);

    if !folded_query.is_empty() {
        let mut rows_query = QueryBuilder::new(
            "SELECT p.id, p.name_key, p.name_en, p.name_fr, p.type1_key, p.type2_key,
                    p.hp, p.atk, p.def, p.spa, p.spd, p.spe, p.base_stat_total,
                    p.sprite_url, p.species_id
             FROM pokemon p",
        );
        push_pokemon_browser_filters(
            &mut rows_query,
            "",
            "",
            type_filter,
            type2_filter,
            gen_min,
            gen_max,
            favorites_only,
        );

        let rows: Vec<PokemonSummary> = rows_query
            .build_query_as()
            .fetch_all(&state.pool)
            .await
            .map_err(|e| e.to_string())?;

        let mut ranked: Vec<(i64, PokemonSummary)> = rows
            .into_iter()
            .filter_map(|pokemon| {
                pokemon_search_rank(&pokemon, &folded_query).map(|rank| (rank, pokemon))
            })
            .collect();

        ranked.sort_by(|(left_rank, left), (right_rank, right)| {
            left_rank
                .cmp(right_rank)
                .then_with(|| compare_pokemon_for_browser(left, right, &sort, &name_lang))
        });

        let total = ranked.len() as i64;
        let items = ranked
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .map(|(_, pokemon)| pokemon)
            .collect();

        return Ok(PokemonPage { items, total });
    }

    let mut count_query = QueryBuilder::new("SELECT COUNT(*) FROM pokemon p");
    push_pokemon_browser_filters(
        &mut count_query,
        &normalized_query,
        &like_pattern,
        type_filter,
        type2_filter,
        gen_min,
        gen_max,
        favorites_only,
    );
    let total: i64 = count_query
        .build_query_scalar()
        .fetch_one(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut rows_query = QueryBuilder::new(
        "SELECT p.id, p.name_key, p.name_en, p.name_fr, p.type1_key, p.type2_key,
                p.hp, p.atk, p.def, p.spa, p.spd, p.spe, p.base_stat_total,
                p.sprite_url, p.species_id
         FROM pokemon p",
    );
    push_pokemon_browser_filters(
        &mut rows_query,
        &normalized_query,
        &like_pattern,
        type_filter,
        type2_filter,
        gen_min,
        gen_max,
        favorites_only,
    );
    rows_query.push(" ORDER BY ");
    rows_query.push(pokemon_browser_order_by(&sort, &name_lang));
    rows_query.push(" LIMIT ");
    rows_query.push_bind(limit);
    rows_query.push(" OFFSET ");
    rows_query.push_bind(offset);

    let items: Vec<PokemonSummary> = rows_query
        .build_query_as()
        .fetch_all(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(PokemonPage { items, total })
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
         FROM pokemon WHERE id = ?1",
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
    let folded_query = fold_search_text(&query);
    if folded_query.is_empty() {
        return Ok(Vec::new());
    }

    let rows: Vec<PokemonSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key, hp, atk, def, spa, spd, spe, base_stat_total, sprite_url, species_id
         FROM pokemon
         ORDER BY id"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut ranked: Vec<(i64, PokemonSummary)> = rows
        .into_iter()
        .filter_map(|pokemon| {
            pokemon_search_rank(&pokemon, &folded_query).map(|rank| (rank, pokemon))
        })
        .collect();

    ranked.sort_by(|(left_rank, left), (right_rank, right)| {
        left_rank
            .cmp(right_rank)
            .then_with(|| compare_pokemon_for_browser(left, right, "id", "en"))
    });

    Ok(ranked
        .into_iter()
        .take(50)
        .map(|(_, pokemon)| pokemon)
        .collect())
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
         ORDER BY pa.slot",
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
    let chain_id: Option<(Option<i64>,)> =
        sqlx::query_as("SELECT evolution_chain_id FROM pokemon WHERE id = ?1")
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
    let forms: Vec<PokemonSummary> = all
        .into_iter()
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
