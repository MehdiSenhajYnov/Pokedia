use std::path::PathBuf;

use directories::BaseDirs;
use sqlx::SqlitePool;

use crate::models::{
    AbilityDetail, AbilityPokemonEntry, AbilitySummary, EvolutionNode, GameSummary, ItemDetail,
    ItemSummary, MoveDetail, MovePokemonEntry, MoveSummary, NatureSummary, PokemonAbility,
    PokemonDetail, PokemonMoveEntry, PokemonSummary, SyncResourceStatus,
};

/// Shared application data directory for the native GTK client.
pub fn app_data_dir() -> PathBuf {
    BaseDirs::new()
        .map(|dirs| dirs.data_dir().join("com.pokedia.app"))
        .unwrap_or_else(|| PathBuf::from(".").join(".pokedia"))
}

pub fn database_path() -> PathBuf {
    app_data_dir().join("pokedia.db")
}

pub async fn init_pool() -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let pool = crate::db::init_db_at_path(&database_path()).await?;
    auto_import_bundled_games(&pool).await;
    Ok(pool)
}

async fn auto_import_bundled_games(pool: &SqlitePool) {
    for json_str in crate::BUNDLED_GAMES {
        let data: crate::models::GameDataFile = match serde_json::from_str(json_str) {
            Ok(data) => data,
            Err(error) => {
                log::warn!("Failed to parse bundled game JSON: {}", error);
                continue;
            }
        };

        let fingerprint = crate::cache::games::bundled_game_fingerprint(json_str);
        match crate::cache::games::is_bundled_game_current(pool, &data.game.id, &fingerprint).await
        {
            Ok(true) => continue,
            Ok(false) => {}
            Err(error) => {
                log::warn!(
                    "Failed to check bundled game fingerprint for '{}': {}",
                    data.game.id,
                    error
                );
            }
        }

        if let Err(error) = crate::cache::games::import_game_data(pool, &data).await {
            log::warn!(
                "Failed to import bundled game '{}': {}",
                data.game.id,
                error
            );
            continue;
        }

        if let Err(error) =
            crate::cache::games::set_bundled_game_fingerprint(pool, &data.game.id, &fingerprint)
                .await
        {
            log::warn!(
                "Failed to save bundled game fingerprint for '{}': {}",
                data.game.id,
                error
            );
        }
    }
}

pub async fn load_pokemon_summaries(pool: &SqlitePool) -> Result<Vec<PokemonSummary>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key,
                hp, atk, def, spa, spd, spe, base_stat_total, sprite_url, species_id
         FROM pokemon
         ORDER BY COALESCE(species_id, id) ASC, id ASC",
    )
    .fetch_all(pool)
    .await
}

pub async fn load_favorite_ids(pool: &SqlitePool) -> Result<Vec<i64>, sqlx::Error> {
    sqlx::query_scalar("SELECT pokemon_id FROM favorites ORDER BY added_at DESC")
        .fetch_all(pool)
        .await
}

