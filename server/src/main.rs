use clap::Parser;
use cmd::{Cli, Commands};
use std::panic;
use tracing::error;

mod api;
mod archive;
mod cmd;
mod config;
mod db;
mod log;
mod metadata;
mod utils;

async fn run() -> anyhow::Result<()> {
  let cli = Cli::parse();

  match &cli.command {
    Some(command) => {
      crate::log::cli_logging();

      match command {
        Commands::Index(args) => cmd::index(args.clone()).await?,
        Commands::GenerateThumbnails(args) => cmd::generate_thumbnails(args.clone()).await?,
      }
    }
    None => api::start_server().await?,
  }

  Ok(())
}

#[tokio::main]
async fn main() {
  panic::set_hook(Box::new(|panic| error!(%panic, "process panicked")));

  if let Err(ref error) = run().await {
    error!(
        error = format!("{error:#}"),
        backtrace = %error.backtrace(),
        "process exited with ERROR"
    );
  }
}
