use sqlx::SqlitePool;

use crate::api::pokemon::{ParsedAbility, ParsedPokemon};
use crate::api::species::ParsedSpecies;

/// Upsert a pokemon record (without species data).
pub async fn upsert_pokemon(
    pool: &SqlitePool,
    p: &ParsedPokemon,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO pokemon (id, name_key, type1_key, type2_key, hp, atk, def, spa, spd, spe, base_stat_total, sprite_url, height, weight)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
         ON CONFLICT(id) DO UPDATE SET
           name_key = excluded.name_key,
           type1_key = excluded.type1_key,
           type2_key = excluded.type2_key,
           hp = excluded.hp,
           atk = excluded.atk,
           def = excluded.def,
           spa = excluded.spa,
           spd = excluded.spd,
           spe = excluded.spe,
           base_stat_total = excluded.base_stat_total,
           sprite_url = excluded.sprite_url,
           height = excluded.height,
           weight = excluded.weight"
    )
    .bind(p.id)
    .bind(&p.name_key)
    .bind(&p.type1_key)
    .bind(&p.type2_key)
    .bind(p.hp)
    .bind(p.atk)
    .bind(p.def)
    .bind(p.spa)
    .bind(p.spd)
    .bind(p.spe)
    .bind(p.base_stat_total)
    .bind(&p.sprite_url)
    .bind(p.height)
    .bind(p.weight)
    .execute(pool)
    .await?;

    Ok(())
}

/// Update a pokemon with species-level data (names, descriptions, evolution chain).
pub async fn update_pokemon_species(
    pool: &SqlitePool,
    pokemon_id: i64,
    species: &ParsedSpecies,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE pokemon SET
           name_en = ?1,
           name_fr = ?2,
           description_en = ?3,
           description_fr = ?4,
           evolution_chain_id = ?5,
           species_id = ?6
         WHERE id = ?7"
    )
    .bind(&species.name_en)
    .bind(&species.name_fr)
    .bind(&species.description_en)
    .bind(&species.description_fr)
    .bind(species.evolution_chain_id)
    .bind(species.id)
    .bind(pokemon_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Upsert a pokemon ability.
pub async fn upsert_pokemon_ability(
    pool: &SqlitePool,
    pokemon_id: i64,
    ability: &ParsedAbility,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO pokemon_abilities (pokemon_id, ability_key, is_hidden, slot)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(pokemon_id, slot) DO UPDATE SET
           ability_key = excluded.ability_key,
           is_hidden = excluded.is_hidden"
    )
    .bind(pokemon_id)
    .bind(&ability.ability_key)
    .bind(ability.is_hidden as i64)
    .bind(ability.slot)
    .execute(pool)
    .await?;

    Ok(())
}

/// Upsert ability names (called after fetching ability details if needed).
pub async fn update_ability_names(
    pool: &SqlitePool,
    ability_key: &str,
    name_en: Option<&str>,
    name_fr: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE pokemon_abilities SET ability_en = ?1, ability_fr = ?2 WHERE ability_key = ?3"
    )
    .bind(name_en)
    .bind(name_fr)
    .bind(ability_key)
    .execute(pool)
    .await?;

    Ok(())
}
