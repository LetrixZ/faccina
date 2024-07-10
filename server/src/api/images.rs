use super::{ApiError, AppState};
use crate::image::ImageEncodeOpts;
use crate::query;
use crate::utils::ToStringExt;
use crate::{config::CONFIG, utils};
use async_zip::base::read::seek::ZipFileReader;
use axum::body::Body;
use axum::http::header;
use axum::response::Response;
use axum::routing::get;
use axum::{
  extract::{Path, State},
  response::IntoResponse,
  Router,
};
use colored::Colorize;
use image::GenericImageView;
use itertools::Itertools;
use serde::Deserialize;
use sqlx::PgPool;
use std::collections::HashMap;
use std::fmt::Display;
use std::io::Cursor;
use std::sync::Arc;
use tokio::fs::{self, File};
use tokio::io::BufReader;
use tokio::sync::oneshot;
use tokio::sync::{mpsc, Mutex};
use tracing::{error, info, warn};

const TARGET: &str = "server::image";

#[derive(Debug, Deserialize)]
enum ImageType {
  #[serde(rename = "c")]
  Cover,
  #[serde(rename = "t")]
  Thumbnail,
  #[serde(rename = "r")]
  Resampled,
}

impl ImageType {
  fn name(&self) -> String {
    match self {
      ImageType::Cover => "c".to_string(),
      ImageType::Thumbnail => "t".to_string(),
      ImageType::Resampled => "r".to_string(),
    }
  }
}

impl Display for ImageType {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      ImageType::Cover => write!(f, "{}over", "c".bold()),
      ImageType::Thumbnail => write!(f, "{}humbnail", "t".bold()),
      ImageType::Resampled => write!(f, "{}esampled", "r".bold()),
    }
  }
}

pub struct ImageEncodeArgs {
  id: i64,
  page: i16,
  filename: String,
  image_type: ImageType,
  pool: PgPool,
}

impl ImageEncodeArgs {
  fn id(&self) -> String {
    format!("{}-{}-{}", self.id, self.page, self.image_type)
  }
}

type EncodingTasksMap =
  Arc<Mutex<HashMap<String, Vec<oneshot::Sender<Result<Vec<u8>, ApiError>>>>>>;

#[derive(Clone)]
pub struct ImageEncodingState {
  pub queue_tx: mpsc::UnboundedSender<ImageEncodeArgs>,
  pub in_progress: EncodingTasksMap,
}

pub struct DimensionArgs {
  pub id: i64,
  pub pool: PgPool,
}

type DimensionsTasksMap =
  Arc<Mutex<HashMap<i64, Vec<oneshot::Sender<Result<Vec<query::ArchiveImage>, ApiError>>>>>>;

#[derive(Clone)]
pub struct DimensionsState {
  pub queue_tx: mpsc::UnboundedSender<DimensionArgs>,
  pub in_progress: DimensionsTasksMap,
}

pub async fn encoding_worker(
  mut queue_rx: mpsc::UnboundedReceiver<ImageEncodeArgs>,
  state: AppState,
) {
  let state = state.image_encoding;

  while let Some(args) = queue_rx.recv().await {
    let task_id = args.id();

    let mut in_progress = state.in_progress.lock().await;

    if let Ok(buf) = encode_page(&args).await {
      if let Some(waiters) = in_progress.remove(&task_id) {
        for waiter in waiters {
          let _ = waiter.send(Ok(buf.clone()));
        }
      }
    } else if let Some(waiters) = in_progress.remove(&task_id) {
      for waiter in waiters {
        let _ = waiter.send(Err(ApiError::InternalError));
      }
    }
  }
}

pub async fn dimensions_worker(
  mut queue_rx: mpsc::UnboundedReceiver<DimensionArgs>,
  state: AppState,
) {
  let state = state.dimensions;

  while let Some(args) = queue_rx.recv().await {
    let mut in_progress = state.in_progress.lock().await;

    match calcualte_dimensions(&args).await {
      Ok(images) => {
        if let Some(waiters) = in_progress.remove(&args.id) {
          for waiter in waiters {
            let _ = waiter.send(Ok(images.clone()));
          }
        }
      }
      Err(err) => {
        error!(
          target = TARGET,
          "Failed to calculate image dimensions for archive ID {}: {err}", args.id
        );

        if let Some(waiters) = in_progress.remove(&args.id) {
          for waiter in waiters {
            let _ = waiter.send(Err(ApiError::InternalError));
          }
        }
      }
    }
  }
}

