use crate::archive::ZipArchiveData;
use crate::db::ArchiveFile;
use crate::image::ImageCodec;
use crate::{api, scraper, torrents, utils};
use crate::{archive, config::CONFIG, db};
use clap::{Args, Parser, Subcommand};
use funty::Fundamental;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use sqlx::{PgPool, QueryBuilder};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use tracing::{debug, error, info};

#[derive(Parser)]
#[command(version, about, long_about = None)]
#[command(propagate_version = true)]
pub struct Cli {
  #[command(subcommand)]
  pub command: Option<Commands>,
}

#[derive(Subcommand)]
pub enum Commands {
  #[command(about="Index archive(s) located in the given path(s). Defaults to configured content path.", long_about = None)]
  Index(IndexArgs),
  #[command(about = "Index archive(s) torrents for indexed archives", long_about = None)]
  IndexTorrent(IndexTorrentArsgs),
  #[command(about="Generate thumbnails for indexed archives", long_about = None)]
  GenerateThumbnails(GenerateThumbnailArgs),
  #[command(about="Calculate image dimensions. Useful to fix image ordering.", long_about = None)]
  CalculateDimensions(CalculateDimensionsArgs),
  #[command(about="Scrape metadata for archives.", long_about = None)]
  Scrape(ScrapeArgs),
  #[command(about="Show given archives from the search results.", long_about = None)]
  Publish(PublishArgs),
  #[command(about="Hide given archives from the search results.", long_about = None)]
  Unpublish(PublishArgs),
  #[command(about = "Start admin dashboard server.")]
  Dashboard(DashboardArgs),
}

#[derive(Args, Clone)]
pub struct IndexArgs {
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
    help = "Reindex and update existing archives"
  )]
  pub reindex: bool,
  #[arg(long, default_value = "false", help = "Calculate image dimensions")]
  pub dimensions: bool,
  #[arg(long, default_value = "false", help = "Generate thumbnails")]
  pub thumbnails: bool,
  #[arg(
    long,
    help = "Start re-indexing from this path. Useful for resuming after an error."
  )]
  pub from_path: Option<PathBuf>,
}

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

#[derive(Args, Clone)]
pub struct DashboardArgs {
  #[arg(
    short = 'H',
    long,
    default_value = "127.0.0.1",
    help = "Dashboard host"
  )]
  pub host: Option<String>,
  #[arg(short = 'P', long, default_value = "3001", help = "Dashboard port")]
  pub port: Option<u16>,
  #[arg(long, help = "Server host. Defaults to configured server host")]
  pub server_host: Option<String>,
  #[arg(long, help = "Server port. Defaults to configured server port")]
  pub server_port: Option<u16>,
}

async fn fetch_archives(
  pool: &PgPool,
  id_ranges: &Option<String>,
) -> Result<Vec<db::ArchiveFile>, sqlx::Error> {
  if let Some(id_ranges) = id_ranges {
    let mut qb = QueryBuilder::new("SELECT id, path, thumbnail FROM archives WHERE");

    utils::add_id_ranges(&mut qb, id_ranges);

    let archives = qb
      .push(" AND deleted_at IS NULL ORDER BY id ASC")
      .build_query_as::<db::ArchiveFile>()
      .fetch_all(pool)
      .await?;

    Ok(archives)
  } else {
    let archives = sqlx::query_as!(
      db::ArchiveFile,
      "SELECT id, path, thumbnail FROM archives WHERE deleted_at IS NULL ORDER BY id ASC"
    )
    .fetch_all(pool)
    .await?;

    Ok(archives)
  }
}

