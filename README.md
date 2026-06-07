# Pokedia

Encyclopedie Pokemon desktop pour joueurs de hackroms. Bilingue EN/FR.

Pokedia est maintenant une application desktop native GTK/libadwaita. Elle lit les donnees depuis une base SQLite locale et importe automatiquement les datasets hackrom livres avec l'application.

## Fonctionnalites

- Pokedex complet avec stats, types, talents, attaques, chaine d'evolution et formes alternatives
- Encyclopedie des attaques avec filtres par type, classe de degats et puissance
- Encyclopedie des objets avec categories, descriptions et emplacements hackrom
- Encyclopedie des talents avec effets detailles et Pokemon associes
- Table des natures
- Table des types interactive avec support double type et ajustements par talent
- Comparateur de Pokemon
- Favoris
- Onglets natifs pour garder plusieurs pages de detail ouvertes
- Donnees hackrom integrees pour Run & Bun, Radical Red et Emerald Imperium

## Stack technique

| Couche | Technologies |
|--------|--------------|
| Desktop | Rust, GTK4, libadwaita |
| Donnees | SQLite, sqlx |
| Runtime | Tokio |
| Reseau | reqwest pour le cache local des sprites |
| Donnees embarquees | JSON hackrom compile dans le binaire |

## Prerequis

- Rust >= 1.77.2
- GTK4 et libadwaita installes sur le systeme

Sur Fedora:

```bash
sudo dnf install gtk4-devel libadwaita-devel
```

Sur Ubuntu/Debian:

```bash
sudo apt install libgtk-4-dev libadwaita-1-dev
```

## Commandes

```bash
cargo run --bin pokedia-gtk
cargo check --bin pokedia-gtk
cargo build --release --bin pokedia-gtk
```

## Structure du projet

```text
Cargo.toml
src/
  bin/pokedia-gtk.rs       # Interface GTK/libadwaita
  lib.rs                   # Modules partages et donnees embarquees
  db.rs                    # Initialisation SQLite et migrations
  native.rs                # Requetes de lecture pour le client GTK
  cache/games.rs           # Import des datasets hackrom embarques
  models/                  # Structures Rust serialisables et FromRow
data/games/                # Datasets hackrom JSON
migrations/                # Migrations SQL
icons/                     # Icones de l'application
HackRomInfo/               # Documents sources des hackroms
```

## Donnees locales

La base SQLite est creee dans le dossier de donnees utilisateur `com.pokedia.app` et s'appelle `pokedia.db`. Les migrations sont appliquees au demarrage. Les datasets hackrom embarques sont reimportes automatiquement quand leur empreinte change.

## Licence

(c) 2025 Pokedia
