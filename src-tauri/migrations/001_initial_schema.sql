-- Pokedia initial schema

-- Application settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Sync metadata tracking
CREATE TABLE IF NOT EXISTS sync_meta (
    resource    TEXT PRIMARY KEY,
    total       INTEGER DEFAULT 0,
    completed   INTEGER DEFAULT 0,
    status      TEXT    DEFAULT 'pending',
    error       TEXT,
    updated_at  TEXT
);

-- Pokemon types
CREATE TABLE IF NOT EXISTS types (
    id       INTEGER PRIMARY KEY,
    name_key TEXT NOT NULL,
    name_en  TEXT,
    name_fr  TEXT
);

-- Type effectiveness matrix
CREATE TABLE IF NOT EXISTS type_efficacy (
    attacking_type_id INTEGER NOT NULL,
    defending_type_id INTEGER NOT NULL,
    damage_factor     INTEGER NOT NULL,
    PRIMARY KEY (attacking_type_id, defending_type_id),
    FOREIGN KEY (attacking_type_id) REFERENCES types(id),
    FOREIGN KEY (defending_type_id) REFERENCES types(id)
);

-- Pokemon
CREATE TABLE IF NOT EXISTS pokemon (
    id                 INTEGER PRIMARY KEY,
    name_key           TEXT NOT NULL,
    name_en            TEXT,
    name_fr            TEXT,
    type1_key          TEXT,
    type2_key          TEXT,
    hp                 INTEGER,
    atk                INTEGER,
    def                INTEGER,
    spa                INTEGER,
    spd                INTEGER,
    spe                INTEGER,
    base_stat_total    INTEGER,
    sprite_url         TEXT,
    evolution_chain_id INTEGER,
    description_en     TEXT,
    description_fr     TEXT,
    height             INTEGER,
    weight             INTEGER
);

-- Pokemon abilities (junction)
CREATE TABLE IF NOT EXISTS pokemon_abilities (
    pokemon_id  INTEGER NOT NULL,
    ability_key TEXT    NOT NULL,
    ability_en  TEXT,
    ability_fr  TEXT,
    is_hidden   INTEGER DEFAULT 0,
    slot        INTEGER NOT NULL,
    PRIMARY KEY (pokemon_id, slot),
    FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
);

-- Moves
CREATE TABLE IF NOT EXISTS moves (
    id           INTEGER PRIMARY KEY,
    name_key     TEXT NOT NULL,
    name_en      TEXT,
    name_fr      TEXT,
    type_key     TEXT,
    damage_class TEXT,
    power        INTEGER,
    accuracy     INTEGER,
    pp           INTEGER,
    priority     INTEGER DEFAULT 0,
    effect_en    TEXT,
    effect_fr    TEXT
);

-- Pokemon-moves junction
CREATE TABLE IF NOT EXISTS pokemon_moves (
    pokemon_id      INTEGER NOT NULL,
    move_id         INTEGER NOT NULL,
    learn_method    TEXT    NOT NULL,
    level_learned_at INTEGER DEFAULT 0,
    PRIMARY KEY (pokemon_id, move_id, learn_method),
    FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
    FOREIGN KEY (move_id)    REFERENCES moves(id)
);

-- Evolution chains (stored as JSON blobs)
CREATE TABLE IF NOT EXISTS evolution_chains (
    id   INTEGER PRIMARY KEY,
    data TEXT
);

-- Items
CREATE TABLE IF NOT EXISTS items (
    id         INTEGER PRIMARY KEY,
    name_key   TEXT NOT NULL,
    name_en    TEXT,
    name_fr    TEXT,
    category   TEXT,
    effect_en  TEXT,
    effect_fr  TEXT,
    sprite_url TEXT
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
    pokemon_id INTEGER PRIMARY KEY,
    added_at   TEXT NOT NULL,
    FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pokemon_name_key   ON pokemon(name_key);
CREATE INDEX IF NOT EXISTS idx_pokemon_name_en    ON pokemon(name_en);
CREATE INDEX IF NOT EXISTS idx_pokemon_name_fr    ON pokemon(name_fr);
CREATE INDEX IF NOT EXISTS idx_pokemon_type1      ON pokemon(type1_key);
CREATE INDEX IF NOT EXISTS idx_pokemon_type2      ON pokemon(type2_key);
CREATE INDEX IF NOT EXISTS idx_pokemon_evo_chain  ON pokemon(evolution_chain_id);
CREATE INDEX IF NOT EXISTS idx_moves_name_key     ON moves(name_key);
CREATE INDEX IF NOT EXISTS idx_moves_name_en      ON moves(name_en);
CREATE INDEX IF NOT EXISTS idx_moves_name_fr      ON moves(name_fr);
CREATE INDEX IF NOT EXISTS idx_moves_type_key     ON moves(type_key);
CREATE INDEX IF NOT EXISTS idx_items_name_key     ON items(name_key);
CREATE INDEX IF NOT EXISTS idx_items_name_en      ON items(name_en);
CREATE INDEX IF NOT EXISTS idx_items_name_fr      ON items(name_fr);
CREATE INDEX IF NOT EXISTS idx_types_name_key     ON types(name_key);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('lang_pokemon_names', 'en');
INSERT OR IGNORE INTO settings (key, value) VALUES ('lang_move_names', 'en');
INSERT OR IGNORE INTO settings (key, value) VALUES ('lang_item_names', 'en');
INSERT OR IGNORE INTO settings (key, value) VALUES ('lang_descriptions', 'fr');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');
