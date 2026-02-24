use reqwest::Client;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Wrapper around reqwest::Client for PokéAPI requests.
#[derive(Debug, Clone)]
pub struct PokeApiClient {
    pub client: Client,
    pub base_url: String,
}

/// Generic paginated list response from PokéAPI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedList {
    pub count: i64,
    pub next: Option<String>,
    pub previous: Option<String>,
    pub results: Vec<NamedApiResource>,
}

/// A reference to a named API resource.
/// Note: some endpoints (e.g. evolution-chain) return items without a `name` field.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NamedApiResource {
    #[serde(default)]
    pub name: String,
    pub url: String,
}

impl PokeApiClient {
    /// Create a new PokeApiClient with default settings.
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");

        Self {
            client,
            base_url: "https://pokeapi.co/api/v2".to_string(),
        }
    }

    /// Fetch JSON from a URL (single attempt, no internal retry).
    pub async fn get_json<T: DeserializeOwned>(&self, url: &str) -> Result<T, reqwest::Error> {
        let resp = self.client.get(url).send().await?.error_for_status()?;
        resp.json::<T>().await
    }

    /// Build a full API URL from a relative path.
    pub fn url(&self, path: &str) -> String {
        format!("{}/{}", self.base_url, path.trim_start_matches('/'))
    }

    /// Fetch the complete list of a resource (handles pagination).
    /// Uses limit=10000 to get everything in one request (PokéAPI supports this).
    pub async fn get_resource_list(
        &self,
        endpoint: &str,
    ) -> Result<Vec<NamedApiResource>, reqwest::Error> {
        let url = self.url(&format!("{}?limit=10000&offset=0", endpoint));
        let page: PaginatedList = self.get_json(&url).await?;
        Ok(page.results)
    }

    /// Extract the numeric ID from a PokéAPI resource URL.
    /// e.g., "https://pokeapi.co/api/v2/pokemon/25/" -> 25
    pub fn id_from_url(url: &str) -> Option<i64> {
        url.trim_end_matches('/')
            .rsplit('/')
            .next()
            .and_then(|s| s.parse::<i64>().ok())
    }
}

impl Default for PokeApiClient {
    fn default() -> Self {
        Self::new()
    }
}
