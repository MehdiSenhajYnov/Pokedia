use serde::Deserialize;

use super::client::PokeApiClient;

// ── PokéAPI move response structs ───────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ApiMove {
    pub id: i64,
    pub name: String,
    pub names: Vec<ApiMoveName>,
    #[serde(rename = "type")]
    pub type_info: ApiMoveResourceRef,
    pub damage_class: Option<ApiMoveResourceRef>,
    pub power: Option<i64>,
    pub accuracy: Option<i64>,
    pub pp: Option<i64>,
    pub priority: Option<i64>,
    pub effect_entries: Vec<ApiMoveEffectEntry>,
    pub flavor_text_entries: Vec<ApiMoveFlavorText>,
}

#[derive(Debug, Deserialize)]
pub struct ApiMoveName {
    pub name: String,
    pub language: ApiMoveLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiMoveResourceRef {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiMoveEffectEntry {
    pub effect: Option<String>,
    pub short_effect: Option<String>,
    pub language: ApiMoveLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiMoveFlavorText {
    pub flavor_text: String,
    pub language: ApiMoveLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiMoveLangRef {
    pub name: String,
}

/// Extracted move data ready for caching.
#[derive(Debug, Clone)]
pub struct ParsedMove {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub type_key: String,
    pub damage_class: Option<String>,
    pub power: Option<i64>,
    pub accuracy: Option<i64>,
    pub pp: Option<i64>,
    pub priority: i64,
    pub effect_en: Option<String>,
    pub effect_fr: Option<String>,
}

impl PokeApiClient {
    /// Fetch a single move by ID from PokéAPI.
    pub async fn fetch_move(&self, id: i64) -> Result<ParsedMove, reqwest::Error> {
        let url = self.url(&format!("move/{}", id));
        let api: ApiMove = self.get_json(&url).await?;
        Ok(parse_move(api))
    }
}

fn parse_move(api: ApiMove) -> ParsedMove {
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

    // Prefer short_effect in English, fall back to flavor text
    let effect_en = api
        .effect_entries
        .iter()
        .find(|e| e.language.name == "en")
        .and_then(|e| e.short_effect.clone().or(e.effect.clone()));

    // For French, try effect_entries first, then flavor text
    let effect_fr = api
        .effect_entries
        .iter()
        .find(|e| e.language.name == "fr")
        .and_then(|e| e.short_effect.clone().or(e.effect.clone()))
        .or_else(|| {
            api.flavor_text_entries
                .iter()
                .find(|f| f.language.name == "fr")
                .map(|f| f.flavor_text.clone())
        });

    ParsedMove {
        id: api.id,
        name_key: api.name,
        name_en,
        name_fr,
        type_key: api.type_info.name,
        damage_class: api.damage_class.map(|dc| dc.name),
        power: api.power,
        accuracy: api.accuracy,
        pp: api.pp,
        priority: api.priority.unwrap_or(0),
        effect_en,
        effect_fr,
    }
}
