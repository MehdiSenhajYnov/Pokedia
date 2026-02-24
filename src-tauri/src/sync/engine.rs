use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use serde::Serialize;
use sqlx::SqlitePool;
use tauri::Emitter;
use tokio::sync::Semaphore;

use crate::api::client::PokeApiClient;
use crate::cache;

/// Global cancellation flag for sync operations.
pub static SYNC_CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

/// Event payload emitted to the frontend during sync.
#[derive(Debug, Clone, Serialize)]
pub struct SyncProgressEvent {
    pub resource: String,
    pub total: i64,
    pub completed: i64,
    pub status: String,
    pub error: Option<String>,
}

/// The sync engine coordinates fetching data from PokéAPI and caching it locally.
pub struct SyncEngine {
    pool: SqlitePool,
    client: Arc<PokeApiClient>,
    app_handle: tauri::AppHandle,
    semaphore: Arc<Semaphore>,
}

impl SyncEngine {
    pub fn new(
        pool: SqlitePool,
        client: Arc<PokeApiClient>,
        app_handle: tauri::AppHandle,
    ) -> Self {
        Self {
            pool,
            client,
            app_handle,
            semaphore: Arc::new(Semaphore::new(10)),
        }
    }

    /// Run the full sync pipeline: types -> moves -> (pokemon + items) -> evolution chains.
    /// Supports partial resume: resources with status "done" are skipped.
    pub async fn sync_all(&self) -> Result<(), String> {
        log::info!("Starting full sync...");

        // Phase 1: Types
        if self.is_resource_done("types").await {
            log::info!("Skipping types (already done)");
        } else if let Err(e) = self.sync_types().await {
            log::error!("Types sync failed: {}", e);
            self.update_sync_meta("types", 0, 0, "error", Some(&e)).await;
        }

        if self.is_cancelled() {
            log::info!("Sync cancelled after types phase");
            return Ok(());
        }

        // Phase 2: Moves
        if self.is_resource_done("moves").await {
            log::info!("Skipping moves (already done)");
        } else if let Err(e) = self.sync_moves().await {
            log::error!("Moves sync failed: {}", e);
            self.update_sync_meta("moves", 0, 0, "error", Some(&e)).await;
        }

        if self.is_cancelled() {
            log::info!("Sync cancelled after moves phase");
            return Ok(());
        }

        // Phase 3: Pokemon and Items in parallel
        let pk_done = self.is_resource_done("pokemon").await;
        let it_done = self.is_resource_done("items").await;

        if pk_done {
            log::info!("Skipping pokemon (already done)");
        }
        if it_done {
            log::info!("Skipping items (already done)");
        }

        if !pk_done || !it_done {
            let pool_pk = self.pool.clone();
            let pool_it = self.pool.clone();
            let client_pk = self.client.clone();
            let client_it = self.client.clone();
            let sem_pk = self.semaphore.clone();
            let sem_it = self.semaphore.clone();
            let app_pk = self.app_handle.clone();
            let app_it = self.app_handle.clone();

            let pokemon_handle = tokio::spawn(async move {
                if pk_done { return Ok(()); }
                let engine = SyncEngine {
                    pool: pool_pk,
                    client: client_pk,
                    app_handle: app_pk,
                    semaphore: sem_pk,
                };
                engine.sync_pokemon().await
            });

            let items_handle = tokio::spawn(async move {
                if it_done { return Ok(()); }
                let engine = SyncEngine {
                    pool: pool_it,
                    client: client_it,
                    app_handle: app_it,
                    semaphore: sem_it,
                };
                engine.sync_items().await
            });

            let (pk_result, it_result) = tokio::join!(pokemon_handle, items_handle);
            if let Err(e) = pk_result.unwrap_or(Err("Pokemon sync task panicked".to_string())) {
                log::error!("Pokemon sync failed: {}", e);
                self.update_sync_meta("pokemon", 0, 0, "error", Some(&e)).await;
            }
            if let Err(e) = it_result.unwrap_or(Err("Items sync task panicked".to_string())) {
                log::error!("Items sync failed: {}", e);
                self.update_sync_meta("items", 0, 0, "error", Some(&e)).await;
            }
        }

        if self.is_cancelled() {
            log::info!("Sync cancelled after pokemon/items phase");
            return Ok(());
        }

        // Phase 4: Evolution chains
        if self.is_resource_done("evolution_chains").await {
            log::info!("Skipping evolution chains (already done)");
        } else if let Err(e) = self.sync_evolution_chains().await {
            log::error!("Evolution chains sync failed: {}", e);
            self.update_sync_meta("evolution_chains", 0, 0, "error", Some(&e)).await;
        }

        if self.is_cancelled() {
            log::info!("Sync cancelled after evolution chains phase");
            return Ok(());
        }

        // Phase 5: Natures + Abilities in parallel
        let nat_done = self.is_resource_done("natures").await;
        let abi_done = self.is_resource_done("abilities").await;

        if nat_done {
            log::info!("Skipping natures (already done)");
        }
        if abi_done {
            log::info!("Skipping abilities (already done)");
        }

        if !nat_done || !abi_done {
            let pool_nat = self.pool.clone();
            let pool_abi = self.pool.clone();
            let client_nat = self.client.clone();
            let client_abi = self.client.clone();
            let sem_nat = self.semaphore.clone();
            let sem_abi = self.semaphore.clone();
            let app_nat = self.app_handle.clone();
            let app_abi = self.app_handle.clone();

            let natures_handle = tokio::spawn(async move {
                if nat_done { return Ok(()); }
                let engine = SyncEngine {
                    pool: pool_nat,
                    client: client_nat,
                    app_handle: app_nat,
                    semaphore: sem_nat,
                };
                engine.sync_natures().await
            });

            let abilities_handle = tokio::spawn(async move {
                if abi_done { return Ok(()); }
                let engine = SyncEngine {
                    pool: pool_abi,
                    client: client_abi,
                    app_handle: app_abi,
                    semaphore: sem_abi,
                };
                engine.sync_abilities().await
            });

            let (nat_result, abi_result) = tokio::join!(natures_handle, abilities_handle);
            if let Err(e) = nat_result.unwrap_or(Err("Natures sync task panicked".to_string())) {
                log::error!("Natures sync failed: {}", e);
                self.update_sync_meta("natures", 0, 0, "error", Some(&e)).await;
            }
            if let Err(e) = abi_result.unwrap_or(Err("Abilities sync task panicked".to_string())) {
                log::error!("Abilities sync failed: {}", e);
                self.update_sync_meta("abilities", 0, 0, "error", Some(&e)).await;
            }
        }

        // Validate data integrity
        self.validate_sync().await;

        log::info!("Full sync completed");
        Ok(())
    }

