# Pokedia

Pokemon encyclopedia desktop app for hackrom players. Bilingual (EN/FR).

## Stack

- **Backend:** Tauri 2, Rust (edition 2021), sqlx (SQLite), reqwest, tokio
- **Frontend:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4, shadcn/ui (New York style)
- **Key libraries:** TanStack Query + Table + Virtual, Zustand, Framer Motion, Radix UI, lucide-react, liquid-glass-react
- **Crate name:** `pokedia_lib`

## Commands

- `npm run tauri dev` — run the app in dev mode
- `npx vite build` — build frontend only (fast type+build check)
- `cargo check` in `src-tauri/` — check Rust compilation
- `npm run lint` — ESLint

## Project Structure

```
src/                          # Frontend (React)
  pages/                      # 12 pages (lazy-loaded with React.lazy + Suspense)
    PokemonBrowserPage        #   Pokédex grid/list with type/gen/favorites filters, sorting, virtualized
    PokemonDetailPage         #   Stats, types, matchups, abilities, moves, evolution chain, forms
    MoveBrowserPage            #   TanStack Table, type/class/power filters, virtualized
    MoveDetailPage             #   Move stats, effect, learners list
    ItemBrowserPage            #   Category filter, grid/list, virtualized
    ItemDetailPage             #   Item info, description
    AbilityBrowserPage         #   Generation filter, search
    AbilityDetailPage          #   Effect, Pokémon with this ability (hidden/regular)
    NatureBrowserPage          #   Stat filter, hide neutral toggle
    TypeChartPage              #   Interactive type matchup chart, offensive/defensive view
    ComparisonPage             #   Side-by-side stat + matchup comparison
    SettingsPage               #   Per-category language toggles, theme, sync control, cache clear
  components/
    layout/                   # AppLayout, Header, Sidebar, TabBar, SearchCrossResults, SyncBanner, MeshGradientBg
    pokemon/                  # PokemonCard, TypeBadge, StatsBar, EvolutionChain, MoveTable
    moves/                    # DamageClassIcon
    ui/                       # pokemon-sprite, liquid-glass, LiquidGlassBox, sonner, shadcn components (16)
  stores/                     # Zustand (all with persist middleware)
    search-store              #   Query, type/gen/class filters, sort, view mode, favorites-only
    settings-store            #   Per-category lang (pokemon/moves/items/abilities/natures/descriptions), theme
    comparison-store          #   Pokemon IDs for comparison
    recent-store              #   Last 20 visited Pokémon (LRU)
    tab-store                 #   Open detail tabs (max 20, LRU eviction), active tab
  hooks/                      # TanStack Query hooks + utilities
    use-pokemon               #   useAllPokemon, usePokemonById, usePokemonAbilities, usePokemonEvolutionChain, usePokemonMovesList, useAlternateForms
    use-moves                 #   useAllMoves, useMoveById, useSearchMoves, usePokemonMoves, useMovePokemon
    use-items                 #   useAllItems, useItemDetail, useSearchItems
    use-types                 #   useAllTypes, useTypeEfficacy
    use-abilities             #   useAllAbilities, useAbilityById, useSearchAbilities, useAbilityPokemon
    use-natures               #   useAllNatures
    use-favorites             #   useFavorites, useToggleFavorite, useIsFavorite (optimistic updates)
    use-sync                  #   useSyncStatus (dynamic refetchInterval)
    use-sync-invalidation     #   Listens to Tauri "sync-progress" events → invalidates query caches + toasts
    use-page-title            #   Sets native window title + document.title
    use-prefetch              #   Prefetch all main datasets on app startup
  lib/
    tauri.ts                  # Rust IPC invoke wrappers (21 commands)
    constants.ts              # TYPE_COLORS {bg,text,hex,glow}, TYPE_COLORS_HEX, ALL_TYPES, STAT_NAMES, STAT_COLORS
    type-chart.ts             # Hardcoded Gen IX efficacy, getTypeFactor, getDualTypeFactor, getDefensiveMatchups
    pokemon-utils.ts          # getBaseId, getFormLabel, sortByPokedex, buildNameToIdMap, buildRegionalChain, isAlternateForm
    ability-matchups.ts       # ABILITY_MATCHUP_EFFECTS, getAbilityAdjustedMatchups (Levitate, Flash Fire, etc.)
    motion.ts                 # Framer Motion presets: springs, page transitions, stagger, stat bars, card hover
    utils.ts                  # cn() (clsx + tailwind-merge)
  types/                      # TypeScript interfaces (PokemonSummary/Detail, MoveSummary/Detail, ItemSummary/Detail, EvolutionNode, SyncStatus, NatureSummary, AbilitySummary/Detail, etc.)

src-tauri/                    # Backend (Rust)
  src/
    lib.rs                    # Tauri setup, AppState {SqlitePool, Arc<PokeApiClient>}, 21 commands registered
    db.rs                     # SQLite init (WAL mode, 5 pool connections) + migration runner
    commands/                 # 9 modules: pokemon (6), moves (5), items (3), types (2), abilities (4), natures (1), sync (4), favorites (2), settings (2)
    sync/engine.rs            # SyncEngine: 5-phase pipeline, semaphore (10 concurrent), 3x retry, partial resume, cancellation, validation
    api/                      # PokeApiClient + 8 resource fetchers (pokemon, species, moves, items, types, evolution, natures, abilities)
    cache/                    # 7 modules: upsert helpers per resource (INSERT ... ON CONFLICT DO UPDATE)
    models/                   # 8 modules: Serialize/Deserialize + FromRow structs
  migrations/                 # 3 SQL migrations: initial schema (11 tables), species_id column, natures+abilities tables
```

