-- Game registry
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT,
    base_rom TEXT,
    version TEXT,
    author TEXT,
    description_en TEXT,
    description_fr TEXT,
    is_hackrom INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    coverage TEXT NOT NULL DEFAULT 'full',
    imported_at TEXT
);

-- Learnsets per game
CREATE TABLE IF NOT EXISTS game_pokemon_moves (
    game_id TEXT NOT NULL,
    pokemon_name_key TEXT NOT NULL,
    move_name_key TEXT NOT NULL,
    learn_method TEXT NOT NULL,
    level_learned_at INTEGER DEFAULT 0,
    PRIMARY KEY (game_id, pokemon_name_key, move_name_key, learn_method),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Abilities per game
CREATE TABLE IF NOT EXISTS game_pokemon_abilities (
    game_id TEXT NOT NULL,
    pokemon_name_key TEXT NOT NULL,
    ability_key TEXT NOT NULL,
    slot INTEGER NOT NULL,
    is_hidden INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (game_id, pokemon_name_key, slot),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Pokemon locations per game
CREATE TABLE IF NOT EXISTS game_pokemon_locations (
    game_id TEXT NOT NULL,
    pokemon_name_key TEXT NOT NULL,
    location TEXT NOT NULL,
    PRIMARY KEY (game_id, pokemon_name_key, location)
);

-- Move overrides (modified stats)
CREATE TABLE IF NOT EXISTS game_move_overrides (
    game_id TEXT NOT NULL,
    move_name_key TEXT NOT NULL,
    power INTEGER,
    accuracy INTEGER,
    type_key TEXT,
    pp INTEGER,
    damage_class TEXT,
    effect_en TEXT,
    PRIMARY KEY (game_id, move_name_key)
);

-- Item locations per game
CREATE TABLE IF NOT EXISTS game_item_locations (
    game_id TEXT NOT NULL,
    item_name_key TEXT NOT NULL,
    location TEXT NOT NULL,
    PRIMARY KEY (game_id, item_name_key, location)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_gpm_pokemon ON game_pokemon_moves(game_id, pokemon_name_key);
CREATE INDEX IF NOT EXISTS idx_gpl_pokemon ON game_pokemon_locations(game_id, pokemon_name_key);
CREATE INDEX IF NOT EXISTS idx_gil_item ON game_item_locations(game_id, item_name_key);
