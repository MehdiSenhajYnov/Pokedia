use std::sync::Arc;

use sqlx::SqlitePool;
use tauri::Manager;

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

            app.manage(AppState { pool, api_client });

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
            // Moves
            commands::moves::get_all_moves,
            commands::moves::get_move_by_id,
            commands::moves::search_moves,
            commands::moves::get_pokemon_moves,
            // Items
            commands::items::get_all_items,
            commands::items::search_items,
            // Types
            commands::types::get_all_types,
            commands::types::get_type_efficacy,
            // Sync
            commands::sync::start_sync,
            commands::sync::get_sync_status,
            commands::sync::cancel_sync,
            commands::sync::clear_cache,
            // Favorites
            commands::favorites::toggle_favorite,
            commands::favorites::get_favorites,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Pokedia");
}
