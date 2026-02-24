-- Add species_id to group alternate forms with their base Pokemon
ALTER TABLE pokemon ADD COLUMN species_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_pokemon_species ON pokemon(species_id);
