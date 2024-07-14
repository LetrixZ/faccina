mod image;
pub mod models;
pub mod routes;

use crate::config::CONFIG;
use crate::{db, VERSION};
use axum::extract::rejection::QueryRejection;
use axum::extract::FromRequest;
use axum::extract::{MatchedPath, Request};
use axum::http::{HeaderName, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Serialize;
use sqlx::PgPool;
use std::io;
use std::str::FromStr;
use thiserror::Error;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{debug_span, error, info};

#[derive(Clone)]
pub struct AppState {
  pool: PgPool,
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
        },
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

  let app = Router::new()
    .route("/", get(|| async { VERSION.into_response() }))
    .route("/library", get(routes::library))
    .route("/archive/:id", get(routes::archive_data))
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
    .with_state(AppState { pool: pool.clone() });

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
