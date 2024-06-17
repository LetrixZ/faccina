use super::{
  models::{ArchiveData, ArchiveId, LibraryPage},
  ApiError, ApiJson, AppState,
};
use crate::{
  config::CONFIG,
  db,
  utils::{self, ToStringExt},
};
use anyhow::anyhow;
use async_zip::tokio::read::seek::ZipFileReader;
use axum::{
  body::Body,
  extract::{Path, Query, State},
  http::header,
  response::{IntoResponse, Response},
};
use serde_json::{Map, Value};
use sqlx::QueryBuilder;
use std::{collections::HashMap, fmt::Display, str::FromStr};
use tokio::{
  fs::File,
  io::{AsyncReadExt, BufReader},
};

pub struct SearchQuery {
  pub value: String,
  pub page: usize,
  pub sort: Sorting,
  pub order: Ordering,
}

impl Display for Ordering {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Ordering::Asc => write!(f, "ASC"),
      Ordering::Desc => write!(f, "DESC"),
    }
  }
}

pub enum Sorting {
  Relevance,
  ReleasedAt,
  CreatedAt,
  Title,
  Pages,
}

impl Default for Sorting {
  fn default() -> Self {
    Self::ReleasedAt
  }
}

impl FromStr for Sorting {
  type Err = anyhow::Error;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    let s = s.to_lowercase();
    let s = s.as_str();

    match s {
      "relevance" => Ok(Self::Relevance),
      "released_at" => Ok(Self::ReleasedAt),
      "created_at" => Ok(Self::CreatedAt),
      "title" => Ok(Self::Title),
      "pages" => Ok(Self::Pages),
      _ => Err(anyhow!("Invalid sort value '{s}'")),
    }
  }
}

pub enum Ordering {
  Asc,
  Desc,
}

impl Default for Ordering {
  fn default() -> Self {
    Self::Desc
  }
}

impl FromStr for Ordering {
  type Err = anyhow::Error;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    let s = s.to_lowercase();
    let s = s.as_str();

    match s {
      "asc" => Ok(Self::Asc),
      "desc" => Ok(Self::Desc),
      _ => Err(anyhow!("Invalid ordering value '{s}'")),
    }
  }
}

enum QueryError {
  Sorting(String),
  Ordering(String),
}

impl QueryError {
  fn kind(&self) -> &str {
    match self {
      QueryError::Sorting(_) => "sorting",
      QueryError::Ordering(_) => "ordering",
    }
  }

  fn message(&self) -> &str {
    match self {
      QueryError::Sorting(msg) => msg,
      QueryError::Ordering(msg) => msg,
    }
  }
}

pub async fn library(
  Query(params): Query<HashMap<String, String>>,
  State(state): State<AppState>,
) -> Result<ApiJson<LibraryPage>, ApiError> {
  let mut errors = vec![];

  let search_query = SearchQuery {
    value: params.get("q").cloned().unwrap_or_default(),
    page: {
      if let Some(page) = params.get("page") {
        page.parse().unwrap_or(1)
      } else {
        1
      }
    },
    sort: {
      if let Some(sort) = params.get("sort") {
        match sort.parse() {
          Ok(sort) => sort,
          Err(err) => {
            errors.push(QueryError::Sorting(err.to_string()));
            Sorting::default()
          }
        }
      } else {
        Sorting::default()
      }
    },
    order: {
      if let Some(order) = params.get("order") {
        match order.parse() {
          Ok(order) => order,
          Err(err) => {
            errors.push(QueryError::Ordering(err.to_string()));
            Ordering::default()
          }
        }
      } else {
        Ordering::default()
      }
    },
  };

  let (archives, total) = db::search(&search_query, &state.pool).await?;

  let errors = errors.iter().fold(Value::Null, |mut acc, error| {
    acc.as_object_mut().unwrap_or(&mut Map::new()).insert(
      error.kind().to_string(),
      Value::String(error.message().to_string()),
    );
    acc
  });

  Ok(ApiJson(LibraryPage {
    archives,
    page: search_query.page,
    limit: 24,
    total,
    errors,
  }))
}

