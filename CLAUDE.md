# Pokedia

Pokemon encyclopedia desktop app for hackrom players. Bilingual EN/FR.

## Stack

- **Desktop:** native GTK4/libadwaita app in Rust
- **Data:** SQLite through sqlx, with migrations embedded at compile time
- **Runtime:** Tokio
- **Networking:** reqwest blocking client for sprite downloads
- **Crate name:** `pokedia_lib`
- **Main binary:** `pokedia-gtk`

## Commands

- `cargo run --bin pokedia-gtk` - run the GTK app
- `cargo check --bin pokedia-gtk` - check Rust compilation
- `cargo build --release --bin pokedia-gtk` - production build

## Project Structure

```text
Cargo.toml
src/
  bin/pokedia-gtk.rs       # GTK/libadwaita UI and interaction logic
  lib.rs                   # Shared modules and bundled game data includes
  db.rs                    # SQLite setup, WAL mode, migration runner
  native.rs                # Query layer consumed by the GTK app
  cache/
    games.rs               # Bundled hackrom import/upsert helpers
  models/                  # sqlx::FromRow + serde structs
data/games/                # Bundled hackrom JSON files
migrations/                # SQL schema migrations
icons/                     # App icons used by the GTK shell
HackRomInfo/               # Source documents for hackrom data extraction
```

## Database

- DB path: user data directory `com.pokedia.app/pokedia.db`
- `db.rs` creates the directory, opens SQLite with WAL mode, and applies all migrations.
- `native::init_pool()` initializes the pool and imports bundled hackrom JSON when their fingerprint changes.
- `cache/games.rs` is the only remaining cache writer; the GTK app reads everything else directly through `native.rs`.

## Schema Overview

- `settings` - key/value config store
- `sync_meta` - imported resource status display
- `pokemon` - names, types, stats, sprites, descriptions, species/evolution IDs
- `pokemon_abilities` - pokemon ability junction data
- `pokemon_moves` - pokemon learnset junction data
- `moves` - move names, type, class, power, accuracy, PP, effects
- `items` - item names, category, effects, sprite URL
- `types` and `type_efficacy` - type names and matchup factors
- `evolution_chains` - recursive evolution JSON blobs
- `favorites` - favorite pokemon IDs
- `natures`, `abilities`, `ability_pokemon` - nature and ability data
- `games` plus `game_*` tables - hackrom overrides and locations

## Conventions

- SQLite booleans are stored as `i64` values `0` or `1`.
- Prefer adding query helpers to `native.rs` when the GTK UI needs data.
- Keep write/import logic in `cache/games.rs` unless a new native sync/import path is intentionally added.
- The GTK binary loads `icons/32x32.png` relative to `CARGO_MANIFEST_DIR`.
- Cargo is available at `$HOME/.cargo/bin` in the usual local setup.
