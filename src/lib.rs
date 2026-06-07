mod cache;
pub mod db;
pub mod models;
pub mod native;

/// Bundled hackrom JSON data files (included at compile time).
pub(crate) const BUNDLED_GAMES: &[&str] = &[
    include_str!("../data/games/runbun.json"),
    include_str!("../data/games/radical-red.json"),
    include_str!("../data/games/emerald-imperium.json"),
];
