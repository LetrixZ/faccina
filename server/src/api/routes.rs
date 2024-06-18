use super::{
  models::{ArchiveData, LibraryPage},
  ApiError, ApiJson, AppState,
};
use crate::db;
use anyhow::anyhow;
use axum::extract::{Path, Query, State};
use serde_json::{Map, Value};
use std::{collections::HashMap, fmt::Display, str::FromStr};

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

pub async fn archive_data(
  Path(id): Path<i64>,
  State(state): State<AppState>,
) -> Result<ApiJson<ArchiveData>, ApiError> {
  let archive = db::fetch_archive_data(&state.pool, id).await?;

  if let Some(archive) = archive {
    Ok(ApiJson(archive.into()))
  } else {
    Err(ApiError::NotFound)
  }
}
