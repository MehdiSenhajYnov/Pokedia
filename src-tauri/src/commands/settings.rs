use crate::models::AppSettings;
use crate::AppState;
use tauri::State;

/// Get all application settings as a single object.
#[tauri::command]
pub async fn get_settings(
    state: State<'_, AppState>,
) -> Result<AppSettings, String> {
    let rows: Vec<(String, String)> = sqlx::query_as(
        "SELECT key, value FROM settings"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut settings = AppSettings::default();
    for (key, value) in rows {
        match key.as_str() {
            "lang_pokemon_names" => settings.lang_pokemon_names = value,
            "lang_move_names" => settings.lang_move_names = value,
            "lang_item_names" => settings.lang_item_names = value,
            "lang_descriptions" => settings.lang_descriptions = value,
            "theme" => settings.theme = value,
            _ => {}
        }
    }

    Ok(settings)
}

/// Set a single setting by key.
#[tauri::command]
pub async fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    // Validate key
    let valid_keys = [
        "lang_pokemon_names",
        "lang_move_names",
        "lang_item_names",
        "lang_descriptions",
        "theme",
    ];
    if !valid_keys.contains(&key.as_str()) {
        return Err(format!("Invalid setting key: {}", key));
    }

    sqlx::query("INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&key)
        .bind(&value)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
