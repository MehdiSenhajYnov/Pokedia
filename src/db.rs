use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::Path;
use std::str::FromStr;

/// Initialize the SQLite database at an explicit path.
pub async fn init_db_at_path(db_path: &Path) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let db_url = format!("sqlite:{}?mode=rwc", db_path.to_string_lossy());

    log::info!("Database path: {}", db_url);

    let options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(30));

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    run_migrations(&pool).await?;

    Ok(pool)
}

/// Run all schema migrations in order.
async fn run_migrations(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    let migrations = [
        include_str!("../migrations/001_initial_schema.sql"),
        include_str!("../migrations/002_add_species_id.sql"),
        include_str!("../migrations/003_add_natures_abilities.sql"),
        include_str!("../migrations/004_game_selector.sql"),
    ];

    for migration_sql in migrations {
        for statement in migration_sql.split(';') {
            let cleaned: String = statement
                .lines()
                .filter(|line| !line.trim_start().starts_with("--"))
                .collect::<Vec<_>>()
                .join("\n");
            let trimmed = cleaned.trim();
            if trimmed.is_empty() {
                continue;
            }
            if let Err(e) = sqlx::query(trimmed).execute(pool).await {
                // ALTER TABLE ADD COLUMN fails if column already exists; safe to skip.
                if trimmed.to_uppercase().contains("ALTER TABLE") {
                    log::info!("Migration skipped (already applied): {}", e);
                } else {
                    return Err(e.into());
                }
            }
        }
    }

    log::info!("Database migrations completed successfully");
    Ok(())
}