pub async fn index(mut args: IndexArgs) -> anyhow::Result<()> {
  let has_path_arg = args.paths.is_some();

  if !has_path_arg {
    args.recursive = true;
  }

  let paths = args
    .paths
    .clone()
    .unwrap_or(vec![CONFIG.directories.content.clone()]);

  let mut paths_to_index = vec![];

  for path in paths {
    if path.is_dir() {
      let pattern = if args.recursive {
        format!("{}/**/*.{{cbz,zip}}", path.to_str().unwrap())
      } else {
        format!("{}/*.{{cbz,zip}}", path.to_str().unwrap())
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
        target: "cmd::index",
        "The given path is not a valid path or couldn't be accessed: {}",
        path.display()
      );
    }
  }

  if !has_path_arg {
    if let Some(from_path) = &args.from_path {
      let mut should_add = false;
      let mut paths = vec![];

      for path in &paths_to_index {
        if path.eq(from_path) {
          should_add = true;
        }

        if !should_add {
          continue;
        }

        paths.push(path.to_path_buf());
      }

      paths_to_index = paths;
    }
  }

  let pool = db::get_pool().await?;
  let mp = MultiProgress::new();
  let pb = ProgressBar::new(paths_to_index.len().as_u64());

  pb.set_style(
    ProgressStyle::with_template("[{elapsed_precise}] {bar:40.green/white} {pos:>7}/{len:7}")
      .unwrap(),
  );
  mp.add(pb.clone());

  let mut count = 0;

  let start = Instant::now();

  for path in paths_to_index {
    match archive::index(
      &path,
      archive::IndexOptions {
        reindex: args.reindex,
        dimensions: args.dimensions,
        thumbnails: args.thumbnails,
      },
      &pool,
      Some(&mp),
    )
    .await
    {
      Ok(indexed) => {
        if indexed {
          count += 1
        }
      }
      Err(err) => pb.suspend(
        || error!(target: "cmd::index", "Failed to index archive '{}' - {err}", path.display()),
      ),
    }

    pb.inc(1)
  }

  pb.finish_and_clear();

  let end = Instant::now();

  info!(target: "cmd::index", "Indexed {count} archives in {:?}", end - start);

  Ok(())
}

pub async fn index_torrents(args: IndexTorrentArsgs) -> anyhow::Result<()> {
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

  let pool = db::get_pool().await?;
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

pub async fn generate_thumbnails(args: GenerateThumbnailArgs) -> anyhow::Result<()> {
  let pool = db::get_pool().await?;
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
  archive: &ArchiveFile,
  recalculate: bool,
  pool: &PgPool,
  mp: &MultiProgress,
) -> anyhow::Result<()> {
  let path = CONFIG.directories.links.join(&archive.path);
  let ZipArchiveData { mut file, .. } = archive::read_zip(&path)?;
  let images = archive::get_image_filenames(&mut file)?;
  let mut files = archive::get_zip_files(images, &mut file)?;

  mp.suspend(|| info!(target: "archive::calculate_dimensions", "Calculating image dimensions for archive ID {}", archive.id));

  archive::images::calculate_dimensions(archive.id, recalculate, &mut files, pool, Some(mp))
    .await?;

  Ok(())
}

pub async fn calculate_dimensions(args: CalculateDimensionsArgs) -> anyhow::Result<()> {
  let pool = db::get_pool().await?;
  let archives = fetch_archives(&pool, &args.id).await?;

  let mp = MultiProgress::new();

  let recalculate = args.recalculate.unwrap_or_default();

  for archive in archives {
    if let Err(err) = calculate_dimensions_archive(&archive, recalculate, &pool, &mp).await {
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

pub async fn scrape(args: ScrapeArgs) -> anyhow::Result<()> {
  let pool = db::get_pool().await?;

  let archives: Vec<db::ArchiveId> = if let Some(id_ranges) = args.id {
    let mut qb = QueryBuilder::new("SELECT id, path FROM archives WHERE");

    utils::add_id_ranges(&mut qb, &id_ranges);

    qb.push(" AND deleted_at IS NULL ORDER BY id ASC")
      .build_query_as()
      .fetch_all(&pool)
      .await?
  } else {
    sqlx::query_as!(
      db::ArchiveId,
      r#"SELECT id, path FROM archives WHERE has_metadata IS FALSE AND deleted_at IS NULL ORDER BY id ASC"#
    )
    .fetch_all(&pool)
    .await?
  };

  let mp = MultiProgress::new();
  let pb = ProgressBar::new(archives.len() as u64);
  mp.add(pb.clone());

  let should_sleep = archives.len() > 1;

  for info in archives {
    mp.suspend(|| info!(target: "archive::scrape", "Scraping metadata for archive ID {}", info.id));

    if let Err(err) = scraper::scrape(&info, args.site, &pool).await {
      mp.suspend(|| {
        error!(
          target: "archive::scrape",
          "Failed to scrape metadata for archive ID {}: {err}",
          info.id
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

pub async fn pusblish(args: PublishArgs, publish: bool) -> anyhow::Result<()> {
  let pool = db::get_pool().await?;

  let mut qb = QueryBuilder::new("UPDATE archives SET ");

  if publish {
    qb.push("deleted_at = NULL");
  } else {
    qb.push("deleted_at = NOW()");
  }

  qb.push(" WHERE");

  utils::add_id_ranges(&mut qb, &args.id);
  let affected = qb.build().execute(&pool).await?;

  info!("{} archives updated", affected.rows_affected());

  Ok(())
}

pub async fn init_dashboard(args: DashboardArgs) -> anyhow::Result<()> {
  api::dashboard::serve(args).await
}
