use serde::Deserialize;

use super::client::PokeApiClient;

// ── PokéAPI item response structs ───────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ApiItem {
    pub id: i64,
    pub name: String,
    pub names: Vec<ApiItemName>,
    pub category: ApiItemResourceRef,
    pub effect_entries: Vec<ApiItemEffectEntry>,
    pub flavor_text_entries: Vec<ApiItemFlavorText>,
    pub sprites: ApiItemSprites,
}

#[derive(Debug, Deserialize)]
pub struct ApiItemName {
    pub name: String,
    pub language: ApiItemLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiItemResourceRef {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiItemEffectEntry {
    pub effect: Option<String>,
    pub short_effect: Option<String>,
    pub language: ApiItemLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiItemFlavorText {
    pub text: String,
    pub language: ApiItemLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiItemLangRef {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiItemSprites {
    pub default: Option<String>,
}

/// Extracted item data ready for caching.
#[derive(Debug, Clone)]
pub struct ParsedItem {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub category: String,
    pub effect_en: Option<String>,
    pub effect_fr: Option<String>,
    pub sprite_url: Option<String>,
}

impl PokeApiClient {
    /// Fetch a single item by ID from PokéAPI.
    pub async fn fetch_item(&self, id: i64) -> Result<ParsedItem, reqwest::Error> {
        let url = self.url(&format!("item/{}", id));
        let api: ApiItem = self.get_json(&url).await?;
        Ok(parse_item(api))
    }
}

fn parse_item(api: ApiItem) -> ParsedItem {
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
        .and_then(|e| e.short_effect.clone().or(e.effect.clone()));

    let effect_fr = api
        .effect_entries
        .iter()
        .find(|e| e.language.name == "fr")
        .and_then(|e| e.short_effect.clone().or(e.effect.clone()))
        .or_else(|| {
            api.flavor_text_entries
                .iter()
                .find(|f| f.language.name == "fr")
                .map(|f| f.text.clone())
        });

    ParsedItem {
        id: api.id,
        name_key: api.name,
        name_en,
        name_fr,
        category: api.category.name,
        effect_en,
        effect_fr,
        sprite_url: api.sprites.default,
    }
}
