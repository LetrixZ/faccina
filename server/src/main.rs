use clap::Parser;
use cmd::{Cli, Commands};
use colored::Colorize;
use config::CONFIG;
use sqlx::{
  postgres::{PgConnectOptions, PgSslMode},
  PgPool,
};

mod archive;
mod archives;
mod cmd;
mod config;
mod dashboard;
mod image;
mod log;
mod scraper;
mod thumbnails;
mod torrents;
mod utils;

pub async fn establish_connection() -> Result<PgPool, sqlx::Error> {
  let pool = PgPool::connect_with(
    PgConnectOptions::new()
      .host(&CONFIG.database.host)
      .port(CONFIG.database.port)
      .database(&CONFIG.database.name)
      .username(&CONFIG.database.user)
      .password(&CONFIG.database.pass)
      .ssl_mode(PgSslMode::Allow),
  )
  .await?;

  sqlx::migrate!("./migrations").run(&pool).await?;

  let count = sqlx::query_scalar!("SELECT COUNT(*) FROM archives WHERE length(key) != 8")
    .fetch_one(&pool)
    .await?;

  if let Some(count) = count {
    if count > 0 {
      tracing::warn!(
        "Found {count} archive that were not migrated. Use the {} command to migrate them.",
        "migrate".bold()
      );
    }
  }

  Ok(pool)
}

async fn run() -> anyhow::Result<()> {
  let cli = Cli::parse();

  match &cli.command {
    Some(command) => {
      crate::log::cli_logging();

      let pool = establish_connection().await?;

      match command {
        Commands::Index(args) => archives::index(args, pool).await?,
        Commands::Dashboard(args) => dashboard::init_server(args, pool).await?,
      }
    }
    None => {
      todo!("Start the server");
      // api::start_server().await?
    }
  }

  Ok(())
}

#[tokio::main]
async fn main() {
  if let Err(ref error) = run().await {
    tracing::error!(
        error = format!("{error:#}"),
        backtrace = %error.backtrace(),
        "process exited with ERROR"
    );
  }
}