pub async fn load_pokemon_detail(
    pool: &SqlitePool,
    id: i64,
) -> Result<Option<PokemonDetail>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key,
                hp, atk, def, spa, spd, spe, base_stat_total, sprite_url,
                evolution_chain_id, description_en, description_fr, height, weight, species_id
         FROM pokemon
         WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn load_pokemon_abilities(
    pool: &SqlitePool,
    pokemon_id: i64,
) -> Result<Vec<PokemonAbility>, sqlx::Error> {
    sqlx::query_as(
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
    .fetch_all(pool)
    .await
}

pub async fn load_pokemon_moves(
    pool: &SqlitePool,
    pokemon_id: i64,
) -> Result<Vec<PokemonMoveEntry>, sqlx::Error> {
    sqlx::query_as(
        "SELECT pm.pokemon_id, pm.move_id, pm.learn_method, pm.level_learned_at,
                m.name_key, m.name_en, m.name_fr, m.type_key, m.damage_class,
                m.power, m.accuracy, m.pp
         FROM pokemon_moves pm
         JOIN moves m ON pm.move_id = m.id
         WHERE pm.pokemon_id = ?1
         ORDER BY pm.learn_method, pm.level_learned_at, m.name_key",
    )
    .bind(pokemon_id)
    .fetch_all(pool)
    .await
}

pub async fn load_pokemon_evolution_chain(
    pool: &SqlitePool,
    pokemon_id: i64,
) -> Result<Option<EvolutionNode>, sqlx::Error> {
    let chain_id: Option<Option<i64>> =
        sqlx::query_scalar("SELECT evolution_chain_id FROM pokemon WHERE id = ?1")
            .bind(pokemon_id)
            .fetch_optional(pool)
            .await?;

    let Some(chain_id) = chain_id.flatten() else {
        return Ok(None);
    };

    let row: Option<String> = sqlx::query_scalar("SELECT data FROM evolution_chains WHERE id = ?1")
        .bind(chain_id)
        .fetch_optional(pool)
        .await?;

    Ok(row.and_then(|data| serde_json::from_str(&data).ok()))
}

pub async fn load_alternate_forms(
    pool: &SqlitePool,
    chain_id: i64,
) -> Result<Vec<PokemonSummary>, sqlx::Error> {
    let Some(chain) = load_evolution_chain_by_id(pool, chain_id).await? else {
        return Ok(Vec::new());
    };

    let mut base_ids = Vec::new();
    collect_chain_ids(&chain, &mut base_ids);
    if base_ids.is_empty() {
        return Ok(Vec::new());
    }

    let all: Vec<PokemonSummary> = sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type1_key, type2_key,
                hp, atk, def, spa, spd, spe, base_stat_total, sprite_url, species_id
         FROM pokemon
         WHERE evolution_chain_id = ?1
         ORDER BY id",
    )
    .bind(chain_id)
    .fetch_all(pool)
    .await?;

    let base_ids = base_ids
        .into_iter()
        .collect::<std::collections::HashSet<_>>();
    Ok(all
        .into_iter()
        .filter(|pokemon| !base_ids.contains(&pokemon.id))
        .collect())
}

async fn load_evolution_chain_by_id(
    pool: &SqlitePool,
    chain_id: i64,
) -> Result<Option<EvolutionNode>, sqlx::Error> {
    let row: Option<String> = sqlx::query_scalar("SELECT data FROM evolution_chains WHERE id = ?1")
        .bind(chain_id)
        .fetch_optional(pool)
        .await?;

    Ok(row.and_then(|data| serde_json::from_str(&data).ok()))
}

fn collect_chain_ids(node: &EvolutionNode, ids: &mut Vec<i64>) {
    if let Some(id) = node.pokemon_id {
        ids.push(id);
    }
    for child in &node.evolves_to {
        collect_chain_ids(child, ids);
    }
}

pub async fn load_move_summaries(pool: &SqlitePool) -> Result<Vec<MoveSummary>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type_key, damage_class, power, accuracy, pp
         FROM moves
         ORDER BY id",
    )
    .fetch_all(pool)
    .await
}

pub async fn load_move_detail(
    pool: &SqlitePool,
    id: i64,
) -> Result<Option<MoveDetail>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, type_key, damage_class,
                power, accuracy, pp, priority, effect_en, effect_fr
         FROM moves WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn load_move_pokemon(
    pool: &SqlitePool,
    move_id: i64,
) -> Result<Vec<MovePokemonEntry>, sqlx::Error> {
    sqlx::query_as(
        "SELECT p.id AS pokemon_id, p.name_key, p.name_en, p.name_fr, p.type1_key, p.type2_key, p.sprite_url,
                pm.learn_method, pm.level_learned_at
         FROM pokemon_moves pm
         JOIN pokemon p ON p.id = pm.pokemon_id
         WHERE pm.move_id = ?1
         ORDER BY pm.learn_method, pm.level_learned_at, p.id",
    )
    .bind(move_id)
    .fetch_all(pool)
    .await
}

