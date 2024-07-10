use crate::archive::ZipArchiveData;
use crate::image::ImageCodec;
use crate::{archive, config::CONFIG};
use crate::{archives, dashboard, scraper, torrents, utils};
use clap::{Args, Parser, Subcommand};
use funty::Fundamental;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use sqlx::{PgPool, QueryBuilder};
use std::path::PathBuf;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{debug, error, info};

#[derive(Args, Clone)]
pub struct IndexTorrentArsgs {
  pub paths: Option<Vec<PathBuf>>,
  #[arg(
    short,
    long,
    default_value = "false",
    help = "Navigate directory recursively"
  )]
  pub recursive: bool,
  #[arg(
    long,
    default_value = "false",
    help = "Re-index and update existing archive torrents"
  )]
  pub reindex: bool,
  #[arg(
    long,
    help = "List of archive IDs or range to index torrents for (ex: 1-10,14,230-400)"
  )]
  pub id: Option<String>,
}

#[derive(Args, Clone)]
pub struct GenerateThumbnailArgs {
  #[arg(long, help = "List of archive IDs or range (ex: 1-10,14,230-400)")]
  pub id: Option<String>,
  #[arg(long, default_value = "false", help = "Regenerate existing thumbnails")]
  pub regenerate: bool,
  #[arg(long, help = "Width for the page thumbnails")]
  pub width: Option<u32>,
  #[arg(long, help = "Width for the gallery cover")]
  pub cover_width: Option<u32>,
  #[arg(
    long,
    help = "Image encoder quality for the page thumbnails. From 1 to 100 (worst to best)"
  )]
  pub quality: Option<u8>,
  #[arg(long, help = "Image encoder quality for the gallery cover")]
  pub cover_quality: Option<u8>,
  #[arg(
    long,
    help = "AVIF encoder speed for the page thumbnails. From 1 to 10 (slowest to fastest)"
  )]
  pub speed: Option<u8>,
  #[arg(long, help = "AVIF encoder speed for the gallery cover")]
  pub cover_speed: Option<u8>,
  #[arg(long, help = "Image format")]
  pub format: Option<ImageCodec>,
}

#[derive(Args, Clone)]
pub struct CalculateDimensionsArgs {
  #[arg(long, help = "List of archive IDs or range (ex: 1-10,14,230-400)")]
  pub id: Option<String>,
  #[arg(
    long,
    default_value = "false",
    help = "Recalculate existing image dimensions"
  )]
  pub recalculate: Option<bool>,
}

#[derive(Args, Clone)]
pub struct ScrapeArgs {
  #[arg(help = "Site to scrape")]
  pub site: scraper::ScrapeSite,
  #[arg(long, help = "List of archive IDs or range (ex: 1-10,14,230-400)")]
  pub id: Option<String>,
  #[arg(
    long,
    default_value = "1000",
    help = "Miliseconds to wait between archives"
  )]
  pub sleep: u64,
}

#[derive(Args, Clone)]
pub struct PublishArgs {
  #[arg(help = "List of archive IDs or range (ex: 1-10,14,230-400)")]
  pub id: String,
}

#[derive(sqlx::FromRow)]
struct ArchiveFile {
  id: i64,
  path: String,
  thumbnail: i16,
}

async fn fetch_archives(
  pool: &PgPool,
  id_ranges: &Option<String>,
) -> Result<Vec<ArchiveFile>, sqlx::Error> {
  if let Some(id_ranges) = id_ranges {
    let mut qb = QueryBuilder::new("SELECT id, path, thumbnail FROM archives WHERE");

    utils::add_id_ranges(&mut qb, id_ranges);

    let archives = qb
      .push(" AND deleted_at IS NULL ORDER BY id ASC")
      .build_query_as::<ArchiveFile>()
      .fetch_all(pool)
      .await?;

    Ok(archives)
  } else {
    let archives = sqlx::query_as!(
      ArchiveFile,
      "SELECT id, path, thumbnail FROM archives WHERE deleted_at IS NULL ORDER BY id ASC"
    )
    .fetch_all(pool)
    .await?;

    Ok(archives)
  }
}

pub async fn index_torrents(args: IndexTorrentArsgs, pool: &PgPool) -> anyhow::Result<()> {
  let paths = args
    .paths
    .clone()
    .unwrap_or(vec![CONFIG.directories.content.clone()]);

  let mut paths_to_index = vec![];

  for path in paths {
    if path.is_dir() {
      let pattern = if args.recursive {
        format!("{}/**/*.torrent", path.to_str().unwrap())
      } else {
        format!("{}/*.torrent", path.to_str().unwrap())
      };

      let walker = globwalk::glob(&pattern).unwrap();

      for entry in walker {
        let entry = entry.unwrap();
        paths_to_index.push(entry.path().to_owned());
      }
    } else if path.is_file() {
      paths_to_index.push(path);
    } else {
      error!(
        target: "cmd::index_torrents",
        "The given path is not a valid path or couldn't be accessed: {}",
        path.display()
      );
    }
  }

  let multi = MultiProgress::new();
  let pb = ProgressBar::new(paths_to_index.len().as_u64());

  pb.set_style(
    ProgressStyle::with_template("[{elapsed_precise}] {bar:40.green/white} {pos:>7}/{len:7}")
      .unwrap(),
  );
  multi.add(pb.clone());

  let mut count = 0;

  for path in paths_to_index {
    match torrents::index(&pool, &multi,  torrents::IndexTorrentArgs::with_args(&args, &path)).await {
      Ok(_) => count += 1,
      Err(err) => pb.suspend(
        || error!(target: "cmd::index_torrents", "Failed to index torrent '{}' - {err}", path.display()),
      ),
    }

    pb.inc(1)
  }

  pb.finish_and_clear();

  info!(target: "cmd::index_torrents", "Indexed {count} torrent");

  Ok(())
}

