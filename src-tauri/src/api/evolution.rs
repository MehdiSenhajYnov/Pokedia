use serde::Deserialize;

use super::client::PokeApiClient;
use crate::models::EvolutionNode;

// ── PokéAPI evolution chain response structs ────────────────────────

#[derive(Debug, Deserialize)]
pub struct ApiEvolutionChain {
    pub id: i64,
    pub chain: ApiChainLink,
}

#[derive(Debug, Deserialize)]
pub struct ApiChainLink {
    pub species: ApiEvoResourceRef,
    pub evolution_details: Vec<ApiEvolutionDetail>,
    pub evolves_to: Vec<ApiChainLink>,
}

#[derive(Debug, Deserialize)]
pub struct ApiEvolutionDetail {
    pub trigger: Option<ApiEvoResourceRef>,
    pub min_level: Option<i64>,
    pub item: Option<ApiEvoResourceRef>,
    pub held_item: Option<ApiEvoResourceRef>,
    pub min_happiness: Option<i64>,
    pub time_of_day: Option<String>,
    pub known_move: Option<ApiEvoResourceRef>,
    pub location: Option<ApiEvoResourceRef>,
}

#[derive(Debug, Deserialize)]
pub struct ApiEvoResourceRef {
    pub name: String,
    pub url: String,
}

impl PokeApiClient {
    /// Fetch an evolution chain by ID from PokéAPI.
    pub async fn fetch_evolution_chain(
        &self,
        id: i64,
    ) -> Result<(i64, EvolutionNode), reqwest::Error> {
        let url = self.url(&format!("evolution-chain/{}", id));
        let api: ApiEvolutionChain = self.get_json(&url).await?;
        let node = parse_chain_link(&api.chain);
        Ok((api.id, node))
    }
}

/// Recursively parse the chain link into our EvolutionNode model.
fn parse_chain_link(link: &ApiChainLink) -> EvolutionNode {
    let pokemon_id = PokeApiClient::id_from_url(&link.species.url);

    // Build trigger description from the first evolution detail (if any)
    let (trigger, trigger_detail) = if let Some(detail) = link.evolution_details.first() {
        let trigger_name = detail.trigger.as_ref().map(|t| t.name.clone());
        let detail_str = build_trigger_detail(detail);
        (trigger_name, detail_str)
    } else {
        (None, None)
    };

    let evolves_to = link.evolves_to.iter().map(parse_chain_link).collect();

    EvolutionNode {
        pokemon_id,
        name_key: link.species.name.clone(),
        name_en: None,  // will be enriched from DB later
        name_fr: None,
        sprite_url: None,
        trigger,
        trigger_detail,
        evolves_to,
    }
}

/// Build a human-readable trigger detail string.
fn build_trigger_detail(detail: &ApiEvolutionDetail) -> Option<String> {
    let mut parts = Vec::new();

    if let Some(level) = detail.min_level {
        parts.push(format!("Level {}", level));
    }
    if let Some(ref item) = detail.item {
        parts.push(format!("Use {}", item.name));
    }
    if let Some(ref held) = detail.held_item {
        parts.push(format!("Hold {}", held.name));
    }
    if let Some(happiness) = detail.min_happiness {
        parts.push(format!("Happiness {}", happiness));
    }
    if let Some(ref tod) = detail.time_of_day {
        if !tod.is_empty() {
            parts.push(format!("at {}", tod));
        }
    }
    if let Some(ref known_move) = detail.known_move {
        parts.push(format!("Know {}", known_move.name));
    }
    if let Some(ref location) = detail.location {
        parts.push(format!("at {}", location.name));
    }

    if parts.is_empty() {
        None
    } else {
        Some(parts.join(", "))
    }
}