pub async fn load_ability_summaries(pool: &SqlitePool) -> Result<Vec<AbilitySummary>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, short_effect_en, short_effect_fr, generation
         FROM abilities
         ORDER BY id",
    )
    .fetch_all(pool)
    .await
}

pub async fn load_ability_detail(
    pool: &SqlitePool,
    id: i64,
) -> Result<Option<AbilityDetail>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, effect_en, effect_fr, short_effect_en, short_effect_fr, generation
         FROM abilities WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn load_ability_pokemon(
    pool: &SqlitePool,
    ability_id: i64,
) -> Result<Vec<AbilityPokemonEntry>, sqlx::Error> {
    sqlx::query_as(
        "SELECT p.id AS pokemon_id, p.name_key, p.name_en, p.name_fr, p.type1_key, p.type2_key, p.sprite_url, ap.is_hidden
         FROM ability_pokemon ap
         JOIN pokemon p ON p.id = ap.pokemon_id
         WHERE ap.ability_id = ?1
         ORDER BY p.id",
    )
    .bind(ability_id)
    .fetch_all(pool)
    .await
}

pub async fn load_item_summaries(pool: &SqlitePool) -> Result<Vec<ItemSummary>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, category, effect_en, effect_fr, sprite_url
         FROM items
         ORDER BY id",
    )
    .fetch_all(pool)
    .await
}

pub async fn load_item_detail(
    pool: &SqlitePool,
    id: i64,
) -> Result<Option<ItemDetail>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, category, effect_en, effect_fr, sprite_url
         FROM items WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn load_nature_summaries(pool: &SqlitePool) -> Result<Vec<NatureSummary>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name_key, name_en, name_fr, increased_stat, decreased_stat, likes_flavor, hates_flavor
         FROM natures
         ORDER BY id",
    )
    .fetch_all(pool)
    .await
}

pub async fn load_game_summaries(pool: &SqlitePool) -> Result<Vec<GameSummary>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name_en, name_fr, base_rom, version, author, is_hackrom, sort_order, coverage
         FROM games
         ORDER BY sort_order, name_en",
    )
    .fetch_all(pool)
    .await
}

pub async fn load_game_pokemon_moves(
    pool: &SqlitePool,
    game_id: &str,
    pokemon_name_key: &str,
) -> Result<Vec<PokemonMoveEntry>, sqlx::Error> {
    sqlx::query_as(
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
         ORDER BY gpm.learn_method, gpm.level_learned_at, gpm.move_name_key",
    )
    .bind(game_id)
    .bind(pokemon_name_key)
    .fetch_all(pool)
    .await
}

pub async fn load_game_pokemon_abilities(
    pool: &SqlitePool,
    game_id: &str,
    pokemon_name_key: &str,
) -> Result<Vec<PokemonAbility>, sqlx::Error> {
    sqlx::query_as(
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
         ORDER BY gpa.slot",
    )
    .bind(game_id)
    .bind(pokemon_name_key)
    .fetch_all(pool)
    .await
}

pub async fn load_game_pokemon_locations(
    pool: &SqlitePool,
    game_id: &str,
    pokemon_name_key: &str,
) -> Result<Vec<String>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT location FROM game_pokemon_locations
         WHERE game_id = ?1 AND pokemon_name_key = ?2
         ORDER BY location",
    )
    .bind(game_id)
    .bind(pokemon_name_key)
    .fetch_all(pool)
    .await
}

pub async fn load_game_item_locations(
    pool: &SqlitePool,
    game_id: &str,
    item_name_key: &str,
) -> Result<Vec<String>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT location FROM game_item_locations
         WHERE game_id = ?1 AND item_name_key = ?2
         ORDER BY location",
    )
    .bind(game_id)
    .bind(item_name_key)
    .fetch_all(pool)
    .await
}