    // ── Types ────────────────────────────────────────────────────────

    async fn sync_types(&self) -> Result<(), String> {
        let resource = "types";
        self.update_sync_meta(resource, 0, 0, "syncing", None).await;

        let list = match self.retry(3, || async {
            self.client.get_resource_list("type").await
        }).await {
            Ok(l) => l,
            Err(e) => {
                let msg = e.to_string();
                self.update_sync_meta(resource, 0, 0, "error", Some(&msg)).await;
                return Err(msg);
            }
        };
        let total = list.len() as i64;
        self.update_sync_meta(resource, total, 0, "syncing", None).await;

        let mut completed: i64 = 0;

        for entry in &list {
            if self.is_cancelled() {
                self.update_sync_meta(resource, total, completed, "cancelled", None).await;
                return Ok(());
            }

            let id = match PokeApiClient::id_from_url(&entry.url) {
                Some(id) => id,
                None => continue,
            };

            let result = self.retry(3, || async {
                let _permit = self.semaphore.acquire().await.unwrap();
                self.client.fetch_type(id).await
            }).await;

            match result {
                Ok((parsed_type, efficacies)) => {
                    let _ = cache::types::upsert_type(&self.pool, &parsed_type).await;
                    for te in &efficacies {
                        let _ = cache::types::upsert_type_efficacy(&self.pool, te).await;
                    }
                }
                Err(e) => {
                    log::warn!("Failed to fetch type {}: {}", id, e);
                }
            }

            completed += 1;
            self.update_sync_meta(resource, total, completed, "syncing", None).await;
        }

        self.update_sync_meta(resource, total, completed, "done", None).await;
        Ok(())
    }