async fn encode_page(
  ImageEncodeArgs {
    id,
    page,
    filename,
    image_type,
    pool,
  }: &ImageEncodeArgs,
) -> Result<Vec<u8>, ApiError> {
  info!(
    target = TARGET,
    "Encoding {image_type} image for archive ID {id} page {page}"
  );

  let image = sqlx::query!(
    r#"SELECT filename FROM archive_images WHERE archive_id = $1 AND page_number = $2"#,
    id,
    page
  )
  .fetch_optional(pool)
  .await?;

  let archive = sqlx::query!(r#"SELECT key, path FROM archives WHERE id = $1"#, id)
    .fetch_one(pool)
    .await?;

  let file = File::open(CONFIG.directories.content.join(archive.path)).await?;
  let reader = BufReader::new(file);
  let mut zip = ZipFileReader::with_tokio(reader).await?;

  let buf = if let Some(image) = image {
    let file_index = zip
      .file()
      .entries()
      .iter()
      .enumerate()
      .find(|(_, entry)| entry.filename().to_string().eq(&image.filename))
      .map(|(i, _)| i)
      .ok_or(ApiError::ImageNotFound)?;

    let mut reader = zip.reader_with_entry(file_index).await?;
    let mut buf = vec![];
    reader.read_to_end_checked(&mut buf).await?;
    buf
  } else {
    warn!(
      target = TARGET,
      "Couldn't find archive image. Checking the zip archive."
    );

    let image_files = zip
      .file()
      .entries()
      .iter()
      .enumerate()
      .map(|(i, entry)| (i, entry.filename().to_string()))
      .filter(|(_, filename)| utils::is_image(filename))
      .sorted_by(|a, b| natord::compare(&a.1, &b.1))
      .collect_vec();

    let file = image_files.get((page - 1) as usize).unwrap();

    let mut reader = zip.reader_with_entry(file.0).await?;
    let mut buf = vec![];
    reader.read_to_end_checked(&mut buf).await?;
    buf
  };

  let opts = match image_type {
    ImageType::Cover | ImageType::Resampled => ImageEncodeOpts::cover_from(CONFIG.thumbnails),
    ImageType::Thumbnail => ImageEncodeOpts::thumb_from(CONFIG.thumbnails),
  };

  let encoded = crate::image::encode_image(&buf, opts).unwrap();

  let path = CONFIG.directories.thumbs.join(&archive.key).join(format!(
    "{}.{}.{}",
    filename,
    image_type.name(),
    opts.codec.extension()
  ));

  fs::create_dir_all(path.parent().unwrap()).await?;
  fs::write(&path, &encoded).await?;

  Ok(encoded)
}

async fn calcualte_dimensions(
  DimensionArgs { id, pool }: &DimensionArgs,
) -> Result<Vec<query::ArchiveImage>, ApiError> {
  let mut images = sqlx::query_as!(
    query::ArchiveImage,
    "SELECT filename, page_number, width, height FROM archive_images WHERE archive_id = $1 ORDER BY page_number ASC",
    id
  )
  .fetch_all(pool)
  .await?;

  info!(
    target = TARGET,
    "Calculating image dimensions for archive ID {id}"
  );

  let path = sqlx::query_scalar!(r#"SELECT path FROM archives WHERE id = $1"#, id)
    .fetch_one(pool)
    .await?;

  let file = File::open(CONFIG.directories.content.join(path)).await?;
  let reader = BufReader::new(file);
  let mut zip = ZipFileReader::with_tokio(reader).await?;

  if images.is_empty() {
    let mut images = vec![];
    let image_files = zip
      .file()
      .entries()
      .iter()
      .enumerate()
      .map(|(i, entry)| (i, entry.filename().to_string()))
      .filter(|(_, filename)| utils::is_image(filename))
      .sorted_by(|a, b| natord::compare(&a.1, &b.1))
      .collect_vec();

    for (index, filename) in image_files {
      let mut reader = zip.reader_with_entry(index).await?;
      let mut buf = vec![];
      reader.read_to_end_checked(&mut buf).await?;

      let cursor = Cursor::new(&buf);

      if let Ok(img) = ::image::io::Reader::new(cursor)
        .with_guessed_format()?
        .decode()
      {
        let (w, h) = img.dimensions();

        sqlx::query!(
          r#"INSERT INTO archive_images (filename, page_number, width, height, archive_id)
            VALUES ($1, $2, $3, $4, $5)"#,
          filename,
          (index + 1) as i16,
          w as i16,
          h as i16,
          id,
        )
        .execute(pool)
        .await?;

        images.push(query::ArchiveImage {
          filename,
          page_number: (index + 1) as i16,
          width: Some(w as i16),
          height: Some(h as i16),
        })
      }
    }

    Ok(images)
  } else {
    for image in images.iter_mut() {
      if image.width.is_none() || image.height.is_none() {
        if let Some((index, filename)) = zip
          .file()
          .entries()
          .iter()
          .enumerate()
          .map(|(i, entry)| (i, entry.filename().to_string()))
          .find(|(_, filename)| *filename == image.filename)
        {
          let mut reader = zip.reader_with_entry(index).await?;
          let mut buf = vec![];
          reader.read_to_end_checked(&mut buf).await?;

          let cursor = Cursor::new(&buf);

          if let Ok(img) = ::image::io::Reader::new(cursor)
            .with_guessed_format()?
            .decode()
          {
            let (w, h) = img.dimensions();

            image.width = Some(w as i16);
            image.height = Some(h as i16);

            sqlx::query!(
                r#"INSERT INTO archive_images (filename, page_number, width, height, archive_id)
                VALUES ($1, $2, $3, $4, $5) ON CONFLICT (archive_id, page_number) DO UPDATE SET width = $3, height = $4"#,
                filename,
                (index + 1) as i16,
                w as i16,
                h as i16,
                id,
              )
              .execute(pool)
              .await?;
          }
        }
      }
    }
    Ok(images)
  }
}

async fn load_image(
  State(state): State<AppState>,
  Path((key, page, image_type)): Path<(String, i16, ImageType)>,
) -> Result<Response, ApiError> {
  let archive = sqlx::query!(
    r#"SELECT id, path, pages FROM archives WHERE key = $1"#,
    key
  )
  .fetch_optional(&state.pool)
  .await?
  .ok_or(ApiError::NotFound)?;

  let filename = utils::leading_zeros(page, archive.pages.unwrap_or_default());

  let format = CONFIG.thumbnails.format;
  let image_path = CONFIG.directories.thumbs.join(&key).join(format!(
    "{filename}.{}.{}",
    &image_type.name(),
    format.extension()
  ));

  let buf = if let Ok(buf) = fs::read(&image_path).await {
    buf
  } else {
    let mut in_progress = state.image_encoding.in_progress.lock().await;

    let args = ImageEncodeArgs {
      id: archive.id,
      page,
      filename,
      image_type,
      pool: state.pool,
    };

    if let Some(waiters) = in_progress.get_mut(&args.id()) {
      let (responder_tx, responder_rx) = oneshot::channel();
      waiters.push(responder_tx);
      drop(in_progress);
      responder_rx.await??
    } else {
      let (responder_tx, responder_rx) = oneshot::channel();
      in_progress.insert(args.id(), vec![responder_tx]);
      drop(in_progress);
      state.image_encoding.queue_tx.send(args).unwrap();
      responder_rx.await??
    }
  };

  let format = file_format::FileFormat::from_bytes(&buf);
  let body = Body::from(buf);
  let headers = [
    (header::CONTENT_TYPE, format.media_type()),
    (header::CACHE_CONTROL, "public, max-age=259200, immutable"),
  ];

  Ok((headers, body).into_response())
}

async fn get_file(
  State(state): State<AppState>,
  Path((key, filename)): Path<(String, String)>,
) -> Result<Response, ApiError> {
  let archive = sqlx::query!(
    r#"SELECT id, path, filename, page_number, width, height FROM archives
    INNER JOIN archive_images ON archive_id = id AND filename = $2
    WHERE key = $1"#,
    key,
    filename
  )
  .fetch_optional(&state.pool)
  .await?
  .ok_or(ApiError::NotFound)?;

  let path = CONFIG.directories.content.join(archive.path);
  let file = File::open(&path).await?;
  let reader = BufReader::new(file);
  let mut zip = ZipFileReader::with_tokio(reader).await?;

  let (file_index, _) = zip
    .file()
    .entries()
    .iter()
    .enumerate()
    .map(|(i, entry)| (i, entry.filename().to_string()))
    .filter(|(_, filename)| utils::is_image(filename))
    .find(|(_, _filename)| _filename.eq(&archive.filename))
    .ok_or(ApiError::ImageNotFound)?;

  let mut reader = zip.reader_with_entry(file_index).await?;
  let mut buf = vec![];
  reader.read_to_end_checked(&mut buf).await?;

  let format = file_format::FileFormat::from_bytes(&buf);

  if archive.width.is_none() || archive.height.is_none() {
    let cursor = Cursor::new(&buf);
    if let Ok(img) = ::image::io::Reader::new(cursor)
      .with_guessed_format()?
      .decode()
    {
      let (w, h) = img.dimensions();

      if let Err(err) = sqlx::query!(
        r#"UPDATE archive_images
        SET width = $3, height = $4 WHERE archive_id = $1 AND page_number = $2"#,
        archive.id,
        archive.page_number,
        w as i16,
        h as i16
      )
      .execute(&state.pool)
      .await
      {
        warn!(target: "api::image::read", "Failed to calculate image dimensions for page {} of archive ID {}: {err}", archive.page_number, archive.id)
      }
    }
  }

  let body = Body::from(buf);
  let headers = [
    (header::CONTENT_TYPE, format.media_type()),
    (header::CACHE_CONTROL, "public, max-age=259200, immutable"),
  ];

  Ok((headers, body).into_response())
}

pub fn get_routes() -> Router<AppState> {
  Router::new()
    .route("/:hash/:page/:type", get(load_image))
    .route("/:hash/:filename", get(get_file))
}
