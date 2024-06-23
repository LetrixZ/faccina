pub mod images;

use crate::{
  config::CONFIG,
  db, metadata,
  utils::{self, ToStringExt},
};
use data_encoding::HEXUPPER;
use images::{calculate_dimensions, generate_thumbnails, ThumbnailOpts};
use indicatif::MultiProgress;
use itertools::Itertools;
use slug::slugify;
use sqlx::PgPool;
use std::{
  fs,
  io::{Cursor, Read},
  path::Path,
};
use thiserror::Error;
use tracing::{info, warn};
use zip::ZipArchive;

#[derive(Debug, Error)]
enum ArchiveError {
  #[error("Zip archive empty")]
  EmptyZip,
}

pub struct ZipArchiveData {
  pub file: ZipArchive<Cursor<Vec<u8>>>,
  pub hash: String,
  pub size: usize,
}

pub struct ZipFile {
  filename: String,
  contents: Vec<u8>,
}

pub struct IndexOptions {
  pub reindex: bool,
  pub dimensions: bool,
  pub thumbnails: bool,
}

pub fn read_zip(path: &impl AsRef<Path>) -> anyhow::Result<ZipArchiveData> {
  let file_contents = fs::read(path)?;
  let size = file_contents.len();

  let mut cursor = Cursor::new(file_contents);

  let digest = utils::sha256_digest(&mut cursor)?;
  let hash = HEXUPPER.encode(digest.as_ref()).to_lowercase();

  cursor.set_position(0);

  let file = ZipArchive::new(cursor)?;

  Ok(ZipArchiveData { file, hash, size })
}

pub fn get_image_filenames(zip: &mut ZipArchive<Cursor<Vec<u8>>>) -> anyhow::Result<Vec<String>> {
  let mut filenames = vec![];

  for i in 0..zip.len() {
    let file = zip.by_index(i)?;
    let filename = file.enclosed_name().unwrap().to_string();

    if !utils::is_image(&filename) {
      continue;
    }

    filenames.push(filename);
  }

  filenames.sort_by(|a, b| natord::compare(a, b));

  Ok(filenames)
}

pub fn get_zip_files(
  filenames: Vec<String>,
  zip: &mut ZipArchive<Cursor<Vec<u8>>>,
) -> anyhow::Result<Vec<ZipFile>> {
  let mut files: Vec<ZipFile> = vec![];

  for filename in filenames {
    let mut file = zip.by_name(&filename)?;
    let filename = file.enclosed_name().unwrap().to_string();

    if !utils::is_image(&filename) {
      continue;
    }

    let mut buf = vec![];
    file.read_to_end(&mut buf)?;
    files.push(ZipFile {
      filename,
      contents: buf,
    });
  }

  files.sort_by(|a, b| natord::compare(&a.filename, &b.filename));

  Ok(files)
}

pub async fn index(
  path: &Path,
  opts: IndexOptions,
  pool: &PgPool,
  mp: &MultiProgress,
) -> anyhow::Result<bool> {
  if !opts.reindex && sqlx::query_scalar!(
      r#"SELECT id FROM archives WHERE path = $1 AND deleted_at IS NULL"#,
      path.to_string()
    )
    .fetch_optional(pool)
    .await?
    .is_some() {
    return Ok(false);
  }

  mp.suspend(|| info!("Indexing '{}'", path.to_string()));

  let ZipArchiveData {
    mut file,
    hash,
    size,
  } = read_zip(&path)?;

  if file.is_empty() {
    return Err(ArchiveError::EmptyZip.into());
  }

  let mut archive_data = db::UpsertArchiveData {
    path: Some(path.to_string()),
    hash: Some(hash),
    size: Some(size as i64),
    ..Default::default()
  };

  let filename = path.file_stem().unwrap().to_string();

  if let Err(err) = metadata::add_external_metadata(path, &mut archive_data) {
    mp.suspend(
      || warn!(target: "archive::index::metadata", "Failed to get external metadata: {err}"),
    );

    if let Err(err) = metadata::add_metadata(&mut file, &mut archive_data) {
      mp.suspend(
        || warn!(target: "archive::index::metadata", "Failed to get embbeded metadata: {err}"),
      );

      let (title, artists, circles) = utils::parse_filename(&filename);

      if CONFIG.metadata.parse_filename_title {
        archive_data.title = title;
      } else {
        archive_data.title = Some(filename.to_string());
      }

      archive_data.artists = artists;
      archive_data.circles = circles;
    }
  }

  if archive_data.title.is_none() {
    mp.suspend(|| {
      warn!(
        target: "archive::index",
        "Couldn't get a title for the archive. Using filename '{filename}'",
      )
    });

    archive_data.title = Some(filename);
  }

  archive_data.slug = archive_data.title.as_ref().map(slugify);

  if archive_data.released_at.is_none() {
    if let Some(zip_date) = file
      .by_index(0)
      .ok()
      .and_then(|file| file.last_modified().map(utils::parse_zip_date))
    {
      archive_data.released_at = Some(zip_date);
    }
  }

  if archive_data.images.is_none() {
    archive_data.images = Some(
      get_image_filenames(&mut file)?
        .into_iter()
        .enumerate()
        .map(|(i, filename)| db::ArchiveImage {
          filename,
          page_number: (i + 1) as i16,
          ..Default::default()
        })
        .collect(),
    );
  }

  archive_data.pages = archive_data
    .images
    .as_ref()
    .map(|images| images.len() as i16);

  if archive_data.thumbnail.is_none() {
    archive_data.thumbnail = Some(1);
  }

  let thumbnail = archive_data.thumbnail;

  let images = archive_data.images.as_ref().map(|images| {
    images
      .iter()
      .map(|image| (image.page_number, image.filename.clone()))
      .collect_vec()
  });

  let archive_id = db::upsert_archive(archive_data, pool, mp).await?;

  if let (Some(images), Some(thumbnail)) = (images, thumbnail) {
    if opts.dimensions || opts.thumbnails {
      let mut files = get_zip_files(
        images
          .into_iter()
          .sorted_by_key(|image| image.0)
          .map(|image| image.1)
          .collect(),
        &mut file,
      )?;

      if opts.dimensions {
        calculate_dimensions(archive_id, false, &mut files, pool, mp).await?;
      }

      if opts.thumbnails {
        generate_thumbnails(
          archive_id,
          thumbnail as usize,
          &mut files,
          &ThumbnailOpts::from(CONFIG.thumbnails),
          mp,
        )?;
      }
    }
  }

  Ok(true)
}
