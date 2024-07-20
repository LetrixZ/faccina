mod image;
pub mod models;
pub mod routes;

use crate::config::CONFIG;
use crate::utils::ToStringExt;
use crate::{db, utils, VERSION};
use ::image::GenericImageView;
use async_zip::tokio::read::seek::ZipFileReader;
use axum::extract::rejection::QueryRejection;
use axum::extract::FromRequest;
use axum::extract::{MatchedPath, Request};
use axum::http::{HeaderName, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use itertools::Itertools;
use serde::Serialize;
use sqlx::PgPool;
use std::collections::HashMap;
use std::io::{self, Cursor};
use std::str::FromStr;
use std::sync::Arc;
use thiserror::Error;
use tokio::fs::File;
use tokio::io::BufReader;
use tokio::sync::{mpsc, oneshot, Mutex};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{debug_span, error, info};

type DimensionsTasksMap =
  Arc<Mutex<HashMap<i64, Vec<oneshot::Sender<Result<Vec<db::ArchiveImage>, ()>>>>>>;

#[derive(Clone)]
pub struct AppState {
  pool: PgPool,
  dimensions_queue: mpsc::UnboundedSender<i64>,
  dimensions_in_progress: DimensionsTasksMap,
}

#[derive(FromRequest)]
#[from_request(via(axum::Json), rejection(ApiError))]
pub struct ApiJson<T>(T);

impl<T> IntoResponse for ApiJson<T>
where
  axum::Json<T>: IntoResponse,
{
  fn into_response(self) -> Response {
    axum::Json(self.0).into_response()
  }
}

#[derive(Debug, Error)]
pub enum ApiError {
  #[error(transparent)]
  QueryExtractorRejection(#[from] QueryRejection),
  #[error(transparent)]
  DatabasError(#[from] sqlx::Error),
  #[error(transparent)]
  IoError(#[from] io::Error),
  #[error(transparent)]
  ZipError(#[from] async_zip::error::ZipError),
  #[error("Image not found")]
  ImageNotFound,
  #[error("404")]
  NotFound,
  #[error("Failed to encode image '{0}' for archive ID '{1}'")]
  ImageEncodingError(String, i64),
  #[error(transparent)]
  RecvError(#[from] tokio::sync::oneshot::error::RecvError),
}

impl IntoResponse for ApiError {
  fn into_response(self) -> axum::response::Response {
    #[derive(Serialize)]
    struct ErrorResponse {
      message: String,
    }

    let (status, message) = match self {
      ApiError::QueryExtractorRejection(err) => {
        error!(%err, "query error");
        println!("{:?}", (err.status(), err.body_text()));
        (StatusCode::BAD_REQUEST, "Invalid query params".to_owned())
      }
      ApiError::DatabasError(err) => {
        error!(%err, "database error");
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          "Something went wrong".to_owned(),
        )
      }
      ApiError::IoError(err) => {
        error!(%err, "file error");
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          "File not found".to_owned(),
        )
      }
      ApiError::ZipError(err) => {
        error!(%err, "zip error");
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          "Error while trying to read archive".to_owned(),
        )
      }
      ApiError::ImageNotFound => (
        StatusCode::NOT_FOUND,
        "Image not found in archive".to_string(),
      ),
      ApiError::NotFound => (StatusCode::NOT_FOUND, "Resource not found".to_string()),
      ApiError::ImageEncodingError(filename, archive_id) => (
        StatusCode::INTERNAL_SERVER_ERROR,
        format!("Failed to encode image '{filename}' for archive ID '{archive_id}'"),
      ),
      ApiError::RecvError(err) => {
        error!(%err, "receiver error");
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          "Something went wrong".to_owned(),
        )
      }
    };

    (status, ApiJson(ErrorResponse { message })).into_response()
  }
}

pub async fn start_server() -> anyhow::Result<()> {
  crate::log::server_logging();

  info!("Server version {}", VERSION);
  info!("Server config\n{}", *CONFIG);

  let pool = db::get_pool().await?;

  let cors = CorsLayer::new()
    .allow_methods(Any)
    .allow_origin(Any)
    .vary([HeaderName::from_str("Accept-Encoding").unwrap()]);

  let (dimensions_queue_tx, dimensions_queue_rx) = mpsc::unbounded_channel();
  let dimensions_in_progress = Arc::new(Mutex::new(HashMap::new()));

  tokio::spawn(dimensions_worker(
    dimensions_queue_rx,
    dimensions_in_progress.clone(),
    pool.clone(),
  ));

  let app = Router::new()
    .route("/", get(|| async { VERSION.into_response() }))
    .route("/library", get(routes::library))
    .route("/archive/:id", get(routes::archive_data))
    .route("/taxonomy", get(routes::taxonomy))
    .nest("/image", image::get_routes(pool.clone()))
    .layer(cors)
    .layer(
      TraceLayer::new_for_http()
        .make_span_with(|req: &Request| {
          let method = req.method();
          let uri = req.uri();

          let matched_path = req
            .extensions()
            .get::<MatchedPath>()
            .map(|matched_path| matched_path.as_str());

          debug_span!("request", %method, %uri, matched_path)
        })
        .on_failure(()),
    )
    .with_state(AppState {
      pool: pool.clone(),
      dimensions_queue: dimensions_queue_tx,
      dimensions_in_progress: dimensions_in_progress.clone(),
    });

  let listener = tokio::net::TcpListener::bind(format!(
    "{host}:{port}",
    host = CONFIG.server.host,
    port = CONFIG.server.port
  ))
  .await?;

  info!(
    r#"Listening on "http://{}""#,
    listener.local_addr().unwrap()
  );

  axum::serve(listener, app).await?;

  Ok(())
}

pub async fn dimensions_worker(
  mut queue_rx: mpsc::UnboundedReceiver<i64>,
  in_progress: DimensionsTasksMap,
  pool: PgPool,
) {
  while let Some(id) = queue_rx.recv().await {
    let mut in_progress = in_progress.lock().await;

    match calculate_dimensions(id, &pool).await {
      Ok(images) => {
        if let Some(waiters) = in_progress.remove(&id) {
          for waiter in waiters {
            let _ = waiter.send(Ok(images.clone()));
          }
        }
      }
      Err(err) => {
        error!("Failed to calculate image dimensions for archive ID {id}: {err}",);

        if let Some(waiters) = in_progress.remove(&id) {
          for waiter in waiters {
            let _ = waiter.send(Err(()));
          }
        }
      }
    }
  }
}

async fn calculate_dimensions(id: i64, pool: &PgPool) -> Result<Vec<db::ArchiveImage>, ApiError> {
  let mut images = sqlx::query_as!(
    db::ArchiveImage,
    "SELECT filename, page_number, width, height FROM archive_images WHERE archive_id = $1 ORDER BY page_number ASC",
    id
  )
  .fetch_all(pool)
  .await?;

  info!("Calculating image dimensions for archive ID {id}");

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

        images.push(db::ArchiveImage {
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
