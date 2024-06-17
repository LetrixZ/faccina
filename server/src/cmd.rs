use crate::archive::get_image_files;
use crate::image::ImageCodec;
use crate::{archive, config::CONFIG, db};
use anyhow::anyhow;
use clap::{Args, Parser, Subcommand};
use funty::Fundamental;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use itertools::Itertools;
use sqlx::{PgPool, QueryBuilder};
use std::path::PathBuf;
use tracing::{error, info};

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
  #[command(about="Generate thumbnails for indexed archives", long_about = None)]
  GenerateThumbnails(GenerateThumbnailArgs),
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
    help = "Re-index and update existing archives"
  )]
  pub reindex: bool,
  #[arg(long, default_value = "false", help = "Skip generating thumbnails")]
  pub skip_thumbnails: bool,
  #[arg(
    long,
    default_value = "false",
    help = "Skip calculating image dimensions. Image dimensions allow to avoid content shift when images are loading."
  )]
  pub skip_dimensions: bool,
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

async fn fetch_archives(
  pool: &PgPool,
  id_ranges: &Option<String>,
) -> Result<Vec<db::ArchiveFile>, sqlx::Error> {
  let mut qb = QueryBuilder::new("SELECT id, path, pages, thumbnail FROM archives WHERE");

  if let Some(id_ranges) = id_ranges {
    let id_ranges = id_ranges.split(",").map(|s| s.trim()).collect_vec();
    let mut ids = vec![];
    let mut ranges = vec![];

    for range in id_ranges {
      let splits = range.split("-").filter(|s| !s.is_empty()).collect_vec();

      if splits.len() == 1 {
        let id = splits.first().unwrap();
        ids.push(id.parse::<i64>().unwrap());
      } else if splits.len() == 2 {
        let start = splits.first().unwrap();
        let end = splits.last().unwrap();
        ranges.push((start.parse::<i64>().unwrap(), end.parse::<i64>().unwrap()))
      }
    }

    qb.push(" id = ANY(").push_bind(ids).push(")");

    if !ranges.is_empty() {
      qb.push(" OR");
    }

    for (i, (start, end)) in ranges.iter().enumerate() {
      qb.push(" (id >= ")
        .push(start)
        .push(" AND id <= ")
        .push_bind(end)
        .push(")");

      if i != ranges.len() - 1 {
        qb.push(" OR");
      }
    }

    let archives = qb
      .push(" ORDER BY id ASC")
      .build_query_as::<db::ArchiveFile>()
      .fetch_all(pool)
      .await?;

    Ok(archives)
  } else {
    let archives = sqlx::query_as!(
      db::ArchiveFile,
      "SELECT id, path, thumbnail FROM archives ORDER BY id ASC"
    )
    .fetch_all(pool)
    .await?;

    Ok(archives)
  }
}

pub async fn index(args: IndexArgs) -> anyhow::Result<()> {
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
        target: "cmd::fetch_archive",
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
    match archive::index_archive(&pool, &multi, archive::IndexArgs::with_args(&args, &path)).await {
      Ok(_) => count += 1,
      Err(err) => pb.suspend(
        || error!(target: "archive::index", "Failed to index archive '{}' - {err}", path.display()),
      ),
    }

    pb.inc(1)
  }

  pb.finish_and_clear();

  info!(target: "archive::index", "Indexed {count} archives");

  Ok(())
}

pub async fn generate_thumbnails(args: GenerateThumbnailArgs) -> anyhow::Result<()> {
  let pool = db::get_pool().await?;
  let archives = fetch_archives(&pool, &args.id).await?;

  let multi = MultiProgress::new();
  let args = &args.into();

  info!(target: "archive::generate_thumbnails", "Image encoding options\n{args:?}");

  for archive in archives {
    if let Err(err) = || -> anyhow::Result<()> {
      let path = CONFIG.directories.links.join(archive.path);
      let mut zip =
        archive::read_zip(&path).map_err(|err| anyhow!("Failed to read zip archive: {err}"))?;
      let mut image_files = get_image_files(&mut zip.file)?;

      archive::generate_thumbnails(
        args,
        &multi,
        image_files.as_mut_slice(),
        archive.id,
        archive.thumbnail.as_usize(),
      )?;

      Ok(())
    }() {
      error!(
        "Failed to generate thumbnails for archive ID {}: {}",
        archive.id, err
      )
    }
  }

  Ok(())
}
