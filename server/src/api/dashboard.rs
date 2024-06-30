use super::models::{Image, ImageDimensions, LibraryPage, Source, Tag, Taxonomy};
use super::routes::SearchQuery;
use super::{ApiError, ApiJson, AppState};
use crate::api::image;
use crate::config::CONFIG;
use crate::db::{self, TagType};
use crate::{archive, cmd, scraper};
use axum::extract::{Json, Path, State};
use axum::routing::post;
use axum::Router;
use axum::{extract::Query, routing::get};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use slug::slugify;
use sqlx::types::Json as SqlJson;
use sqlx::Row;
use sqlx::{PgPool, QueryBuilder};
use std::collections::HashMap;
use std::time::Duration;
use std::{env, path};
use tokio::net::TcpListener;
use tokio::time::sleep;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing::{error, info};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ArchiveData {
  #[serde(default)]
  pub id: i64,
  #[serde(default)]
  pub title: String,
  #[serde(default)]
  pub slug: String,
  pub description: Option<String>,
  #[serde(default)]
  pub path: String,
  #[serde(default)]
  pub hash: String,
  #[serde(default)]
  pub pages: i16,
  #[serde(default)]
  pub size: i64,
  #[serde(default)]
  pub thumbnail: i16,
  pub language: Option<String>,
  #[serde(default)]
  pub created_at: NaiveDateTime,
  #[serde(default)]
  pub released_at: NaiveDateTime,
  pub deleted_at: Option<NaiveDateTime>,
  #[serde(default)]
  pub has_metadata: bool,
  pub artists: Vec<Taxonomy>,
  pub circles: Vec<Taxonomy>,
  pub magazines: Vec<Taxonomy>,
  pub events: Vec<Taxonomy>,
  pub publishers: Vec<Taxonomy>,
  pub parodies: Vec<Taxonomy>,
  pub tags: Vec<Tag>,
  pub sources: Vec<Source>,
  pub images: Vec<Image>,
  pub cover: Option<ImageDimensions>,
}

async fn get_data(ids: Vec<i64>, pool: &PgPool) -> Result<Vec<ArchiveData>, sqlx::Error> {
  let mut qb = QueryBuilder::new(
    r#"SELECT id, title, slug, description, path, hash, pages, size, thumbnail, language, created_at, released_at, deleted_at, has_metadata,"#,
  );

  for tag_type in [
    TagType::Artist,
    TagType::Circle,
    TagType::Magazine,
    TagType::Event,
    TagType::Publisher,
    TagType::Parody,
    TagType::Tag,
  ] {
    if tag_type == TagType::Tag {
      qb.push(format!(
        r#" COALESCE((SELECT json_agg(json_build_object('slug', {table}.slug, 'name', {table}.name, 'namespace', r.namespace) ORDER BY {table}.name)
        FROM {table} INNER JOIN {relation} r ON r.{id} = {table}.id
        WHERE r.archive_id = archives.id), '[]') {table}"#,
        table = tag_type.table(),
        relation = tag_type.relation(),
        id = tag_type.id()
      )).push(",");
    } else {
      qb.push(format!(
        r#" COALESCE((SELECT json_agg(json_build_object('slug', {table}.slug, 'name', {table}.name) ORDER BY {table}.name)
        FROM {table} INNER JOIN {relation} r ON r.{id} = {table}.id
        WHERE r.archive_id = archives.id), '[]') {table}"#,
        table = tag_type.table(),
        relation = tag_type.relation(),
        id = tag_type.id()
      )).push(",");
    }
  }

  qb.push(
    r#"
    COALESCE((SELECT json_agg(source) FROM (SELECT json_build_object('name', name, 'url', url) AS source FROM archive_sources WHERE archive_id = id ORDER BY name ASC) AS ordered_sources), '[]') sources,
    (SELECT json_agg(image) FROM (SELECT json_build_object('filename', filename, 'page_number', page_number, 'width', width, 'height', height) AS image FROM archive_images WHERE archive_id = id ORDER BY page_number ASC) AS ordered_images) images,
    (SELECT json_build_object('width', width, 'height', height) FROM archive_images WHERE archive_id = id AND page_number = thumbnail) cover"#
  );

  qb.push(", ARRAY_POSITION(")
    .push_bind(&ids)
    .push(",id) AS ord");

  qb.push(" FROM archives WHERE id = ANY(")
    .push_bind(&ids)
    .push(") ORDER BY ord");

  let rows = qb.build().fetch_all(pool).await?;

  let archives = rows
    .iter()
    .map(|row| {
      let cover = row
        .try_get::<SqlJson<_>, _>(23)
        .map(|r| r.0)
        .unwrap_or(None)
        .filter(|cover: &ImageDimensions| cover.width.is_some() || cover.height.is_some());

      ArchiveData {
        id: row.get(0),
        title: row.get(1),
        slug: row.get(2),
        description: row.get(3),
        path: row.get(4),
        hash: row.get(5),
        pages: row.get(6),
        size: row.get(7),
        thumbnail: row.get(8),
        language: row.get(9),
        created_at: row.get(10),
        released_at: row.get(11),
        deleted_at: row.get(12),
        has_metadata: row.get(13),
        artists: row.get::<SqlJson<_>, _>(14).0,
        circles: row.get::<SqlJson<_>, _>(15).0,
        magazines: row.get::<SqlJson<_>, _>(16).0,
        events: row.get::<SqlJson<_>, _>(17).0,
        publishers: row.get::<SqlJson<_>, _>(18).0,
        parodies: row.get::<SqlJson<_>, _>(19).0,
        tags: row.get::<SqlJson<_>, _>(20).0,
        sources: row.get::<SqlJson<_>, _>(21).0,
        images: row.get::<SqlJson<_>, _>(22).0,
        cover,
      }
    })
    .collect();

  Ok(archives)
}

