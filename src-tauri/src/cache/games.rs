use sqlx::{QueryBuilder, Sqlite, SqlitePool};

use crate::models::games::{
    AbilityOverrideEntry, GameDataFile, ItemLocationEntry, LearnsetEntry, MoveOverrideEntry,
    PokemonOverride,
};

const BATCH_ROWS: usize = 500;
const BUNDLED_GAME_FINGERPRINT_PREFIX: &str = "bundled_game_fingerprint:";

pub fn bundled_game_fingerprint(json: &str) -> String {
    const FNV_OFFSET: u64 = 0xcbf29ce484222325;
    const FNV_PRIME: u64 = 0x100000001b3;

    let mut hash = FNV_OFFSET;
    for byte in json.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(FNV_PRIME);
    }

    format!("{hash:016x}")
}

pub async fn is_bundled_game_current(
    pool: &SqlitePool,
    game_id: &str,
    fingerprint: &str,
) -> Result<bool, sqlx::Error> {
    let game_exists: Option<i64> =
        sqlx::query_scalar("SELECT 1 FROM games WHERE id = ?1 LIMIT 1")
            .bind(game_id)
            .fetch_optional(pool)
            .await?;

    if game_exists.is_none() {
        return Ok(false);
    }

    let key = format!("{BUNDLED_GAME_FINGERPRINT_PREFIX}{game_id}");
    let stored: Option<String> =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = ?1")
            .bind(key)
            .fetch_optional(pool)
            .await?;

    Ok(stored.as_deref() == Some(fingerprint))
}

pub async fn set_bundled_game_fingerprint(
    pool: &SqlitePool,
    game_id: &str,
    fingerprint: &str,
) -> Result<(), sqlx::Error> {
    let key = format!("{BUNDLED_GAME_FINGERPRINT_PREFIX}{game_id}");

    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(key)
    .bind(fingerprint)
    .execute(pool)
    .await?;

    Ok(())
}

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

    let mut tx = pool.begin().await?;

    import_pokemon_moves_batch(&mut tx, game_id, &data.pokemon_overrides).await?;
    import_pokemon_abilities_batch(&mut tx, game_id, &data.pokemon_overrides).await?;
    import_pokemon_locations_batch(&mut tx, game_id, &data.pokemon_overrides).await?;
    import_move_overrides_batch(&mut tx, game_id, &data.move_overrides).await?;
    import_item_locations_batch(&mut tx, game_id, &data.item_locations).await?;

    tx.commit().await?;

    Ok(game_id.clone())
}

async fn import_pokemon_moves_batch(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    game_id: &str,
    pokemon_overrides: &[PokemonOverride],
) -> Result<(), sqlx::Error> {
    let rows: Vec<(&str, &LearnsetEntry)> = pokemon_overrides
        .iter()
        .flat_map(|pokemon| {
            pokemon
                .learnset
                .iter()
                .map(move |entry| (pokemon.name_key.as_str(), entry))
        })
        .collect();

    for chunk in rows.chunks(BATCH_ROWS) {
        let mut builder = QueryBuilder::<Sqlite>::new(
            "INSERT OR IGNORE INTO game_pokemon_moves \
             (game_id, pokemon_name_key, move_name_key, learn_method, level_learned_at) ",
        );

        builder.push_values(chunk.iter(), |mut row, item| {
            let (pokemon_name_key, entry) = *item;
            row.push_bind(game_id)
                .push_bind(pokemon_name_key)
                .push_bind(&entry.move_name_key)
                .push_bind(&entry.learn_method)
                .push_bind(entry.level);
        });

        builder.build().execute(&mut **tx).await?;
    }

    Ok(())
}

async fn import_pokemon_abilities_batch(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    game_id: &str,
    pokemon_overrides: &[PokemonOverride],
) -> Result<(), sqlx::Error> {
    let rows: Vec<(&str, &AbilityOverrideEntry)> = pokemon_overrides
        .iter()
        .flat_map(|pokemon| {
            pokemon
                .abilities
                .iter()
                .map(move |ability| (pokemon.name_key.as_str(), ability))
        })
        .collect();

    for chunk in rows.chunks(BATCH_ROWS) {
        let mut builder = QueryBuilder::<Sqlite>::new(
            "INSERT OR REPLACE INTO game_pokemon_abilities \
             (game_id, pokemon_name_key, ability_key, slot, is_hidden) ",
        );

        builder.push_values(chunk.iter(), |mut row, item| {
            let (pokemon_name_key, ability) = *item;
            row.push_bind(game_id)
                .push_bind(pokemon_name_key)
                .push_bind(&ability.ability_key)
                .push_bind(ability.slot)
                .push_bind(ability.is_hidden as i64);
        });

        builder.build().execute(&mut **tx).await?;
    }

    Ok(())
}

async fn import_pokemon_locations_batch(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    game_id: &str,
    pokemon_overrides: &[PokemonOverride],
) -> Result<(), sqlx::Error> {
    let rows: Vec<(&str, &str)> = pokemon_overrides
        .iter()
        .flat_map(|pokemon| {
            pokemon
                .locations
                .iter()
                .map(move |location| (pokemon.name_key.as_str(), location.as_str()))
        })
        .collect();

    for chunk in rows.chunks(BATCH_ROWS) {
        let mut builder = QueryBuilder::<Sqlite>::new(
            "INSERT OR IGNORE INTO game_pokemon_locations \
             (game_id, pokemon_name_key, location) ",
        );

        builder.push_values(chunk.iter(), |mut row, item| {
            let (pokemon_name_key, location) = *item;
            row.push_bind(game_id)
                .push_bind(pokemon_name_key)
                .push_bind(location);
        });

        builder.build().execute(&mut **tx).await?;
    }

    Ok(())
}

async fn import_move_overrides_batch(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    game_id: &str,
    move_overrides: &[MoveOverrideEntry],
) -> Result<(), sqlx::Error> {
    for chunk in move_overrides.chunks(BATCH_ROWS) {
        let mut builder = QueryBuilder::<Sqlite>::new(
            "INSERT OR REPLACE INTO game_move_overrides \
             (game_id, move_name_key, power, accuracy, type_key, pp, damage_class, effect_en) ",
        );

        builder.push_values(chunk.iter(), |mut row, mo| {
            row.push_bind(game_id)
                .push_bind(&mo.name_key)
                .push_bind(mo.power)
                .push_bind(mo.accuracy)
                .push_bind(&mo.type_key)
                .push_bind(mo.pp)
                .push_bind(&mo.damage_class)
                .push_bind(&mo.effect_en);
        });

        builder.build().execute(&mut **tx).await?;
    }

    Ok(())
}

async fn import_item_locations_batch(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    game_id: &str,
    item_locations: &[ItemLocationEntry],
) -> Result<(), sqlx::Error> {
    let rows: Vec<(&str, &str)> = item_locations
        .iter()
        .flat_map(|item| {
            item.locations
                .iter()
                .map(move |location| (item.name_key.as_str(), location.as_str()))
        })
        .collect();

    for chunk in rows.chunks(BATCH_ROWS) {
        let mut builder = QueryBuilder::<Sqlite>::new(
            "INSERT OR IGNORE INTO game_item_locations \
             (game_id, item_name_key, location) ",
        );

        builder.push_values(chunk.iter(), |mut row, item| {
            let (item_name_key, location) = *item;
            row.push_bind(game_id)
                .push_bind(item_name_key)
                .push_bind(location);
        });

        builder.build().execute(&mut **tx).await?;
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
