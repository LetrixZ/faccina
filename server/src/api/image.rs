use super::{ApiError, AppState};
use crate::image::ImageEncodeOpts;
use crate::utils::ToStringExt;
use crate::{config::CONFIG, utils};
use async_zip::base::read::seek::ZipFileReader;
use axum::body::Body;
use axum::http::header;
use axum::response::Response;
use axum::{
  extract::{Path, State},
  response::IntoResponse,
  routing::get,
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
use tokio::sync::{mpsc, oneshot, Mutex};
use tracing::{error, info, warn};

const TARGET: &str = "server::image";

pub fn get_routes(pool: PgPool) -> Router<AppState> {
  let (encoding_queue_tx, encoding_queue_rx) = mpsc::unbounded_channel();
  let encoding_in_progress = Arc::new(Mutex::new(HashMap::new()));

  tokio::spawn(encoding_worker(
    encoding_queue_rx,
    encoding_in_progress.clone(),
    pool.clone(),
  ));

  Router::new()
    .route("/:hash/:filename", get(get_file))
    .route("/:hash/:page/:type", get(load_image))
    .with_state(ImageState {
      pool,
      encoding_queue: encoding_queue_tx,
      encoding_in_progress: encoding_in_progress.clone(),
    })
}

type EncodingTasksMap = Arc<Mutex<HashMap<String, Vec<oneshot::Sender<Result<Vec<u8>, ()>>>>>>;

#[derive(Clone)]
struct ImageState {
  pool: PgPool,
  encoding_queue: mpsc::UnboundedSender<ImageEncodeArgs>,
  encoding_in_progress: EncodingTasksMap,
}

#[derive(Debug, Deserialize)]
enum ImageType {
  #[serde(rename = "c", alias = "cover")]
  Cover,
  #[serde(rename = "t", alias = "thumb")]
  Thumbnail,
  #[serde(rename = "r", alias = "resampled")]
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
}

impl ImageEncodeArgs {
  fn id(&self) -> String {
    format!("{}-{}-{}", self.id, self.page, self.image_type)
  }
}

pub async fn encoding_worker(
  mut queue_rx: mpsc::UnboundedReceiver<ImageEncodeArgs>,
  in_progress: EncodingTasksMap,
  pool: PgPool,
) {
  while let Some(args) = queue_rx.recv().await {
    let task_id = args.id();

    let mut in_progress = in_progress.lock().await;

    match encode_page(&args, &pool).await {
      Ok(buf) => {
        if let Some(waiters) = in_progress.remove(&task_id) {
          for waiter in waiters {
            let _ = waiter.send(Ok(buf.clone()));
          }
        }
      }
      Err(err) => {
        error!(
          "Failed to calculate image dimensions for archive ID {}: {err}",
          args.id
        );
        if let Some(waiters) = in_progress.remove(&task_id) {
          for waiter in waiters {
            let _ = waiter.send(Err(()));
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
  }: &ImageEncodeArgs,
  pool: &PgPool,
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

  let archive = sqlx::query!(r#"SELECT id, hash, path FROM archives WHERE id = $1"#, id)
    .fetch_one(pool)
    .await?;

  let file = File::open(CONFIG.directories.links.join(archive.id.to_string())).await?;
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

  let path = CONFIG.directories.thumbs.join(&archive.hash).join(format!(
    "{}.{}.{}",
    filename,
    image_type.name(),
    opts.codec.extension()
  ));

  fs::create_dir_all(path.parent().unwrap()).await?;
  fs::write(&path, &encoded).await?;

  Ok(encoded)
}

async fn load_image(
  State(state): State<ImageState>,
  Path((hash, page, image_type)): Path<(String, i16, ImageType)>,
) -> Result<Response, ApiError> {
  let archive = sqlx::query!(
    r#"SELECT id, path, pages FROM archives WHERE hash = $1"#,
    hash
  )
  .fetch_optional(&state.pool)
  .await?
  .ok_or(ApiError::NotFound)?;

  let filename = utils::leading_zeros(page, archive.pages.unwrap_or_default());

  let format = CONFIG.thumbnails.format;
  let image_path = CONFIG.directories.thumbs.join(&hash).join(format!(
    "{filename}.{}.{}",
    &image_type.name(),
    format.extension()
  ));

  let buf = if let Ok(buf) = fs::read(&image_path).await {
    buf
  } else {
    let mut in_progress = state.encoding_in_progress.lock().await;

    let args = ImageEncodeArgs {
      id: archive.id,
      page,
      filename: filename.clone(),
      image_type,
    };

    if let Some(waiters) = in_progress.get_mut(&args.id()) {
      let (responder_tx, responder_rx) = oneshot::channel();
      waiters.push(responder_tx);
      drop(in_progress);
      responder_rx
        .await?
        .map_err(|_| ApiError::ImageEncodingError(filename, archive.id))?
    } else {
      let (responder_tx, responder_rx) = oneshot::channel();
      in_progress.insert(args.id(), vec![responder_tx]);
      drop(in_progress);
      state.encoding_queue.send(args).unwrap();
      responder_rx
        .await?
        .map_err(|_| ApiError::ImageEncodingError(filename, archive.id))?
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
  State(state): State<ImageState>,
  Path((hash, filename)): Path<(String, String)>,
) -> Result<Response, ApiError> {
  let archive = sqlx::query!(
    r#"SELECT id, path, filename, page_number, width, height FROM archives
    INNER JOIN archive_images ON archive_id = id AND filename = $2
    WHERE hash = $1"#,
    hash,
    filename
  )
  .fetch_optional(&state.pool)
  .await?
  .ok_or(ApiError::NotFound)?;

  let path = CONFIG.directories.links.join(archive.id.to_string());
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
