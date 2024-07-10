// FIXME: pub mod dashboard;
mod images;
pub mod models;
pub mod routes;

use crate::config::CONFIG;
use crate::query;
use axum::extract::rejection::QueryRejection;
use axum::extract::FromRequest;
use axum::extract::{MatchedPath, Request};
use axum::http::{HeaderName, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use images::{DimensionsState, ImageEncodingState};
use serde::Serialize;
use sqlx::PgPool;
use std::collections::HashMap;
use std::io;
use std::str::FromStr;
use std::sync::Arc;
use thiserror::Error;
use tokio::net::TcpListener;
use tokio::sync::oneshot::error::RecvError;
use tokio::sync::{mpsc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{debug_span, error, info};

#[derive(Clone)]
pub struct AppState {
  pool: PgPool,
  image_encoding: ImageEncodingState,
  dimensions: DimensionsState,
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
  DeserializeError(#[from] serde_json::Error),
  #[error(transparent)]
  IoError(#[from] io::Error),
  #[error(transparent)]
  ZipError(#[from] async_zip::error::ZipError),
  #[error("Image not found")]
  ImageNotFound,
  #[error(transparent)]
  ChannelError(#[from] RecvError),
  #[error("404")]
  NotFound,
  #[error("500")]
  InternalError,
}

impl From<query::DatabaseError> for ApiError {
  fn from(value: query::DatabaseError) -> Self {
    match value {
      query::DatabaseError::DatabaseError(err) => Self::DatabasError(err),
      query::DatabaseError::DeserializeError(err) => Self::DeserializeError(err),
    }
  }
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
        (StatusCode::BAD_REQUEST, "Invalid query params".to_string())
      }
      ApiError::DatabasError(err) => {
        error!(%err, "database error");
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          "Something went wrong".to_string(),
        )
      }
      ApiError::DeserializeError(err) => {
        error!(%err, "deserialize error");
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          "Something went wrong".to_string(),
        )
      }
      ApiError::IoError(err) => {
        error!(%err, "file error");
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          "File not found".to_string(),
        )
      }
      ApiError::ZipError(err) => {
        error!(%err, "zip error");
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          "Error while trying to read archive".to_string(),
        )
      }
      ApiError::ImageNotFound => (
        StatusCode::NOT_FOUND,
        "Image not found in archive".to_string(),
      ),
      ApiError::NotFound => (StatusCode::NOT_FOUND, "Resource not found".to_string()),
      ApiError::ChannelError(err) => {
        error!(%err, "channel error");
        (
          StatusCode::INTERNAL_SERVER_ERROR,
          "Something went wrong".to_string(),
        )
      }
      ApiError::InternalError => (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Something went wrong".to_string(),
      ),
    };

    (status, ApiJson(ErrorResponse { message })).into_response()
  }
}

pub async fn start_server() -> anyhow::Result<()> {
  crate::log::server_logging();

  info!(target: "server::config", "Server config\n{}", *CONFIG);

  let cors = CorsLayer::new()
    .allow_methods(Any)
    .allow_origin(Any)
    .vary([HeaderName::from_str("Accept-Encoding").unwrap()]);

  let pool = query::get_pool().await?;

  let (encoding_tx, encoding_rx) = mpsc::unbounded_channel();
  let (dimensions_tx, dimensions_rx) = mpsc::unbounded_channel();

  let state = AppState {
    pool,
    image_encoding: ImageEncodingState {
      queue_tx: encoding_tx,
      in_progress: Arc::new(Mutex::new(HashMap::new())),
    },
    dimensions: DimensionsState {
      queue_tx: dimensions_tx,
      in_progress: Arc::new(Mutex::new(HashMap::new())),
    },
  };

  tokio::spawn(images::encoding_worker(encoding_rx, state.clone()));
  tokio::spawn(images::dimensions_worker(dimensions_rx, state.clone()));

  let app = Router::new()
    .route("/library", get(routes::library))
    .route("/archive/:id", get(routes::archive_data))
    .nest("/image", images::get_routes())
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
    .with_state(state);

  let listener = TcpListener::bind(format!(
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
