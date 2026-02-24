use serde::Deserialize;

use super::client::PokeApiClient;

#[derive(Debug, Deserialize)]
pub struct ApiNature {
    pub id: i64,
    pub name: String,
    pub names: Vec<ApiNatureName>,
    pub increased_stat: Option<ApiNatureStatRef>,
    pub decreased_stat: Option<ApiNatureStatRef>,
    pub likes_flavor: Option<ApiNatureFlavorRef>,
    pub hates_flavor: Option<ApiNatureFlavorRef>,
}

#[derive(Debug, Deserialize)]
pub struct ApiNatureName {
    pub name: String,
    pub language: ApiNatureLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiNatureLangRef {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiNatureStatRef {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiNatureFlavorRef {
    pub name: String,
}

#[derive(Debug, Clone)]
pub struct ParsedNature {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
    pub increased_stat: Option<String>,
    pub decreased_stat: Option<String>,
    pub likes_flavor: Option<String>,
    pub hates_flavor: Option<String>,
}

impl PokeApiClient {
    pub async fn fetch_nature(&self, id: i64) -> Result<ParsedNature, reqwest::Error> {
        let url = self.url(&format!("nature/{}", id));
        let api: ApiNature = self.get_json(&url).await?;
        Ok(parse_nature(api))
    }
}

fn parse_nature(api: ApiNature) -> ParsedNature {
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

    ParsedNature {
        id: api.id,
        name_key: api.name,
        name_en,
        name_fr,
        increased_stat: api.increased_stat.map(|s| s.name),
        decreased_stat: api.decreased_stat.map(|s| s.name),
        likes_flavor: api.likes_flavor.map(|f| f.name),
        hates_flavor: api.hates_flavor.map(|f| f.name),
    }
}
