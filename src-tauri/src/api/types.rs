use serde::Deserialize;

use super::client::PokeApiClient;

// ── PokéAPI type response structs ───────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ApiType {
    pub id: i64,
    pub name: String,
    pub names: Vec<ApiTypeName>,
    pub damage_relations: ApiDamageRelations,
}

#[derive(Debug, Deserialize)]
pub struct ApiTypeName {
    pub name: String,
    pub language: ApiTypeLangRef,
}

#[derive(Debug, Deserialize)]
pub struct ApiTypeLangRef {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiDamageRelations {
    pub double_damage_to: Vec<ApiTypeRef>,
    pub half_damage_to: Vec<ApiTypeRef>,
    pub no_damage_to: Vec<ApiTypeRef>,
    pub double_damage_from: Vec<ApiTypeRef>,
    pub half_damage_from: Vec<ApiTypeRef>,
    pub no_damage_from: Vec<ApiTypeRef>,
}

#[derive(Debug, Deserialize)]
pub struct ApiTypeRef {
    pub name: String,
    pub url: String,
}

/// Parsed type data ready for caching.
#[derive(Debug, Clone)]
pub struct ParsedType {
    pub id: i64,
    pub name_key: String,
    pub name_en: Option<String>,
    pub name_fr: Option<String>,
}

/// Parsed type efficacy entry.
#[derive(Debug, Clone)]
pub struct ParsedTypeEfficacy {
    pub attacking_type_id: i64,
    pub defending_type_id: i64,
    pub damage_factor: i64,
}

impl PokeApiClient {
    /// Fetch a single type by ID from PokéAPI.
    pub async fn fetch_type(&self, id: i64) -> Result<(ParsedType, Vec<ParsedTypeEfficacy>), reqwest::Error> {
        let url = self.url(&format!("type/{}", id));
        let api: ApiType = self.get_json(&url).await?;
        Ok(parse_type(api))
    }
}

fn parse_type(api: ApiType) -> (ParsedType, Vec<ParsedTypeEfficacy>) {
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

    let parsed_type = ParsedType {
        id: api.id,
        name_key: api.name,
        name_en,
        name_fr,
    };

    // Build efficacy entries from damage_relations
    let mut efficacies = Vec::new();

    // double_damage_to => 200
    for target in &api.damage_relations.double_damage_to {
        if let Some(tid) = PokeApiClient::id_from_url(&target.url) {
            efficacies.push(ParsedTypeEfficacy {
                attacking_type_id: api.id,
                defending_type_id: tid,
                damage_factor: 200,
            });
        }
    }

    // half_damage_to => 50
    for target in &api.damage_relations.half_damage_to {
        if let Some(tid) = PokeApiClient::id_from_url(&target.url) {
            efficacies.push(ParsedTypeEfficacy {
                attacking_type_id: api.id,
                defending_type_id: tid,
                damage_factor: 50,
            });
        }
    }

    // no_damage_to => 0
    for target in &api.damage_relations.no_damage_to {
        if let Some(tid) = PokeApiClient::id_from_url(&target.url) {
            efficacies.push(ParsedTypeEfficacy {
                attacking_type_id: api.id,
                defending_type_id: tid,
                damage_factor: 0,
            });
        }
    }

    (parsed_type, efficacies)
}
