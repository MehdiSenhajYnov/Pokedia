use sqlx::SqlitePool;

use crate::models::games::{
    AbilityOverrideEntry, GameDataFile, ItemLocationEntry, LearnsetEntry, MoveOverrideEntry,
    PokemonOverride,
};

/// Upsert a game record.
pub async fn upsert_game(
    pool: &SqlitePool,
    game: &crate::models::games::GameMeta,
) -> Result<(), sqlx::Error> {
    let now = chrono::Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO games (id, name_en, name_fr, base_rom, version, author, is_hackrom, sort_order, coverage, imported_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
           name_en = excluded.name_en,
           name_fr = excluded.name_fr,
           base_rom = excluded.base_rom,
           version = excluded.version,
           author = excluded.author,
           is_hackrom = excluded.is_hackrom,
           sort_order = excluded.sort_order,
           coverage = excluded.coverage,
           imported_at = excluded.imported_at"
    )
    .bind(&game.id)
    .bind(&game.name_en)
    .bind(&game.name_fr)
    .bind(&game.base_rom)
    .bind(&game.version)
    .bind(&game.author)
    .bind(game.is_hackrom as i64)
    .bind(game.sort_order)
    .bind(&game.coverage)
    .bind(&now)
    .execute(pool)
    .await?;

    Ok(())
}

/// Import all data from a parsed game data file using a transaction.
pub async fn import_game_data(
    pool: &SqlitePool,
    data: &GameDataFile,
) -> Result<String, sqlx::Error> {
    let game_id = &data.game.id;

    // Delete existing data for this game first
    delete_game_data(pool, game_id).await?;

    // Upsert the game record
    upsert_game(pool, &data.game).await?;

    // Import pokemon overrides in batches
    for pokemon in &data.pokemon_overrides {
        import_pokemon_override(pool, game_id, pokemon).await?;
    }

    // Import move overrides
    for mo in &data.move_overrides {
        import_move_override(pool, game_id, mo).await?;
    }

    // Import item locations
    for il in &data.item_locations {
        import_item_locations(pool, game_id, il).await?;
    }

    Ok(game_id.clone())
}

/// Import a single pokemon's override data (learnset, abilities, locations).
async fn import_pokemon_override(
    pool: &SqlitePool,
    game_id: &str,
    pokemon: &PokemonOverride,
) -> Result<(), sqlx::Error> {
    // Learnset
    for entry in &pokemon.learnset {
        import_pokemon_move(pool, game_id, &pokemon.name_key, entry).await?;
    }

    // Abilities
    for ability in &pokemon.abilities {
        import_pokemon_ability(pool, game_id, &pokemon.name_key, ability).await?;
    }

    // Locations
    for location in &pokemon.locations {
        import_pokemon_location(pool, game_id, &pokemon.name_key, location).await?;
    }

    Ok(())
}

async fn import_pokemon_move(
    pool: &SqlitePool,
    game_id: &str,
    pokemon_name_key: &str,
    entry: &LearnsetEntry,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT OR IGNORE INTO game_pokemon_moves (game_id, pokemon_name_key, move_name_key, learn_method, level_learned_at)
         VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(game_id)
    .bind(pokemon_name_key)
    .bind(&entry.move_name_key)
    .bind(&entry.learn_method)
    .bind(entry.level)
    .execute(pool)
    .await?;

    Ok(())
}

async fn import_pokemon_ability(
    pool: &SqlitePool,
    game_id: &str,
    pokemon_name_key: &str,
    ability: &AbilityOverrideEntry,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT OR REPLACE INTO game_pokemon_abilities (game_id, pokemon_name_key, ability_key, slot, is_hidden)
         VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(game_id)
    .bind(pokemon_name_key)
    .bind(&ability.ability_key)
    .bind(ability.slot)
    .bind(ability.is_hidden as i64)
    .execute(pool)
    .await?;

    Ok(())
}

async fn import_pokemon_location(
    pool: &SqlitePool,
    game_id: &str,
    pokemon_name_key: &str,
    location: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT OR IGNORE INTO game_pokemon_locations (game_id, pokemon_name_key, location)
         VALUES (?1, ?2, ?3)"
    )
    .bind(game_id)
    .bind(pokemon_name_key)
    .bind(location)
    .execute(pool)
    .await?;

    Ok(())
}

async fn import_move_override(
    pool: &SqlitePool,
    game_id: &str,
    mo: &MoveOverrideEntry,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT OR REPLACE INTO game_move_overrides (game_id, move_name_key, power, accuracy, type_key, pp, damage_class, effect_en)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
    )
    .bind(game_id)
    .bind(&mo.name_key)
    .bind(mo.power)
    .bind(mo.accuracy)
    .bind(&mo.type_key)
    .bind(mo.pp)
    .bind(&mo.damage_class)
    .bind(&mo.effect_en)
    .execute(pool)
    .await?;

    Ok(())
}

async fn import_item_locations(
    pool: &SqlitePool,
    game_id: &str,
    il: &ItemLocationEntry,
) -> Result<(), sqlx::Error> {
    for location in &il.locations {
        sqlx::query(
            "INSERT OR IGNORE INTO game_item_locations (game_id, item_name_key, location)
             VALUES (?1, ?2, ?3)"
        )
        .bind(game_id)
        .bind(&il.name_key)
        .bind(location)
        .execute(pool)
        .await?;
    }

    Ok(())
}

/// Delete all data for a specific game.
pub async fn delete_game_data(
    pool: &SqlitePool,
    game_id: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM game_pokemon_moves WHERE game_id = ?1")
        .bind(game_id).execute(pool).await?;
    sqlx::query("DELETE FROM game_pokemon_abilities WHERE game_id = ?1")
        .bind(game_id).execute(pool).await?;
    sqlx::query("DELETE FROM game_pokemon_locations WHERE game_id = ?1")
        .bind(game_id).execute(pool).await?;
    sqlx::query("DELETE FROM game_move_overrides WHERE game_id = ?1")
        .bind(game_id).execute(pool).await?;
    sqlx::query("DELETE FROM game_item_locations WHERE game_id = ?1")
        .bind(game_id).execute(pool).await?;

    Ok(())
}

/// Upsert a game_pokemon_moves entry (used by sync engine for official version groups).
pub async fn upsert_game_pokemon_move(
    pool: &SqlitePool,
    game_id: &str,
    pokemon_name_key: &str,
    move_name_key: &str,
    learn_method: &str,
    level_learned_at: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT OR IGNORE INTO game_pokemon_moves (game_id, pokemon_name_key, move_name_key, learn_method, level_learned_at)
         VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(game_id)
    .bind(pokemon_name_key)
    .bind(move_name_key)
    .bind(learn_method)
    .bind(level_learned_at)
    .execute(pool)
    .await?;

    Ok(())
}
