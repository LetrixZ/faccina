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
use image::GenericImageView;
use itertools::Itertools;
use sqlx::PgPool;
use tokio::fs::{self, File};
use tokio::io::{AsyncReadExt, BufReader};
use tracing::{error, warn};

const TARGET: &str = "server::image";

pub fn get_routes() -> Router<AppState> {
  Router::new()
    .route("/image/:hash/cover", get(get_cover))
    .route("/image/:hash/:page", get(get_page))
    .route("/image/:hash/:page/thumb", get(get_page_thumbnail))
}

async fn encode_page(
  pool: &PgPool,
  archive_id: i64,
  page: i16,
  filename: &str,
  is_cover: bool,
) -> Result<Vec<u8>, ApiError> {
  let image = sqlx::query!(
    "SELECT filename FROM archive_images WHERE archive_id = $1 AND page_number = $2",
    archive_id,
    page
  )
  .fetch_optional(pool)
  .await?;

  let path = CONFIG.directories.links.join(archive_id.to_string());
  let file = File::open(&path).await?;
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

  let opts = if is_cover {
    ImageEncodeOpts::cover_from(CONFIG.thumbnails)
  } else {
    ImageEncodeOpts::thumb_from(CONFIG.thumbnails)
  };

  let encoded = crate::image::encode_image(&buf, opts).unwrap();

  let path = CONFIG
    .directories
    .thumbs
    .join(archive_id.to_string())
    .join(format!(
      "{}.{}.{}",
      filename,
      if is_cover { "c" } else { "t" },
      opts.codec.extension()
    ));

  fs::create_dir_all(path.parent().unwrap()).await?;
  fs::write(&path, &encoded).await?;

  Ok(encoded)
}

async fn get_cover(
  State(state): State<AppState>,
  Path(hash): Path<String>,
) -> Result<Response, ApiError> {
  let archive = sqlx::query!(
    "SELECT id, path, pages, thumbnail FROM archives WHERE hash = $1",
    hash
  )
  .fetch_optional(&state.pool)
  .await?
  .ok_or(ApiError::NotFound)?;

  let files = if let Ok(mut dir) =
    fs::read_dir(CONFIG.directories.thumbs.join(archive.id.to_string())).await
  {
    let mut files = vec![];

    while let Ok(Some(entry)) = dir.next_entry().await {
      let filename = entry.file_name();

      if filename.to_string().contains(".c.") {
        files.push(entry);
      }
    }

    files
  } else {
    vec![]
  };

  let buf = if files.is_empty() {
    warn!(
      target = TARGET,
      "Cover image file not found. Generating cover."
    );
    let filename = utils::leading_zeros(archive.thumbnail, archive.pages);

    encode_page(&state.pool, archive.id, archive.thumbnail, &filename, true).await?
  } else {
    let entry = files.first().unwrap();
    let mut file = File::open(entry.path()).await?;
    let mut buf = vec![];
    file.read_to_end(&mut buf).await?;
    buf
  };

  let format = file_format::FileFormat::from_bytes(&buf);

  let body = Body::from(buf);
  let headers = [
    (
      header::CONTENT_TYPE,
      format!("image/{}", format.extension()),
    ),
    (
      header::CACHE_CONTROL,
      "public, max-age=259200, immutable".into(),
    ),
  ];

  Ok((headers, body).into_response())
}

async fn get_page_thumbnail(
  State(state): State<AppState>,
  Path((hash, page)): Path<(String, i16)>,
) -> Result<Response, ApiError> {
  let archive = sqlx::query!("SELECT id, path, pages FROM archives WHERE hash = $1", hash)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(ApiError::NotFound)?;

  let files = if let Ok(mut dir) =
    fs::read_dir(CONFIG.directories.thumbs.join(archive.id.to_string())).await
  {
    let mut files = vec![];

    while let Ok(Some(entry)) = dir.next_entry().await {
      let filename = entry.file_name();

      if filename.to_string().contains(&format!("{}.t.", page)) {
        files.push(entry);
      }
    }

    files
  } else {
    vec![]
  };

  let buf = if files.is_empty() {
    warn!(
      target = TARGET,
      "Page thumbnail image file not found. Generating thumbnail."
    );
    let filename = utils::leading_zeros(page, archive.pages);

    encode_page(&state.pool, archive.id, page, &filename, false).await?
  } else {
    let entry = files.first().unwrap();
    let mut file = File::open(entry.path()).await?;
    let mut buf = vec![];
    file.read_to_end(&mut buf).await?;
    buf
  };

  let format = file_format::FileFormat::from_bytes(&buf);

  let body = Body::from(buf);
  let headers = [
    (
      header::CONTENT_TYPE,
      format!("image/{}", format.extension()),
    ),
    (
      header::CACHE_CONTROL,
      "public, max-age=259200, immutable".into(),
    ),
  ];

  Ok((headers, body).into_response())
}

async fn get_page(
  State(state): State<AppState>,
  Path((hash, page)): Path<(String, i16)>,
) -> Result<Response, ApiError> {
  let archive = sqlx::query!(
    r#"SELECT id, path,
    (SELECT filename FROM archive_images WHERE archive_id = id AND page_number = $2)
    FROM archives WHERE hash = $1"#,
    hash,
    page
  )
  .fetch_optional(&state.pool)
  .await?
  .ok_or(ApiError::NotFound)?;

  let path = CONFIG.directories.links.join(archive.id.to_string());
  let file = File::open(&path).await?;
  let reader = BufReader::new(file);
  let mut zip = ZipFileReader::with_tokio(reader).await?;

  let buf = if let Some(filename) = archive.filename {
    let (file_index, _) = zip
      .file()
      .entries()
      .iter()
      .enumerate()
      .map(|(i, entry)| (i, entry.filename().to_string()))
      .filter(|(_, filename)| utils::is_image(filename))
      .find(|(_, _filename)| _filename.eq(&filename))
      .ok_or(ApiError::ImageNotFound)?;

    let mut reader = zip.reader_with_entry(file_index).await?;
    let mut buf = vec![];
    reader.read_to_end_checked(&mut buf).await?;
    buf
  } else {
    let image_files = zip
      .file()
      .entries()
      .iter()
      .enumerate()
      .map(|(i, entry)| (i, entry.filename().to_string()))
      .filter(|(_, filename)| utils::is_image(filename))
      .sorted_by(|a, b| natord::compare(&a.1, &b.1))
      .collect_vec();

    let file = image_files
      .get((page - 1) as usize)
      .ok_or(ApiError::ImageNotFound)?;

    let mut reader = zip.reader_with_entry(file.0).await?;
    let mut buf = vec![];
    reader.read_to_end_checked(&mut buf).await?;

    if let Ok(image) = ::image::load_from_memory(&buf) {
      let (w, h) = image.dimensions();

      if let Err(err) = sqlx::query!(
        r#"INSERT INTO archive_images (archive_id, filename, page_number, width, height)
        VALUES ($1, $2, $3, $4, $5)"#,
        archive.id,
        file.1,
        page,
        w as i32,
        h as i32,
      )
      .execute(&state.pool)
      .await
      {
        error!(
          "Failed to save image dimensions for page {} archive ID {}: {err}",
          page, archive.id
        );
      }
    }

    buf
  };

  let format = file_format::FileFormat::from_bytes(&buf);

  let body = Body::from(buf);
  let headers = [
    (
      header::CONTENT_TYPE,
      format!("image/{}", format.extension()),
    ),
    (
      header::CACHE_CONTROL,
      "public, max-age=259200, immutable".into(),
    ),
  ];

  Ok((headers, body).into_response())
}
