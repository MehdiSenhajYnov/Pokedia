use crate::models::{SyncResourceStatus, SyncStatus};
use crate::sync::engine::SYNC_CANCEL_FLAG;
use crate::AppState;
use tauri::State;

/// Start a full data sync from PokéAPI.
#[tauri::command]
pub async fn start_sync(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Check if already syncing
    {
        let row: Option<(String,)> = sqlx::query_as(
            "SELECT status FROM sync_meta WHERE status = 'syncing' LIMIT 1"
        )
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

        if row.is_some() {
            return Err("Sync is already in progress".to_string());
        }
    }

    // Reset cancellation flag
    SYNC_CANCEL_FLAG.store(false, std::sync::atomic::Ordering::SeqCst);

    let pool = state.pool.clone();
    let client = state.api_client.clone();

    // Run sync in background
    tokio::spawn(async move {
        let engine = crate::sync::engine::SyncEngine::new(pool, client, app_handle);
        if let Err(e) = engine.sync_all().await {
            log::error!("Sync failed: {}", e);
        }
    });

    Ok(())
}

/// Get the current sync status.
#[tauri::command]
pub async fn get_sync_status(
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    let rows: Vec<SyncResourceStatus> = sqlx::query_as(
        "SELECT resource, total, completed, status, error FROM sync_meta ORDER BY resource"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let is_syncing = rows.iter().any(|r| r.status == "syncing");

    Ok(SyncStatus {
        is_syncing,
        resources: rows,
    })
}

/// Cancel the current sync.
#[tauri::command]
pub async fn cancel_sync(
    state: State<'_, AppState>,
) -> Result<(), String> {
    SYNC_CANCEL_FLAG.store(true, std::sync::atomic::Ordering::SeqCst);
    log::info!("Sync cancellation requested");

    // Immediately mark any "syncing" resources as "cancelled" in the DB
    // so the frontend sees is_syncing=false right away
    sqlx::query("UPDATE sync_meta SET status = 'cancelled' WHERE status = 'syncing'")
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Clear all cached data from the database.
#[tauri::command]
pub async fn clear_cache(
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Delete from all data tables (but not settings)
    // Order matters: delete child tables before parents (FK constraints)
    let tables = [
        "favorites",
        "pokemon_moves",
        "pokemon_abilities",
        "pokemon",
        "moves",
        "items",
        "type_efficacy",
        "types",
        "evolution_chains",
        "sync_meta",
    ];

    for table in &tables {
        let sql = format!("DELETE FROM {}", table);
        sqlx::query(&sql)
            .execute(&state.pool)
            .await
            .map_err(|e| e.to_string())?;
    }

    log::info!("Cache cleared successfully");
    Ok(())
}