    // ── Moves ────────────────────────────────────────────────────────

    async fn sync_moves(&self) -> Result<(), String> {
        let resource = "moves";
        self.update_sync_meta(resource, 0, 0, "syncing", None).await;

        let list = match self.retry(3, || async {
            self.client.get_resource_list("move").await
        }).await {
            Ok(l) => l,
            Err(e) => {
                let msg = e.to_string();
                self.update_sync_meta(resource, 0, 0, "error", Some(&msg)).await;
                return Err(msg);
            }
        };
        let total = list.len() as i64;
        self.update_sync_meta(resource, total, 0, "syncing", None).await;

        let mut completed: i64 = 0;

        for entry in &list {
            if self.is_cancelled() {
                self.update_sync_meta(resource, total, completed, "cancelled", None).await;
                return Ok(());
            }

            let id = match PokeApiClient::id_from_url(&entry.url) {
                Some(id) => id,
                None => continue,
            };

            let result = self.retry(3, || async {
                let _permit = self.semaphore.acquire().await.unwrap();
                self.client.fetch_move(id).await
            }).await;

            match result {
                Ok(parsed_move) => {
                    let _ = cache::moves::upsert_move(&self.pool, &parsed_move).await;
                }
                Err(e) => {
                    log::warn!("Failed to fetch move {}: {}", id, e);
                }
            }

            completed += 1;
            if completed % 20 == 0 || completed == total {
                self.update_sync_meta(resource, total, completed, "syncing", None).await;
            }
        }

        self.update_sync_meta(resource, total, completed, "done", None).await;
        Ok(())
    }

    // ── Pokemon ──────────────────────────────────────────────────────