pub async fn generate_thumbnails(args: GenerateThumbnailArgs, pool: &PgPool) -> anyhow::Result<()> {
  let archives = fetch_archives(&pool, &args.id).await?;

  let mp = MultiProgress::new();
  let opts = &args.into();

  info!(target: "archive::generate_thumbnails", "Image encoding options\n{opts:?}");

  for archive in archives {
    if let Err(err) = || -> anyhow::Result<()> {
      let path = CONFIG.directories.links.join(archive.path);
      let ZipArchiveData { mut file, .. } = archive::read_zip(&path)?;
      let images = archive::get_image_filenames(&mut file)?;
      let mut files = archive::get_zip_files(images, &mut file)?;

      mp.suspend(|| info!(target: "archive::generate_thumbnails", "Generating thumbnails for archive ID {}", archive.id));

      archive::images::generate_thumbnails(
        archive.id,
        archive.thumbnail as usize,
        &mut files,
        opts,
        Some(&mp),
      )?;

      Ok(())
    }() {
      mp.suspend(|| {
        error!(
          target: "archive::generate_thumbnails",
          "Failed to generate thumbnails for archive ID {}: {}",
          archive.id, err
        )
      })
    }
  }

  Ok(())
}

async fn calculate_dimensions_archive(
  id: i64,
  path: &str,
  recalculate: bool,
  pool: &PgPool,
  mp: &MultiProgress,
) -> anyhow::Result<()> {
  let path = CONFIG.directories.links.join(&path);
  let ZipArchiveData { mut file, .. } = archive::read_zip(&path)?;
  let images = archive::get_image_filenames(&mut file)?;
  let mut files = archive::get_zip_files(images, &mut file)?;

  mp.suspend(|| info!(target: "archive::calculate_dimensions", "Calculating image dimensions for archive ID {id}"));

  archive::images::calculate_dimensions(id, recalculate, &mut files, pool, Some(mp)).await?;

  Ok(())
}

pub async fn calculate_dimensions(
  args: CalculateDimensionsArgs,
  pool: &PgPool,
) -> anyhow::Result<()> {
  let archives = fetch_archives(&pool, &args.id).await?;

  let mp = MultiProgress::new();

  let recalculate = args.recalculate.unwrap_or_default();

  for archive in archives {
    if let Err(err) =
      calculate_dimensions_archive(archive.id, &archive.path, recalculate, &pool, &mp).await
    {
      mp.suspend(|| {
        error!(
          target: "archive::calculate_dimensions",
          "Failed to calculate dimensions for archive ID {}: {}",
          archive.id, err
        )
      })
    }
  }

  Ok(())
}

pub async fn scrape(args: ScrapeArgs, pool: &PgPool) -> anyhow::Result<()> {
  let archives: Vec<i64> = if let Some(id_ranges) = args.id {
    let mut qb = QueryBuilder::new("SELECT id FROM archives WHERE");

    utils::add_id_ranges(&mut qb, &id_ranges);

    qb.push(" AND deleted_at IS NULL ORDER BY id ASC")
      .build_query_scalar()
      .fetch_all(pool)
      .await?
  } else {
    sqlx::query_scalar!(
      r#"SELECT id FROM archives
      WHERE has_metadata IS FALSE AND deleted_at IS NULL ORDER BY id ASC"#
    )
    .fetch_all(pool)
    .await?
  };

  let mp = MultiProgress::new();
  let pb = ProgressBar::new(archives.len() as u64);
  mp.add(pb.clone());

  let should_sleep = archives.len() > 1;

  for id in archives {
    mp.suspend(|| info!(target: "archive::scrape", "Scraping metadata for archive ID {}", id));

    if let Err(err) = scraper::scrape(id, args.site, &pool).await {
      mp.suspend(|| {
        error!(
          target: "archive::scrape",
          "Failed to scrape metadata for archive ID {id}: {err}",
        )
      });
    }

    if should_sleep {
      mp.suspend(|| debug!("Sleeping for {}ms", args.sleep));
      sleep(Duration::from_millis(args.sleep)).await;
    }

    pb.inc(1);
  }

  Ok(())
}

#[derive(Parser)]
#[command(version, about, long_about = None)]
#[command(propagate_version = true)]
pub struct Cli {
  #[command(subcommand)]
  pub command: Option<Commands>,
}

#[derive(Subcommand)]
pub enum Commands {
  #[command(about = "Index archive(s) located in the configured path.")]
  Index(archives::IndexArgs),
  #[command(about = "Start admin dashboard server.")]
  Dashboard(dashboard::DashboardArgs),
}
