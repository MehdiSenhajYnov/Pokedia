-- Natures table (25 natures)
CREATE TABLE IF NOT EXISTS natures (
    id INTEGER PRIMARY KEY,
    name_key TEXT NOT NULL,
    name_en TEXT,
    name_fr TEXT,
    increased_stat TEXT,
    decreased_stat TEXT,
    likes_flavor TEXT,
    hates_flavor TEXT
);

-- Abilities table
CREATE TABLE IF NOT EXISTS abilities (
    id INTEGER PRIMARY KEY,
    name_key TEXT NOT NULL,
    name_en TEXT,
    name_fr TEXT,
    effect_en TEXT,
    effect_fr TEXT,
    short_effect_en TEXT,
    short_effect_fr TEXT,
    generation INTEGER
);

-- Ability-Pokemon junction table
CREATE TABLE IF NOT EXISTS ability_pokemon (
    ability_id INTEGER NOT NULL,
    pokemon_id INTEGER NOT NULL,
    is_hidden INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (ability_id, pokemon_id, is_hidden),
    FOREIGN KEY (ability_id) REFERENCES abilities(id),
    FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
);
