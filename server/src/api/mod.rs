mod image;
pub mod models;
pub mod routes;

use crate::config::CONFIG;
use crate::db;
use axum::extract::rejection::QueryRejection;
use axum::extract::FromRequest;
use axum::extract::{MatchedPath, Request};
use axum::http::{Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Serialize;
use sqlx::PgPool;
use std::io;
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
    };

    (status, ApiJson(ErrorResponse { message })).into_response()
  }
}

pub async fn start_server() -> anyhow::Result<()> {
  crate::log::server_logging();

  info!(target: "server::config", "Server config\n{}", *CONFIG);

  let pool = db::get_pool().await?;
  let state = AppState { pool };

  let cors = CorsLayer::new()
    .allow_methods([Method::GET, Method::POST])
    .allow_origin(Any);

  let app = Router::new()
    .route("/library", get(routes::library))
    .route("/archive/:id", get(routes::archive_data))
    .merge(image::get_routes())
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
