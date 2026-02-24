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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NamedApiResource {
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

    /// Fetch JSON from a URL with retry logic (3 attempts, exponential backoff).
    pub async fn get_json<T: DeserializeOwned>(&self, url: &str) -> Result<T, reqwest::Error> {
        let mut last_err = None;

        for attempt in 0..3u32 {
            if attempt > 0 {
                let delay = Duration::from_millis(500 * 2u64.pow(attempt - 1));
                tokio::time::sleep(delay).await;
            }

            match self.client.get(url).send().await {
                Ok(resp) => match resp.error_for_status() {
                    Ok(resp) => return resp.json::<T>().await,
                    Err(e) => {
                        log::warn!("HTTP error on attempt {} for {}: {}", attempt + 1, url, e);
                        last_err = Some(e);
                    }
                },
                Err(e) => {
                    log::warn!("Request error on attempt {} for {}: {}", attempt + 1, url, e);
                    last_err = Some(e);
                }
            }
        }

        Err(last_err.unwrap())
    }

    /// Build a full API URL from a relative path.
    pub fn url(&self, path: &str) -> String {
        format!("{}/{}", self.base_url, path.trim_start_matches('/'))
    }

    /// Fetch the complete list of a resource (handles pagination).
    /// Returns all NamedApiResource entries for the given endpoint.
    pub async fn get_resource_list(
        &self,
        endpoint: &str,
    ) -> Result<Vec<NamedApiResource>, reqwest::Error> {
        let mut all_results = Vec::new();
        let mut url = self.url(&format!("{}?limit=100&offset=0", endpoint));

        loop {
            let page: PaginatedList = self.get_json(&url).await?;
            all_results.extend(page.results);

            match page.next {
                Some(next_url) => url = next_url,
                None => break,
            }
        }

        Ok(all_results)
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
