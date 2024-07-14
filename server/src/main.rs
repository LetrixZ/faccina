use clap::Parser;
use cmd::{Cli, Commands};
use tracing::error;

mod api;
mod archive;
mod cmd;
mod config;
mod db;
mod image;
mod log;
mod metadata;
mod scraper;
mod torrents;
mod utils;

const VERSION: &str = env!("CARGO_PKG_VERSION");

async fn run() -> anyhow::Result<()> {
  let cli = Cli::parse();

  match &cli.command {
    Some(command) => {
      crate::log::cli_logging();

      match command {
        Commands::Index(args) => cmd::index(args.clone()).await?,
        Commands::IndexTorrent(args) => cmd::index_torrents(args.clone()).await?,
        Commands::GenerateThumbnails(args) => cmd::generate_thumbnails(args.clone()).await?,
        Commands::CalculateDimensions(args) => cmd::calculate_dimensions(args.clone()).await?,
        Commands::Scrape(args) => cmd::scrape(args.clone()).await?,
        Commands::Publish(args) => cmd::pusblish(args.clone(), true).await?,
        Commands::Unpublish(args) => cmd::pusblish(args.clone(), false).await?,
      }
    }
    None => api::start_server().await?,
  }

  Ok(())
}

#[tokio::main]
async fn main() {
  if let Err(ref error) = run().await {
    error!(
        error = format!("{error:#}"),
        backtrace = %error.backtrace(),
        "process exited with ERROR"
    );
  }
}