pub async fn archive_info(
  Path(id_slug): Path<String>,
  State(state): State<AppState>,
) -> Result<ApiJson<ArchiveId>, ApiError> {
  let data = db::fetch_archive_info(&state.pool, id_slug).await?;

  if let Some(data) = data {
    Ok(ApiJson(data.into()))
  } else {
    Err(ApiError::NotFound)
  }
}

pub async fn archive_data(
  Path(id_slug): Path<String>,
  State(state): State<AppState>,
) -> Result<ApiJson<ArchiveData>, ApiError> {
  let archive = db::fetch_archive_data(&state.pool, id_slug).await?;

  if let Some(archive) = archive {
    Ok(ApiJson(archive.into()))
  } else {
    Err(ApiError::NotFound)
  }
}

pub async fn page(
  Path((id_slug, page)): Path<(String, i16)>,
  State(state): State<AppState>,
) -> Result<Response, ApiError> {
  if let Some(archive) = db::get_archive_page(&state.pool, id_slug, page).await? {
    let file = File::open(CONFIG.directories.links.join(archive.id.to_string())).await?;
    let reader = BufReader::new(file);
    let mut zip = ZipFileReader::with_tokio(reader).await?;

    let file = zip
      .file()
      .entries()
      .iter()
      .enumerate()
      .find(|(_, entry)| entry.filename().as_str().unwrap().eq(&archive.filename))
      .map(|(i, _)| i);

    let index = file.ok_or(ApiError::ImageNotFound)?;

    let mut reader = zip.reader_with_entry(index).await?;
    let mut buf = vec![];
    reader.read_to_end_checked(&mut buf).await?;

    let format = file_format::FileFormat::from_bytes(&buf);
    let body = Body::from(buf);
    let headers = [
      (header::CONTENT_TYPE, format.media_type()),
      (header::CACHE_CONTROL, "public, max-age=259200, immutable"),
    ];

    Ok((headers, body).into_response())
  } else {
    Err(ApiError::NotFound)
  }
}

pub async fn page_thumbnail(
  Path((id_slug, page)): Path<(String, i16)>,
  State(state): State<AppState>,
) -> Result<Response, ApiError> {
  if let Some(archive) = db::get_archive_page(&state.pool, id_slug, page).await? {
    let name = utils::leading_zeros(page, archive.pages);

    let mut walker = globwalk::glob(format!(
      "{}/{}.t.{{avif,webp,jpeg,png}}",
      CONFIG
        .directories
        .thumbs
        .join(archive.id.to_string())
        .to_string(),
      name
    ))
    .unwrap();

    if let Some(entry) = walker.next() {
      let entry = entry.unwrap();
      let mut file = File::open(entry.path()).await?;

      let mut buf = vec![];
      file.read_to_end(&mut buf).await?;

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
    } else {
      Err(ApiError::NotFound)
    }
  } else {
    Err(ApiError::NotFound)
  }
}

pub async fn gallery_cover(
  Path(id_slug): Path<String>,
  State(state): State<AppState>,
) -> Result<Response, ApiError> {
  let mut qb = QueryBuilder::new(r#"SELECT id FROM archives WHERE "#);

  if let Ok(id) = id_slug.parse::<i64>() {
    qb.push(" id = ").push_bind(id);
  } else {
    qb.push(" slug = ").push_bind(id_slug);
  }

  if let Some(id) = qb
    .build_query_scalar::<i64>()
    .fetch_optional(&state.pool)
    .await?
  {
    let mut walker = globwalk::glob(format!(
      "{}/*.c.{{avif,webp,jpeg,png}}",
      CONFIG.directories.thumbs.join(id.to_string()).to_string()
    ))
    .unwrap();

    if let Some(entry) = walker.next() {
      let entry = entry.unwrap();
      let mut file = File::open(entry.path()).await?;

      let mut buf = vec![];
      file.read_to_end(&mut buf).await?;

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
    } else {
      Err(ApiError::NotFound)
    }
  } else {
    Err(ApiError::NotFound)
  }
}
