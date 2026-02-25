use serde::{Deserialize, Serialize};

use super::client::PokeApiClient;

// ── PokéAPI response structs ────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ApiPokemon {
    pub id: i64,
    pub name: String,
    pub height: Option<i64>,
    pub weight: Option<i64>,
    pub types: Vec<ApiPokemonTypeSlot>,
    pub stats: Vec<ApiPokemonStat>,
    pub abilities: Vec<ApiPokemonAbilitySlot>,
    pub moves: Vec<ApiPokemonMoveEntry>,
    pub sprites: ApiSprites,
    pub species: ApiResourceRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiPokemonTypeSlot {
    pub slot: i64,
    #[serde(rename = "type")]
    pub type_info: ApiResourceRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiPokemonStat {
    pub base_stat: i64,
    pub stat: ApiResourceRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiPokemonAbilitySlot {
    pub ability: ApiResourceRef,
    pub is_hidden: bool,
    pub slot: i64,
}

#[derive(Debug, Deserialize)]
pub struct ApiPokemonMoveEntry {
    #[serde(rename = "move")]
    pub move_info: ApiResourceRef,
    pub version_group_details: Vec<ApiVersionGroupDetail>,
}

#[derive(Debug, Deserialize)]
pub struct ApiVersionGroupDetail {
    pub level_learned_at: i64,
    pub move_learn_method: ApiResourceRef,
    pub version_group: ApiResourceRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiSprites {
    pub front_default: Option<String>,
    pub other: Option<ApiOtherSprites>,
}

#[derive(Debug, Deserialize)]
pub struct ApiOtherSprites {
    #[serde(rename = "official-artwork")]
    pub official_artwork: Option<ApiOfficialArtwork>,
}

#[derive(Debug, Deserialize)]
pub struct ApiOfficialArtwork {
    pub front_default: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResourceRef {
    pub name: String,
    pub url: String,
}

/// Parsed pokemon data ready for caching.
#[derive(Debug, Clone)]
pub struct ParsedPokemon {
    pub id: i64,
    pub name_key: String,
    pub type1_key: Option<String>,
    pub type2_key: Option<String>,
    pub hp: i64,
    pub atk: i64,
    pub def: i64,
    pub spa: i64,
    pub spd: i64,
    pub spe: i64,
    pub base_stat_total: i64,
    pub sprite_url: Option<String>,
    pub height: Option<i64>,
    pub weight: Option<i64>,
    pub species_url: String,
    pub abilities: Vec<ParsedAbility>,
    pub moves: Vec<ParsedPokemonMove>,
    pub version_group_moves: Vec<ParsedVersionGroupMove>,
}

#[derive(Debug, Clone)]
pub struct ParsedAbility {
    pub ability_key: String,
    pub is_hidden: bool,
    pub slot: i64,
}

#[derive(Debug, Clone)]
pub struct ParsedPokemonMove {
    pub move_name: String,
    pub move_id: Option<i64>,
    pub learn_method: String,
    pub level_learned_at: i64,
}

/// A move entry associated with a specific version group (for game-specific learnsets).
#[derive(Debug, Clone)]
pub struct ParsedVersionGroupMove {
    pub version_group: String,
    pub move_name: String,
    pub learn_method: String,
    pub level_learned_at: i64,
}

impl PokeApiClient {
    /// Fetch a single pokemon by ID from PokéAPI.
    pub async fn fetch_pokemon(&self, id: i64) -> Result<ParsedPokemon, reqwest::Error> {
        let url = self.url(&format!("pokemon/{}", id));
        let api: ApiPokemon = self.get_json(&url).await?;
        Ok(parse_pokemon(api))
    }
}

/// Extract structured data from the API response.
fn parse_pokemon(api: ApiPokemon) -> ParsedPokemon {
    let type1 = api.types.iter().find(|t| t.slot == 1).map(|t| t.type_info.name.clone());
    let type2 = api.types.iter().find(|t| t.slot == 2).map(|t| t.type_info.name.clone());

    // Map stat names to values
    let stat = |name: &str| -> i64 {
        api.stats
            .iter()
            .find(|s| s.stat.name == name)
            .map(|s| s.base_stat)
            .unwrap_or(0)
    };
    let hp = stat("hp");
    let atk = stat("attack");
    let def = stat("defense");
    let spa = stat("special-attack");
    let spd = stat("special-defense");
    let spe = stat("speed");

    // Prefer official artwork, fall back to front_default
    let sprite_url = api
        .sprites
        .other
        .as_ref()
        .and_then(|o| o.official_artwork.as_ref())
        .and_then(|a| a.front_default.clone())
        .or(api.sprites.front_default);

    let abilities = api
        .abilities
        .iter()
        .map(|a| ParsedAbility {
            ability_key: a.ability.name.clone(),
            is_hidden: a.is_hidden,
            slot: a.slot,
        })
        .collect();

    // Take only the latest version group detail per move to keep data small
    let moves = api
        .moves
        .iter()
        .flat_map(|m| {
            // Use the last version group detail (most recent game)
            let move_id = PokeApiClient::id_from_url(&m.move_info.url);
            m.version_group_details.last().map(|vgd| ParsedPokemonMove {
                move_name: m.move_info.name.clone(),
                move_id,
                learn_method: vgd.move_learn_method.name.clone(),
                level_learned_at: vgd.level_learned_at,
            })
        })
        .collect();

    // Collect all version group details for game-specific learnsets
    let version_group_moves = api
        .moves
        .iter()
        .flat_map(|m| {
            m.version_group_details.iter().map(|vgd| ParsedVersionGroupMove {
                version_group: vgd.version_group.name.clone(),
                move_name: m.move_info.name.clone(),
                learn_method: vgd.move_learn_method.name.clone(),
                level_learned_at: vgd.level_learned_at,
            })
        })
        .collect();

    ParsedPokemon {
        id: api.id,
        name_key: api.name,
        type1_key: type1,
        type2_key: type2,
        hp,
        atk,
        def,
        spa,
        spd,
        spe,
        base_stat_total: hp + atk + def + spa + spd + spe,
        sprite_url,
        height: api.height,
        weight: api.weight,
        species_url: api.species.url,
        abilities,
        moves,
        version_group_moves,
    }
}