async fn gallery(
  Path(id): Path<i64>,
  State(state): State<AppState>,
) -> Result<ApiJson<ArchiveData>, ApiError> {
  let archives = get_data(vec![id], &state.pool).await?;

  match archives.first() {
    Some(archive) => Ok(ApiJson(archive.clone())),
    None => Err(ApiError::NotFound),
  }
}

async fn library(
  Query(params): Query<HashMap<String, String>>,
  State(state): State<AppState>,
) -> Result<ApiJson<LibraryPage<ArchiveData>>, ApiError> {
  let query = SearchQuery::from_params_dashboard(params);
  let (ids, total) = db::search(&query, query.deleted, &state.pool).await?;
  let archives = get_data(ids, &state.pool).await?;

  Ok(ApiJson(LibraryPage {
    archives,
    page: query.page,
    limit: 24,
    total,
  }))
}

async fn save_archive(
  State(state): State<AppState>,
  Json(mut archive): Json<db::UpsertArchiveData>,
) -> Result<ApiJson<Option<ArchiveData>>, ApiError> {
  let info = sqlx::query_as!(
    db::ArchiveId,
    r#"SELECT id, path FROM archives WHERE id = $1"#,
    archive.id,
  )
  .fetch_optional(&state.pool)
  .await?
  .ok_or(ApiError::NotFound)?;

  let id = archive.id.unwrap();

  if archive.slug.is_none() {
    archive.slug = archive.title.as_ref().map(|title| slugify(&title));
  }

  archive.pages = archive.images.as_ref().map(|images| images.len() as i16);

  db::update_archive(archive, &info, false, &state.pool)
    .await
    .map_err(|err| ApiError::UpdateError(err.to_string()))?;

  let archives = get_data(vec![id], &state.pool).await?;
  let archive = archives.first().cloned();

  Ok(ApiJson(archive))
}

async fn scrape(
  Path(site): Path<scraper::ScrapeSite>,
  State(state): State<AppState>,
  Json(ids): Json<Vec<i64>>,
) -> Result<ApiJson<Vec<ArchiveData>>, ApiError> {
  let archives = sqlx::query_as!(
    db::ArchiveId,
    "SELECT id, path FROM archives WHERE id = ANY($1)",
    &ids
  )
  .fetch_all(&state.pool)
  .await?;

  let should_sleep = archives.len() > 1;

  for info in archives {
    info!(target: "dashboard::scrape", "Scraping metadata for archive ID {}", info.id);

    if let Err(err) = scraper::scrape(&info, site, &state.pool).await {
      error!(
        target: "dashboard::scrape",
        "Failed to scrape metadata for archive ID {}: {err}",
        info.id
      );
    }

    if should_sleep {
      sleep(Duration::from_millis(1000)).await;
    }
  }

  let archives = get_data(ids, &state.pool).await?;

  Ok(ApiJson(archives))
}

async fn reindex(
  State(state): State<AppState>,
  Json(ids): Json<Vec<i64>>,
) -> Result<ApiJson<Vec<ArchiveData>>, ApiError> {
  let archives = sqlx::query_as!(
    db::ArchiveId,
    "SELECT id, path FROM archives WHERE id = ANY($1)",
    &ids
  )
  .fetch_all(&state.pool)
  .await?;

  for info in archives {
    if let Err(err) = archive::index(
      &path::Path::new(&info.path),
      archive::IndexOptions {
        reindex: true,
        dimensions: false,
        thumbnails: false,
      },
      &state.pool,
      None,
    )
    .await
    {
      error!(
        target: "dashboard::redindex",
        "Failed to reindex archive ID {}: {err}",
        info.id
      );
    }
  }

  let archives = get_data(ids, &state.pool).await?;
  Ok(ApiJson(archives))
}

pub async fn serve(args: cmd::DashboardArgs) -> anyhow::Result<()> {
  info!(target: "dashboard::config", "Server config\n{}", *CONFIG);

  let dashboard_path = path::Path::new(env!("CARGO_MANIFEST_DIR"))
    .parent()
    .unwrap()
    .join("web/packages/dashboard/dist");

  let pool = db::get_pool().await?;
  let state = AppState { pool };

  let cors = CorsLayer::new().allow_methods(Any).allow_origin(Any);

  let app = Router::new()
    .route("/library", get(library))
    .route("/g/:id", get(gallery))
    .route("/archive", post(save_archive))
    .route("/scrape/:site", post(scrape))
    .route("/reindex", post(reindex))
    .merge(image::get_routes())
    .fallback_service(ServeDir::new(dashboard_path))
    .layer(cors)
    .with_state(state);

  let listener = TcpListener::bind(format!(
    "{host}:{port}",
    host = args.host.unwrap_or(CONFIG.dashboard.host.clone()),
    port = args.port.unwrap_or(CONFIG.dashboard.port)
  ))
  .await?;

  info!(
    r#"Listening on "http://{}""#,
    listener.local_addr().unwrap()
  );

  axum::serve(listener, app).await?;

  Ok(())
}