pub async fn load_sync_resources(
    pool: &SqlitePool,
) -> Result<Vec<SyncResourceStatus>, sqlx::Error> {
    sqlx::query_as(
        "SELECT resource, total, completed, status, error
         FROM sync_meta
         ORDER BY resource",
    )
    .fetch_all(pool)
    .await
}

pub fn pokemon_name(pokemon: &PokemonSummary) -> String {
    pokemon
        .name_fr
        .as_ref()
        .or(pokemon.name_en.as_ref())
        .cloned()
        .unwrap_or_else(|| titleize_key(&pokemon.name_key))
}

pub fn detail_name(pokemon: &PokemonDetail) -> String {
    pokemon
        .name_fr
        .as_ref()
        .or(pokemon.name_en.as_ref())
        .cloned()
        .unwrap_or_else(|| titleize_key(&pokemon.name_key))
}

pub fn ability_name(ability: &PokemonAbility) -> String {
    ability
        .ability_fr
        .as_ref()
        .or(ability.ability_en.as_ref())
        .cloned()
        .unwrap_or_else(|| titleize_key(&ability.ability_key))
}

pub fn move_name(move_: &MoveSummary) -> String {
    move_
        .name_fr
        .as_ref()
        .or(move_.name_en.as_ref())
        .cloned()
        .unwrap_or_else(|| titleize_key(&move_.name_key))
}

pub fn ability_summary_name(ability: &AbilitySummary) -> String {
    ability
        .name_fr
        .as_ref()
        .or(ability.name_en.as_ref())
        .cloned()
        .unwrap_or_else(|| titleize_key(&ability.name_key))
}

pub fn item_name(item: &ItemSummary) -> String {
    item.name_fr
        .as_ref()
        .or(item.name_en.as_ref())
        .cloned()
        .unwrap_or_else(|| titleize_key(&item.name_key))
}

pub fn nature_name(nature: &NatureSummary) -> String {
    nature
        .name_fr
        .as_ref()
        .or(nature.name_en.as_ref())
        .cloned()
        .unwrap_or_else(|| titleize_key(&nature.name_key))
}

pub fn titleize_key(value: &str) -> String {
    value
        .split(['-', '_'])
        .filter(|part| !part.is_empty())
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn matches_query(pokemon: &PokemonSummary, query: &str) -> bool {
    let query = fold_search_text(query);
    if query.is_empty() {
        return true;
    }

    let base_id = pokemon.species_id.unwrap_or(pokemon.id);
    let padded_id = format!("{base_id:03}");
    let blob = format!(
        "{} {} {} {} {}",
        pokemon.id,
        padded_id,
        pokemon.name_key,
        pokemon.name_en.as_deref().unwrap_or_default(),
        pokemon.name_fr.as_deref().unwrap_or_default()
    );
    let folded_blob = fold_search_text(&blob);

    query
        .split_whitespace()
        .all(|token| folded_blob.contains(token))
}

pub fn fold_search_text(value: &str) -> String {
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

pub fn type_color(type_key: Option<&str>) -> &'static str {
    match type_key.unwrap_or_default() {
        "normal" => "#9da0aa",
        "fire" => "#ff7a45",
        "water" => "#4f9cff",
        "electric" => "#f5c542",
        "grass" => "#63c56b",
        "ice" => "#67d7e8",
        "fighting" => "#d8586f",
        "poison" => "#b56ae2",
        "ground" => "#d29463",
        "flying" => "#8aa5ff",
        "psychic" => "#ff6fa9",
        "bug" => "#93c34b",
        "rock" => "#c5aa72",
        "ghost" => "#7472d8",
        "dragon" => "#6c7cff",
        "dark" => "#6b6470",
        "steel" => "#74a6b7",
        "fairy" => "#f28bd3",
        _ => "#8f939c",
    }
}
