use sqlx::SqlitePool;

use crate::api::moves::ParsedMove;
use crate::api::pokemon::ParsedPokemonMove;

/// Upsert a move record.
pub async fn upsert_move(pool: &SqlitePool, m: &ParsedMove) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO moves (id, name_key, name_en, name_fr, type_key, damage_class, power, accuracy, pp, priority, effect_en, effect_fr)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
         ON CONFLICT(id) DO UPDATE SET
           name_key = excluded.name_key,
           name_en = excluded.name_en,
           name_fr = excluded.name_fr,
           type_key = excluded.type_key,
           damage_class = excluded.damage_class,
           power = excluded.power,
           accuracy = excluded.accuracy,
           pp = excluded.pp,
           priority = excluded.priority,
           effect_en = excluded.effect_en,
           effect_fr = excluded.effect_fr"
    )
    .bind(m.id)
    .bind(&m.name_key)
    .bind(&m.name_en)
    .bind(&m.name_fr)
    .bind(&m.type_key)
    .bind(&m.damage_class)
    .bind(m.power)
    .bind(m.accuracy)
    .bind(m.pp)
    .bind(m.priority)
    .bind(&m.effect_en)
    .bind(&m.effect_fr)
    .execute(pool)
    .await?;

    Ok(())
}

/// Upsert a pokemon-move junction record.
pub async fn upsert_pokemon_move(
    pool: &SqlitePool,
    pokemon_id: i64,
    pm: &ParsedPokemonMove,
) -> Result<(), sqlx::Error> {
    // We need the move_id; if it was extracted from the URL, use it.
    // Otherwise skip this entry since we can't create the FK reference.
    let move_id = match pm.move_id {
        Some(id) => id,
        None => return Ok(()),
    };

    sqlx::query(
        "INSERT INTO pokemon_moves (pokemon_id, move_id, learn_method, level_learned_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(pokemon_id, move_id, learn_method) DO UPDATE SET
           level_learned_at = excluded.level_learned_at"
    )
    .bind(pokemon_id)
    .bind(move_id)
    .bind(&pm.learn_method)
    .bind(pm.level_learned_at)
    .execute(pool)
    .await?;

    Ok(())
}
