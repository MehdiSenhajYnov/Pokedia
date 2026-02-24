use sqlx::SqlitePool;

use crate::api::abilities::{ParsedAbility, ParsedAbilityPokemon};

pub async fn upsert_ability(pool: &SqlitePool, ability: &ParsedAbility) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO abilities (id, name_key, name_en, name_fr, effect_en, effect_fr, short_effect_en, short_effect_fr, generation)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(id) DO UPDATE SET
           name_key = excluded.name_key,
           name_en = excluded.name_en,
           name_fr = excluded.name_fr,
           effect_en = excluded.effect_en,
           effect_fr = excluded.effect_fr,
           short_effect_en = excluded.short_effect_en,
           short_effect_fr = excluded.short_effect_fr,
           generation = excluded.generation"
    )
    .bind(ability.id)
    .bind(&ability.name_key)
    .bind(&ability.name_en)
    .bind(&ability.name_fr)
    .bind(&ability.effect_en)
    .bind(&ability.effect_fr)
    .bind(&ability.short_effect_en)
    .bind(&ability.short_effect_fr)
    .bind(ability.generation)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn upsert_ability_pokemon(
    pool: &SqlitePool,
    ability_id: i64,
    ap: &ParsedAbilityPokemon,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO ability_pokemon (ability_id, pokemon_id, is_hidden)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(ability_id, pokemon_id, is_hidden) DO NOTHING"
    )
    .bind(ability_id)
    .bind(ap.pokemon_id)
    .bind(ap.is_hidden as i64)
    .execute(pool)
    .await?;

    Ok(())
}
