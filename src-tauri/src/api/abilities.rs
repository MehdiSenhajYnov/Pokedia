use serde::Deserialize;

use super::client::PokeApiClient;

#[derive(Debug, Deserialize)]
pub struct ApiAbility {
    pub id: i64,
    pub name: String,
    pub names: Vec<ApiAbilityName>,
    pub effect_entries: Vec<ApiAbilityEffectEntry>,
    pub flavor_text_entries: Vec<ApiAbilityFlavorText>,
    pub generation: ApiAbilityGenRef,
    pub pokemon: Vec<ApiAbilityPokemon>,
}

#[derive(Debug, Deserialize)]
pub struct ApiAbilityName {
    pub name: String,
    pub language: ApiAbilityLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiAbilityLangRef {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiAbilityEffectEntry {
    pub effect: Option<String>,
    pub short_effect: Option<String>,
    pub language: ApiAbilityLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiAbilityFlavorText {
    pub flavor_text: String,
    pub language: ApiAbilityLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiAbilityGenRef {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiAbilityPokemon {
    pub is_hidden: bool,
    pub pokemon: ApiAbilityPokemonRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiAbilityPokemonRef {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Clone)]
pub struct ParsedAbility {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub effect_en: Option<String>,
    pub effect_fr: Option<String>,
    pub short_effect_en: Option<String>,
    pub short_effect_fr: Option<String>,
    pub generation: Option<i64>,
    pub pokemon: Vec<ParsedAbilityPokemon>,
}

#[derive(Debug, Clone)]
pub struct ParsedAbilityPokemon {
    pub pokemon_id: i64,
    pub is_hidden: bool,
}

impl PokeApiClient {
    pub async fn fetch_ability(&self, id: i64) -> Result<ParsedAbility, reqwest::Error> {
        let url = self.url(&format!("ability/{}", id));
        let api: ApiAbility = self.get_json(&url).await?;
        Ok(parse_ability(api))
    }
}

fn parse_ability(api: ApiAbility) -> ParsedAbility {
    let name_en = api
        .names
        .iter()
        .find(|n| n.language.name == "en")
        .map(|n| n.name.clone());

    let name_fr = api
        .names
        .iter()
        .find(|n| n.language.name == "fr")
        .map(|n| n.name.clone());

    let effect_en = api
        .effect_entries
        .iter()
        .find(|e| e.language.name == "en")
        .and_then(|e| e.effect.clone());

    let effect_fr = api
        .effect_entries
        .iter()
        .find(|e| e.language.name == "fr")
        .and_then(|e| e.effect.clone())
        .or_else(|| {
            api.flavor_text_entries
                .iter()
                .filter(|f| f.language.name == "fr")
                .last()
                .map(|f| f.flavor_text.clone())
        });

    let short_effect_en = api
        .effect_entries
        .iter()
        .find(|e| e.language.name == "en")
        .and_then(|e| e.short_effect.clone());

    let short_effect_fr = api
        .effect_entries
        .iter()
        .find(|e| e.language.name == "fr")
        .and_then(|e| e.short_effect.clone());

    let generation = PokeApiClient::id_from_url(&api.generation.url);

    let pokemon = api
        .pokemon
        .iter()
        .filter_map(|p| {
            PokeApiClient::id_from_url(&p.pokemon.url).map(|pid| ParsedAbilityPokemon {
                pokemon_id: pid,
                is_hidden: p.is_hidden,
            })
        })
        .collect();

    ParsedAbility {
        id: api.id,
        name_key: api.name,
        name_en,
        name_fr,
        effect_en,
        effect_fr,
        short_effect_en,
        short_effect_fr,
        generation,
        pokemon,
    }
}
