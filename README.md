# Pokedia

Encyclopedie Pokemon desktop pour joueurs de hackroms. Bilingue EN/FR.

Application desktop qui synchronise les donnees depuis [PokeAPI v2](https://pokeapi.co/) et les stocke localement dans une base SQLite pour un acces instantane hors-ligne.

## Fonctionnalites

- **Pokedex complet** — 1000+ Pokemon avec stats, types, talents, attaques, chaine d'evolution, formes alternatives (Mega, Alola, Galar...)
- **Encyclopedie des attaques** — Filtrage par type, classe de degats, puissance. Liste des Pokemon qui apprennent chaque attaque
- **Encyclopedie des objets** — Filtrage par categorie, descriptions bilingues
- **Encyclopedie des talents** — Effets detailles, Pokemon associes (talent cache ou non)
- **Table des natures** — Statistiques augmentees/diminuees, saveurs
- **Table des types** — Matchups offensifs/defensifs interactifs, support double type, ajustements par talent (Levitation, Pare-Feu, etc.)
- **Comparateur** — Comparaison cote a cote des stats et matchups de type
- **Favoris** — Marquer des Pokemon en favori avec filtre dedie
- **Onglets** — Systeme d'onglets pour naviguer entre les pages detail (LRU, max 20)
- **Bilingue** — Choix de la langue (EN/FR) par categorie : noms Pokemon, noms attaques, noms objets, noms talents, noms natures, descriptions
- **Theme** — Mode sombre / clair
- **Synchronisation** — Telechargement depuis PokeAPI avec progression par ressource, reprise partielle, annulation, retry automatique

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Desktop | [Tauri 2](https://v2.tauri.app/) |
| Backend | Rust, [sqlx](https://github.com/launchbadge/sqlx) (SQLite), [reqwest](https://github.com/seanmonstar/reqwest), [tokio](https://tokio.rs/) |
| Frontend | [React 19](https://react.dev/), [Vite 7](https://vite.dev/), TypeScript 5.9 |
| UI | [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (New York), [Radix UI](https://www.radix-ui.com/) |
| Data | [TanStack Query](https://tanstack.com/query) + [Table](https://tanstack.com/table) + [Virtual](https://tanstack.com/virtual) |
| State | [Zustand](https://zustand.docs.pmnd.rs/) (5 stores avec persist) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Icones | [Lucide React](https://lucide.dev/) |

## Prerequis

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) >= 1.77.2
- Dependances systeme Tauri 2 : voir [guide Tauri](https://v2.tauri.app/start/prerequisites/)

## Installation

```bash
# Cloner le repo
git clone https://github.com/votre-user/pokedia.git
cd pokedia

# Installer les dependances frontend
npm install

# Lancer en mode developpement
npm run tauri dev
```

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run tauri dev` | Lancer l'app en dev (frontend + backend) |
| `npx vite build` | Build frontend uniquement (check rapide) |
| `cargo check` (dans `src-tauri/`) | Verifier la compilation Rust |
| `npm run lint` | Lancer ESLint |
| `npm run tauri build` | Build de production (installateur NSIS Windows) |

## Structure du projet

```
src/                          # Frontend React
  pages/                      # 12 pages (lazy-loaded)
  components/
    layout/                   # AppLayout, Header, Sidebar, TabBar, SyncBanner, SearchCrossResults
    pokemon/                  # PokemonCard, TypeBadge, StatsBar, EvolutionChain, MoveTable
    moves/                    # DamageClassIcon
    ui/                       # shadcn components, liquid-glass, pokemon-sprite
  stores/                     # 5 stores Zustand (search, settings, comparison, recent, tabs)
  hooks/                      # 11 hooks (TanStack Query + utilitaires)
  lib/                        # Utilitaires (IPC Tauri, type chart, constants, motion presets)
  types/                      # Interfaces TypeScript

src-tauri/                    # Backend Rust
  src/
    lib.rs                    # Setup Tauri, AppState, enregistrement des 21 commandes
    db.rs                     # Init SQLite (WAL, pool 5 connexions) + migrations
    commands/                 # 9 modules de commandes IPC
    sync/engine.rs            # Moteur de sync (5 phases, semaphore, retry, reprise)
    api/                      # Client PokeAPI + 8 fetchers par ressource
    cache/                    # 7 modules d'upsert SQLite
    models/                   # 8 modules de structs Rust (Serialize/Deserialize)
  migrations/                 # 3 fichiers SQL de migration
```

## Architecture

- **Base denormalisee** — Colonnes `name_en`/`name_fr` dans toutes les tables pour un changement de langue instantane sans jointures
- **Sync engine** — Pipeline en 5 phases avec semaphore (10 requetes concurrentes), retry 3x avec backoff exponentiel, reprise partielle, annulation
- **Donnees client** — Toutes les donnees chargees en memoire (`staleTime: Infinity`) pour recherche/filtre instantane
- **Virtualisation** — Listes longues rendues avec `@tanstack/react-virtual`
- **Code splitting** — 12 pages lazy-loaded avec `React.lazy` + `Suspense`
- **Liquid glass** — Effets visuels style iOS 26 sur la navigation et les cartes

## Licence

(c) 2025 Pokedia
