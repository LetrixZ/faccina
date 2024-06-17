use std::fs::OpenOptions;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::CONFIG;

pub fn server_logging() {
  let log_file = OpenOptions::new()
    .append(true)
    .create(true)
    .open(CONFIG.directories.log.join("server.log"))
    .expect("Failed to open log file");

  tracing_subscriber::registry()
    .with(
      tracing_subscriber::EnvFilter::try_from_env("LOG_LEVEL")
        .unwrap_or_else(|_| "debug,sqlx::query=info,sqlx::postgres::notice=warn".into()),
    )
    .with(tracing_subscriber::fmt::layer())
    .with(
      tracing_subscriber::fmt::layer()
        .with_ansi(false)
        .with_writer(log_file),
    )
    .init();
}

pub fn cli_logging() {
  let log_file = OpenOptions::new()
    .append(true)
    .create(true)
    .open(CONFIG.directories.log.join("cli.log"))
    .expect("Failed to open log file");

  tracing_subscriber::registry()
    .with(
      tracing_subscriber::EnvFilter::try_from_env("LOG_LEVEL")
        .unwrap_or_else(|_| "info,sqlx::postgres::notice=warn".into()),
    )
    .with(tracing_subscriber::fmt::layer())
    .with(
      tracing_subscriber::fmt::layer()
        .with_ansi(false)
        .with_writer(log_file),
    )
    .init();
}
