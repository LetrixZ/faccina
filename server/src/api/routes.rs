use super::{
  models::{ArchiveData, ArchiveListItem, LibraryPage},
  ApiError, ApiJson, AppState,
};
use crate::db;
use anyhow::anyhow;
use axum::extract::{Path, Query, State};
use std::{collections::HashMap, fmt::Display, str::FromStr};

#[derive(Debug)]
pub struct SearchQuery {
  pub value: String,
  pub page: usize,
  pub sort: Sorting,
  pub order: Ordering,
  pub limit: usize,
  pub deleted: bool,
}

impl SearchQuery {
  pub fn from_params_dashboard(params: HashMap<String, String>) -> Self {
    Self {
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
          sort.parse().unwrap_or_default()
        } else {
          Sorting::default()
        }
      },
      order: {
        if let Some(order) = params.get("order") {
          order.parse().unwrap_or_default()
        } else {
          Ordering::default()
        }
      },
      limit: params
        .get("limit")
        .and_then(|param| param.parse().ok())
        .unwrap_or(0),
      deleted: params.get("unpublished").is_some(),
    }
  }

  pub fn from_params(params: HashMap<String, String>) -> Self {
    Self {
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
          sort.parse().unwrap_or_default()
        } else {
          Sorting::default()
        }
      },
      order: {
        if let Some(order) = params.get("order") {
          order.parse().unwrap_or_default()
        } else {
          Ordering::default()
        }
      },
      limit: 24,
      deleted: false,
    }
  }
}

impl Display for Ordering {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Ordering::Asc => write!(f, "ASC"),
      Ordering::Desc => write!(f, "DESC"),
    }
  }
}

#[derive(Debug)]
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

#[derive(Debug)]
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

pub async fn library(
  Query(params): Query<HashMap<String, String>>,
  State(state): State<AppState>,
) -> Result<ApiJson<LibraryPage<ArchiveListItem>>, ApiError> {
  let query = SearchQuery::from_params(params);
  let (ids, total) = db::search(&query, query.deleted, &state.pool).await?;
  let archives = db::get_list_items(ids, &state.pool).await?;

  Ok(ApiJson(LibraryPage {
    archives,
    page: query.page,
    limit: 24,
    total,
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
