use std::sync::Arc;

use sqlx::SqlitePool;
use tauri::{Emitter, Manager};

use api::PokeApiClient;

mod api;
mod cache;
mod commands;
mod db;
pub mod models;
mod sync;

/// Shared application state accessible from all Tauri commands.
pub struct AppState {
    pub pool: SqlitePool,
    pub api_client: Arc<PokeApiClient>,
}

/// Bundled hackrom JSON data files (included at compile time).
const BUNDLED_GAMES: &[&str] = &[
    include_str!("../data/games/runbun.json"),
    include_str!("../data/games/radical-red.json"),
    include_str!("../data/games/emerald-imperium.json"),
];

/// Auto-import bundled hackrom data if not already present in the database.
/// Emits `game-import-progress` events so the frontend can show feedback.
async fn auto_import_bundled_games(pool: &SqlitePool, handle: &tauri::AppHandle) {
    let total = BUNDLED_GAMES.len();
    let mut imported = 0u32;

    for json_str in BUNDLED_GAMES {
        let data: models::GameDataFile = match serde_json::from_str(json_str) {
            Ok(d) => d,
            Err(e) => {
                log::warn!("Failed to parse bundled game JSON: {}", e);
                continue;
            }
        };

        // Check if this game is already imported
        let exists: bool = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM games WHERE id = ?1"
        )
        .bind(&data.game.id)
        .fetch_one(pool)
        .await
        .unwrap_or(0) > 0;

        if exists {
            log::info!("Game '{}' already imported, skipping", data.game.id);
            continue;
        }

        let game_name = data.game.name_en.clone();
        let _ = handle.emit("game-import-progress", serde_json::json!({
            "status": "importing",
            "game": game_name,
            "current": imported + 1,
            "total": total,
        }));

        log::info!("Auto-importing bundled game: {}", data.game.id);
        match cache::games::import_game_data(pool, &data).await {
            Ok(_) => {
                imported += 1;
                log::info!("Successfully imported game: {}", data.game.id);
            }
            Err(e) => log::error!("Failed to import game '{}': {}", data.game.id, e),
        }
    }

    if imported > 0 {
        let _ = handle.emit("game-import-progress", serde_json::json!({
            "status": "done",
            "imported": imported,
        }));
    }
}

/// Entry point for the Tauri application.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let handle = app.handle().clone();

            // Initialize database synchronously within the setup closure
            let pool = tauri::async_runtime::block_on(async {
                db::init_db(&handle).await.expect("Failed to initialize database")
            });

            let api_client = Arc::new(PokeApiClient::new());

            app.manage(AppState { pool: pool.clone(), api_client });

            // Auto-import bundled hackrom data in background (non-blocking)
            let import_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                auto_import_bundled_games(&pool, &import_handle).await;
            });

            log::info!("Pokedia application initialized successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Settings
            commands::settings::get_settings,
            commands::settings::set_setting,
            // Pokemon
            commands::pokemon::get_all_pokemon,
            commands::pokemon::get_pokemon_by_id,
            commands::pokemon::search_pokemon,
            commands::pokemon::get_pokemon_abilities,
            commands::pokemon::get_pokemon_evolution_chain,
            commands::pokemon::get_alternate_forms,
            // Moves
            commands::moves::get_all_moves,
            commands::moves::get_move_by_id,
            commands::moves::search_moves,
            commands::moves::get_pokemon_moves,
            commands::moves::get_move_pokemon,
            // Items
            commands::items::get_all_items,
            commands::items::get_item_by_id,
            commands::items::search_items,
            // Types
            commands::types::get_all_types,
            commands::types::get_type_efficacy,
            // Sync
            commands::sync::start_sync,
            commands::sync::get_sync_status,
            commands::sync::cancel_sync,
            commands::sync::clear_cache,
            // Natures
            commands::natures::get_all_natures,
            // Abilities
            commands::abilities::get_all_abilities,
            commands::abilities::get_ability_by_id,
            commands::abilities::search_abilities,
            commands::abilities::get_ability_pokemon,
            // Favorites
            commands::favorites::toggle_favorite,
            commands::favorites::get_favorites,
            // Games
            commands::games::get_all_games,
            commands::games::get_game_coverage,
            commands::games::get_game_pokemon_moves,
            commands::games::get_game_pokemon_abilities,
            commands::games::get_game_pokemon_locations,
            commands::games::get_game_move_override,
            commands::games::get_game_item_locations,
            commands::games::import_game_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Pokedia");
}
