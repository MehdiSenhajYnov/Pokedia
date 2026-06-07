use serde::{Deserialize, Serialize};

/// Application settings (mirrors the settings table key-value pairs).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub lang_pokemon_names: String,
    pub lang_move_names: String,
    pub lang_item_names: String,
    pub lang_descriptions: String,
    pub theme: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            lang_pokemon_names: "en".to_string(),
            lang_move_names: "en".to_string(),
            lang_item_names: "en".to_string(),
            lang_descriptions: "fr".to_string(),
            theme: "dark".to_string(),
        }
    }
}