## Routes

```
/                 → PokemonBrowserPage (Pokédex)
/pokemon/:id      → PokemonDetailPage
/moves            → MoveBrowserPage
/moves/:id        → MoveDetailPage
/items            → ItemBrowserPage
/items/:id        → ItemDetailPage
/abilities        → AbilityBrowserPage
/abilities/:id    → AbilityDetailPage
/natures          → NatureBrowserPage
/types            → TypeChartPage
/compare          → ComparisonPage
/settings         → SettingsPage
```

## Database Schema (11 tables + 3 junction tables)

- **settings** — key/value config store
- **sync_meta** — per-resource sync progress tracking
- **pokemon** — id, names, types, stats, sprite, species_id, evolution_chain_id, descriptions, height, weight
- **pokemon_abilities** — junction: pokemon_id + ability_key + is_hidden + slot
- **pokemon_moves** — junction: pokemon_id + move_id + learn_method + level
- **moves** — id, names, type, damage_class, power, accuracy, pp, priority, effects
- **items** — id, names, category, effects, sprite_url
- **types** — id, name_key, name_en, name_fr
- **type_efficacy** — attacking/defending type IDs + damage_factor
- **evolution_chains** — id + JSON blob (recursive EvolutionNode tree)
- **favorites** — pokemon_id + added_at
- **natures** — id, names, increased/decreased stat, likes/hates flavor
- **abilities** — id, names, effects, short_effects, generation
- **ability_pokemon** — junction: ability_id + pokemon_id + is_hidden

## Architecture Decisions

- **Denormalized DB:** Tables have `name_en`/`name_fr` columns for instant language switch without joins
- **Sync engine:** 5-phase pipeline (Types → Moves → Pokemon+Items → Evolution Chains → Natures+Abilities). Semaphore-limited concurrency (10 concurrent requests to PokeAPI). 3x retry with exponential backoff. Partial resume via sync_meta status check. Sync statuses: `"pending"`, `"syncing"`, `"done"`, `"cancelled"`, `"error"`, `"partial"`
- **Client-side data:** All pokemon/moves/items loaded at once for instant search/filter. `staleTime: Infinity` in TanStack Query. Prefetched on app startup via `usePrefetch`
- **Type chart:** Hardcoded Gen IX efficacy data in `type-chart.ts` for client-side matchup calculation. Ability-based adjustments in `ability-matchups.ts`
- **Settings store:** Zustand with `persist`. Exposes `pokemonName(en, fr)`, `moveName(en, fr)`, `itemName(en, fr)`, `abilityName(en, fr)`, `natureName(en, fr)`, `description(en, fr)` getters with fallback logic
- **Evolution chains:** Stored as JSON blobs in DB, parsed into recursive `EvolutionNode` trees
- **Alternate forms:** Detected via `evolution_chain_id` + name_key prefix matching (not `species_id` which may be NULL). Regional chain grouping in `pokemon-utils.ts`
- **Tab system:** LRU-based open tabs (max 20) with persist, supporting pokemon/move/item/ability detail pages
- **Virtualization:** Browser pages use `@tanstack/react-virtual` for smooth rendering of large lists
- **Code splitting:** All 12 pages lazy-loaded with `React.lazy` + `Suspense`
- **Liquid glass UI:** iOS 26-style glass effects via `@tinymomentum/liquid-glass-react` on Sidebar, Header, cards

## Conventions

- SQLite booleans are `i64` (0/1), not boolean — e.g., `is_hidden === 1`
- Rust `Option<T>` maps to TypeScript `T | null`
- Tauri 2 auto-converts snake_case to camelCase for IPC command parameters
- PokemonMoveEntry joined fields: `name_key`, `name_en`, `name_fr` (NOT `move_name_en`)
- `TYPE_COLORS` has `{bg, text, hex, glow}` per type; `TYPE_COLORS_HEX` is a derived `Record<string, string>`
- DB path: `%APPDATA%/com.pokedia.app/pokedia.db`
- Cargo is at `$HOME/.cargo/bin`

## Code Style

- Keep changes minimal and focused — don't refactor code you weren't asked to touch
- Don't add comments, docstrings, or type annotations to unchanged code
- Prefer editing existing files over creating new ones
- Use shadcn/ui patterns and Tailwind classes consistent with existing components
- French is acceptable in commit messages and user-facing discussions
