# Pokedia

Pokemon encyclopedia desktop app for hackrom players. Bilingual (EN/FR).

## Stack

- **Backend:** Tauri 2, Rust (edition 2021), sqlx (SQLite), reqwest, tokio
- **Frontend:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4, shadcn/ui (New York style)
- **Key libraries:** TanStack Query + Table + Virtual, Zustand, Framer Motion, Radix UI, lucide-react
- **Crate name:** `pokedia_lib`

## Commands

- `npm run tauri dev` — run the app in dev mode
- `npx vite build` — build frontend only (fast type+build check)
- `cargo check` in `src-tauri/` — check Rust compilation
- `npm run lint` — ESLint

## Project Structure

```
src/                          # Frontend (React)
  pages/                      # 7 pages: PokemonBrowser, PokemonDetail, MoveBrowser, ItemBrowser, TypeChart, Comparison, Settings
  components/
    layout/                   # AppLayout, Sidebar, GlobalSearch
    pokemon/                  # PokemonCard, TypeBadge, StatsBar, EvolutionChain, MoveTable
    moves/                    # DamageClassIcon
    ui/                       # pokemon-sprite, shadcn components
  stores/                     # Zustand: search-store, settings-store, comparison-store, recent-store
  hooks/                      # TanStack Query hooks: use-pokemon, use-moves, use-items, use-types, use-sync, use-favorites, use-sync-invalidation, use-page-title
  lib/                        # utils, constants, type-chart, pokemon-utils, tauri (invoke wrapper)
  types/                      # TypeScript interfaces

src-tauri/                    # Backend (Rust)
  src/
    lib.rs                    # App setup, AppState (holds SqlitePool + sync cancel token)
    db.rs                     # SQLite init + migration runner
    commands/                 # Tauri IPC commands: pokemon, moves, items, types, sync, favorites, settings
    sync/engine.rs            # Sync engine: fetches from PokeAPI, stores in SQLite
    api/                      # PokeAPI HTTP client + resource-specific fetchers
    cache/                    # DB read/write helpers per resource
    models/                   # Rust structs (serde Serialize/Deserialize)
  migrations/                 # SQL migration files (run in order on startup)
```

## Architecture Decisions

- **Denormalized DB:** Tables have `name_en`/`name_fr` columns for instant language switch without joins
- **Sync engine:** Semaphore-limited concurrency (10 concurrent requests to PokeAPI). Sync statuses: `"pending"`, `"syncing"`, `"done"`, `"cancelled"`, `"error"`
- **Client-side data:** All pokemon loaded at once (~200KB) for instant search/filter. `staleTime: Infinity` in TanStack Query
- **Type chart:** Hardcoded efficacy data in `type-chart.ts` for client-side defensive matchup calculation
- **Settings store:** Zustand with `persist`. Exposes `pokemonName(en, fr)`, `moveName(en, fr)`, `itemName(en, fr)`, `description(en, fr)` getters that return the correct language based on user preference
- **Evolution chains:** Stored as JSON blobs in DB, parsed into recursive `EvolutionNode` trees
- **Alternate forms:** Detected via `evolution_chain_id` + name_key prefix matching (not `species_id` which may be NULL)
- **Form utilities:** `src/lib/pokemon-utils.ts` — `getBaseId`, `getFormLabel`, `sortByPokedex`, `buildNameToIdMap`

## Conventions

- SQLite booleans are `i64` (0/1), not boolean — e.g., `is_hidden === 1`
- Rust `Option<T>` maps to TypeScript `T | null`
- Tauri 2 auto-converts snake_case to camelCase for IPC command parameters
- PokemonMoveEntry joined fields: `name_key`, `name_en`, `name_fr` (NOT `move_name_en`)
- `TYPE_COLORS` has `{bg, text, hex}` per type; `TYPE_COLORS_HEX` is a derived `Record<string, string>`
- DB path: `%APPDATA%/com.pokedia.app/pokedia.db`
- Cargo is at `$HOME/.cargo/bin`

## Code Style

- Keep changes minimal and focused — don't refactor code you weren't asked to touch
- Don't add comments, docstrings, or type annotations to unchanged code
- Prefer editing existing files over creating new ones
- Use shadcn/ui patterns and Tailwind classes consistent with existing components
- French is acceptable in commit messages and user-facing discussions
