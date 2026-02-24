use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;
use tauri::Manager;

/// Initialize the SQLite database: create file, pool, and run migrations.
pub async fn init_db(app_handle: &tauri::AppHandle) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to resolve app data directory");

    // Ensure the directory exists
    std::fs::create_dir_all(&app_data_dir)?;

    let db_path = app_data_dir.join("pokedia.db");
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
                // ALTER TABLE ADD COLUMN fails if column already exists — safe to skip
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
