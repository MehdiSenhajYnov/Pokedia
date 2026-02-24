use serde::Deserialize;

use super::client::PokeApiClient;

// ── PokéAPI species response structs ────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ApiPokemonSpecies {
    pub id: i64,
    pub name: String,
    pub names: Vec<ApiName>,
    pub flavor_text_entries: Vec<ApiFlavorText>,
    pub evolution_chain: Option<ApiEvolutionChainRef>,
}

#[derive(Debug, Deserialize)]
pub struct ApiName {
    pub name: String,
    pub language: ApiLanguageRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiFlavorText {
    pub flavor_text: String,
    pub language: ApiLanguageRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiLanguageRef {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiEvolutionChainRef {
    pub url: String,
}

/// Extracted species info for caching.
#[derive(Debug, Clone)]
pub struct ParsedSpecies {
    pub id: i64,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub description_en: Option<String>,
    pub description_fr: Option<String>,
    pub evolution_chain_id: Option<i64>,
}

impl PokeApiClient {
    /// Fetch species data by URL (as provided from the pokemon endpoint).
    pub async fn fetch_species_by_url(&self, url: &str) -> Result<ParsedSpecies, reqwest::Error> {
        let api: ApiPokemonSpecies = self.get_json(url).await?;
        Ok(parse_species(api))
    }

    /// Fetch species data by pokemon ID.
    pub async fn fetch_species(&self, id: i64) -> Result<ParsedSpecies, reqwest::Error> {
        let url = self.url(&format!("pokemon-species/{}", id));
        let api: ApiPokemonSpecies = self.get_json(&url).await?;
        Ok(parse_species(api))
    }
}

fn parse_species(api: ApiPokemonSpecies) -> ParsedSpecies {
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

    // Get the first English/French flavor text, cleaned of newlines
    let description_en = api
        .flavor_text_entries
        .iter()
        .find(|f| f.language.name == "en")
        .map(|f| clean_flavor_text(&f.flavor_text));

    let description_fr = api
        .flavor_text_entries
        .iter()
        .find(|f| f.language.name == "fr")
        .map(|f| clean_flavor_text(&f.flavor_text));

    let evolution_chain_id = api
        .evolution_chain
        .as_ref()
        .and_then(|ec| PokeApiClient::id_from_url(&ec.url));

    ParsedSpecies {
        id: api.id,
        name_en,
        name_fr,
        description_en,
        description_fr,
        evolution_chain_id,
    }
}

/// PokéAPI flavor text contains literal newlines and form feeds; clean them.
fn clean_flavor_text(text: &str) -> String {
    text.replace('\n', " ")
        .replace('\u{000c}', " ") // form feed
        .replace('\r', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}