    async fn sync_pokemon(&self) -> Result<(), String> {
        let resource = "pokemon";
        self.update_sync_meta(resource, 0, 0, "syncing", None).await;

        let list = match self.retry(3, || async {
            self.client.get_resource_list("pokemon").await
        }).await {
            Ok(l) => l,
            Err(e) => {
                let msg = e.to_string();
                self.update_sync_meta(resource, 0, 0, "error", Some(&msg)).await;
                return Err(msg);
            }
        };
        let total = list.len() as i64;
        self.update_sync_meta(resource, total, 0, "syncing", None).await;

        let mut completed: i64 = 0;

        for entry in &list {
            if self.is_cancelled() {
                self.update_sync_meta(resource, total, completed, "cancelled", None).await;
                return Ok(());
            }

            let id = match PokeApiClient::id_from_url(&entry.url) {
                Some(id) => id,
                None => continue,
            };

            // Fetch pokemon data
            let pokemon_result = self.retry(3, || async {
                let _permit = self.semaphore.acquire().await.unwrap();
                self.client.fetch_pokemon(id).await
            }).await;

            match pokemon_result {
                Ok(parsed) => {
                    // Upsert pokemon
                    let _ = cache::pokemon::upsert_pokemon(&self.pool, &parsed).await;

                    // Upsert abilities
                    for ability in &parsed.abilities {
                        let _ = cache::pokemon::upsert_pokemon_ability(&self.pool, parsed.id, ability).await;
                    }

                    // Upsert pokemon-move references
                    for pm in &parsed.moves {
                        let _ = cache::moves::upsert_pokemon_move(&self.pool, parsed.id, pm).await;
                    }

                    // Fetch species data for names and descriptions
                    let species_result = self.retry(3, || async {
                        let _permit = self.semaphore.acquire().await.unwrap();
                        self.client.fetch_species_by_url(&parsed.species_url).await
                    }).await;

                    match species_result {
                        Ok(species) => {
                            let _ = cache::pokemon::update_pokemon_species(&self.pool, parsed.id, &species).await;
                        }
                        Err(e) => {
                            log::warn!("Failed to fetch species for pokemon {}: {}", id, e);
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Failed to fetch pokemon {}: {}", id, e);
                }
            }

            completed += 1;
            if completed % 10 == 0 || completed == total {
                self.update_sync_meta(resource, total, completed, "syncing", None).await;
            }
        }

        self.update_sync_meta(resource, total, completed, "done", None).await;
        Ok(())
    }

    // ── Items ────────────────────────────────────────────────────────

    async fn sync_items(&self) -> Result<(), String> {
        let resource = "items";
        self.update_sync_meta(resource, 0, 0, "syncing", None).await;

        let list = match self.retry(3, || async {
            self.client.get_resource_list("item").await
        }).await {
            Ok(l) => l,
            Err(e) => {
                let msg = e.to_string();
                self.update_sync_meta(resource, 0, 0, "error", Some(&msg)).await;
                return Err(msg);
            }
        };
        let total = list.len() as i64;
        self.update_sync_meta(resource, total, 0, "syncing", None).await;

        let mut completed: i64 = 0;

        for entry in &list {
            if self.is_cancelled() {
                self.update_sync_meta(resource, total, completed, "cancelled", None).await;
                return Ok(());
            }

            let id = match PokeApiClient::id_from_url(&entry.url) {
                Some(id) => id,
                None => continue,
            };

            let result = self.retry(3, || async {
                let _permit = self.semaphore.acquire().await.unwrap();
                self.client.fetch_item(id).await
            }).await;

            match result {
                Ok(parsed_item) => {
                    let _ = cache::items::upsert_item(&self.pool, &parsed_item).await;
                }
                Err(e) => {
                    log::warn!("Failed to fetch item {}: {}", id, e);
                }
            }

            completed += 1;
            if completed % 20 == 0 || completed == total {
                self.update_sync_meta(resource, total, completed, "syncing", None).await;
            }
        }

        self.update_sync_meta(resource, total, completed, "done", None).await;
        Ok(())
    }

    // ── Evolution Chains ─────────────────────────────────────────────

    async fn sync_evolution_chains(&self) -> Result<(), String> {
        let resource = "evolution_chains";
        self.update_sync_meta(resource, 0, 0, "syncing", None).await;

        let list = match self.retry(3, || async {
            self.client.get_resource_list("evolution-chain").await
        }).await {
            Ok(l) => l,
            Err(e) => {
                let msg = e.to_string();
                self.update_sync_meta(resource, 0, 0, "error", Some(&msg)).await;
                return Err(msg);
            }
        };
        let total = list.len() as i64;
        self.update_sync_meta(resource, total, 0, "syncing", None).await;

        let mut completed: i64 = 0;

        for entry in &list {
            if self.is_cancelled() {
                self.update_sync_meta(resource, total, completed, "cancelled", None).await;
                return Ok(());
            }

            let id = match PokeApiClient::id_from_url(&entry.url) {
                Some(id) => id,
                None => continue,
            };

            let result = self.retry(3, || async {
                let _permit = self.semaphore.acquire().await.unwrap();
                self.client.fetch_evolution_chain(id).await
            }).await;

            match result {
                Ok((chain_id, node)) => {
                    let _ = cache::evolution::upsert_evolution_chain(&self.pool, chain_id, &node).await;
                }
                Err(e) => {
                    log::warn!("Failed to fetch evolution chain {}: {}", id, e);
                }
            }

            completed += 1;
            if completed % 20 == 0 || completed == total {
                self.update_sync_meta(resource, total, completed, "syncing", None).await;
            }
        }

        self.update_sync_meta(resource, total, completed, "done", None).await;
        Ok(())
    }

    // ── Natures ───────────────────────────────────────────────────────

    async fn sync_natures(&self) -> Result<(), String> {
        let resource = "natures";
        self.update_sync_meta(resource, 0, 0, "syncing", None).await;

        let list = match self.retry(3, || async {
            self.client.get_resource_list("nature").await
        }).await {
            Ok(l) => l,
            Err(e) => {
                let msg = e.to_string();
                self.update_sync_meta(resource, 0, 0, "error", Some(&msg)).await;
                return Err(msg);
            }
        };
        let total = list.len() as i64;
        self.update_sync_meta(resource, total, 0, "syncing", None).await;

        let mut completed: i64 = 0;

        for entry in &list {
            if self.is_cancelled() {
                self.update_sync_meta(resource, total, completed, "cancelled", None).await;
                return Ok(());
            }

            let id = match PokeApiClient::id_from_url(&entry.url) {
                Some(id) => id,
                None => continue,
            };

            let result = self.retry(3, || async {
                let _permit = self.semaphore.acquire().await.unwrap();
                self.client.fetch_nature(id).await
            }).await;

            match result {
                Ok(parsed_nature) => {
                    let _ = cache::natures::upsert_nature(&self.pool, &parsed_nature).await;
                }
                Err(e) => {
                    log::warn!("Failed to fetch nature {}: {}", id, e);
                }
            }

            completed += 1;
            self.update_sync_meta(resource, total, completed, "syncing", None).await;
        }

        self.update_sync_meta(resource, total, completed, "done", None).await;
        Ok(())
    }

    // ── Abilities ─────────────────────────────────────────────────────

    async fn sync_abilities(&self) -> Result<(), String> {
        let resource = "abilities";
        self.update_sync_meta(resource, 0, 0, "syncing", None).await;

        let list = match self.retry(3, || async {
            self.client.get_resource_list("ability").await
        }).await {
            Ok(l) => l,
            Err(e) => {
                let msg = e.to_string();
                self.update_sync_meta(resource, 0, 0, "error", Some(&msg)).await;
                return Err(msg);
            }
        };
        let total = list.len() as i64;
        self.update_sync_meta(resource, total, 0, "syncing", None).await;

        let mut completed: i64 = 0;

        for entry in &list {
            if self.is_cancelled() {
                self.update_sync_meta(resource, total, completed, "cancelled", None).await;
                return Ok(());
            }

            let id = match PokeApiClient::id_from_url(&entry.url) {
                Some(id) => id,
                None => continue,
            };

            let result = self.retry(3, || async {
                let _permit = self.semaphore.acquire().await.unwrap();
                self.client.fetch_ability(id).await
            }).await;

            match result {
                Ok(parsed_ability) => {
                    let _ = cache::abilities::upsert_ability(&self.pool, &parsed_ability).await;
                    for ap in &parsed_ability.pokemon {
                        let _ = cache::abilities::upsert_ability_pokemon(&self.pool, parsed_ability.id, ap).await;
                    }
                }
                Err(e) => {
                    log::warn!("Failed to fetch ability {}: {}", id, e);
                }
            }

            completed += 1;
            if completed % 20 == 0 || completed == total {
                self.update_sync_meta(resource, total, completed, "syncing", None).await;
            }
        }

        self.update_sync_meta(resource, total, completed, "done", None).await;
        Ok(())
    }

    // ── Helpers ──────────────────────────────────────────────────────

    fn is_cancelled(&self) -> bool {
        SYNC_CANCEL_FLAG.load(Ordering::SeqCst)
    }

    /// Check if a resource is already synced (status = "done").
    async fn is_resource_done(&self, resource: &str) -> bool {
        let row = sqlx::query_scalar::<_, String>(
            "SELECT status FROM sync_meta WHERE resource = ?1"
        )
        .bind(resource)
        .fetch_optional(&self.pool)
        .await;

        matches!(row, Ok(Some(status)) if status == "done")
    }

    /// Validate data integrity: check row counts against sync_meta totals.
    async fn validate_sync(&self) {
        let checks = [
            ("types", "SELECT COUNT(*) FROM types"),
            ("moves", "SELECT COUNT(*) FROM moves"),
            ("pokemon", "SELECT COUNT(*) FROM pokemon"),
            ("items", "SELECT COUNT(*) FROM items"),
            ("evolution_chains", "SELECT COUNT(*) FROM evolution_chains"),
            ("natures", "SELECT COUNT(*) FROM natures"),
            ("abilities", "SELECT COUNT(*) FROM abilities"),
        ];

        for (resource, count_query) in checks {
            let actual: i64 = sqlx::query_scalar(count_query)
                .fetch_one(&self.pool)
                .await
                .unwrap_or(0);

            let expected: Option<i64> = sqlx::query_scalar(
                "SELECT total FROM sync_meta WHERE resource = ?1 AND status = 'done'"
            )
            .bind(resource)
            .fetch_optional(&self.pool)
            .await
            .unwrap_or(None);

            if let Some(total) = expected {
                if actual < total {
                    log::warn!(
                        "Data integrity: {} has {} rows but expected {} — marking as partial",
                        resource, actual, total
                    );
                    self.update_sync_meta(resource, total, actual, "partial", None).await;
                }
            }
        }
    }

    /// Update the sync_meta table and emit a progress event to the frontend.
    async fn update_sync_meta(
        &self,
        resource: &str,
        total: i64,
        completed: i64,
        status: &str,
        error: Option<&str>,
    ) {
        let now = chrono::Utc::now().to_rfc3339();

        let _ = sqlx::query(
            "INSERT INTO sync_meta (resource, total, completed, status, error, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(resource) DO UPDATE SET
               total = excluded.total,
               completed = excluded.completed,
               status = excluded.status,
               error = excluded.error,
               updated_at = excluded.updated_at"
        )
        .bind(resource)
        .bind(total)
        .bind(completed)
        .bind(status)
        .bind(error)
        .bind(&now)
        .execute(&self.pool)
        .await;

        let event = SyncProgressEvent {
            resource: resource.to_string(),
            total,
            completed,
            status: status.to_string(),
            error: error.map(|s| s.to_string()),
        };

        let _ = self.app_handle.emit("sync-progress", &event);
    }

    /// Retry an async operation up to `max_attempts` times with exponential backoff.
    /// Returns Result<T, String> — converts any error to String for uniform handling.
    /// Checks cancellation flag between attempts.
    async fn retry<F, Fut, T, E>(&self, max_attempts: u32, f: F) -> Result<T, String>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, E>>,
        E: std::fmt::Display,
    {
        let mut last_err: Option<String> = None;

        for attempt in 0..max_attempts {
            if self.is_cancelled() {
                return Err("Sync cancelled".to_string());
            }

            if attempt > 0 {
                // Sleep in small increments so cancellation is responsive
                let total_ms = 500 * 2u64.pow(attempt - 1);
                let steps = (total_ms / 100).max(1);
                for _ in 0..steps {
                    if self.is_cancelled() {
                        return Err("Sync cancelled".to_string());
                    }
                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                }
            }

            match f().await {
                Ok(val) => return Ok(val),
                Err(e) => {
                    let msg = e.to_string();
                    log::warn!("Retry attempt {} failed: {}", attempt + 1, msg);
                    last_err = Some(msg);
                }
            }
        }

        Err(last_err.unwrap_or_else(|| "Unknown error".to_string()))
    }
}
