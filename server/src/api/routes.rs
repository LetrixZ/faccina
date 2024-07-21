use super::{
  models::{ArchiveData, Image, LibraryPage},
  ApiError, ApiJson, AppState,
};
use crate::db;
use anyhow::anyhow;
use axum::extract::{Path, Query, State};
use serde::Serialize;
use std::{collections::HashMap, fmt::Display, str::FromStr};
use tokio::sync::oneshot;

#[derive(Debug)]
pub struct SearchQuery {
  pub value: String,
  pub page: usize,
  pub sort: Sorting,
  pub order: Ordering,
  pub blacklist: Vec<String>,
  pub seed: Option<String>
}

impl Display for Ordering {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Ordering::Asc => write!(f, "ASC"),
      Ordering::Desc => write!(f, "DESC"),
    }
  }
}

#[derive(Debug, PartialEq, Eq)]
pub enum Sorting {
  Relevance,
  ReleasedAt,
  CreatedAt,
  Title,
  Pages,
  Random,
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
      "random" => Ok(Self::Random),
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
) -> Result<ApiJson<LibraryPage>, ApiError> {
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
    blacklist: params
      .get("blacklist")
      .map(|blacklist| blacklist.split('_').map(|s| s.trim().to_owned()).collect())
      .unwrap_or_default(),
    seed: params.get("seed").map(|s| s.to_owned()),
  };

  let (archives, total) = db::search(&search_query, &state.pool).await?;

  Ok(ApiJson(LibraryPage {
    archives,
    page: search_query.page,
    limit: 24,
    total,
  }))
}

pub async fn archive_data(
  Path(id): Path<i64>,
  State(state): State<AppState>,
) -> Result<ApiJson<ArchiveData>, ApiError> {
  let mut archive = db::fetch_archive_data(id, &state.pool)
    .await?
    .ok_or(ApiError::NotFound)?;

  if archive.images.is_empty()
    || archive
      .images
      .iter()
      .any(|image| image.width.is_none() || image.height.is_none())
  {
    let mut in_progress = state.dimensions_in_progress.lock().await;

    if let Some(waiters) = in_progress.get_mut(&id) {
      let (responder_tx, responder_rx) = oneshot::channel();
      waiters.push(responder_tx);

      drop(in_progress);

      if let Ok(images) = responder_rx.await? {
        archive.images = images
          .iter()
          .map(|image| Image {
            filename: image.filename.clone(),
            page_number: image.page_number,
            width: image.width,
            height: image.height,
          })
          .collect();
      }
    } else {
      let (responder_tx, responder_rx) = oneshot::channel();
      in_progress.insert(id, vec![responder_tx]);
      drop(in_progress);
      state.dimensions_queue.send(id).unwrap();

      if let Ok(images) = responder_rx.await? {
        archive.images = images
          .iter()
          .map(|image| Image {
            filename: image.filename.clone(),
            page_number: image.page_number,
            width: image.width,
            height: image.height,
          })
          .collect();
      }
    }
  }

  Ok(ApiJson(archive.into()))
}

#[derive(Serialize, Debug)]
pub struct TaxonomyTypes {
  artists: Vec<db::TaxonomyId>,
  circles: Vec<db::TaxonomyId>,
  magazines: Vec<db::TaxonomyId>,
  events: Vec<db::TaxonomyId>,
  publishers: Vec<db::TaxonomyId>,
  parodies: Vec<db::TaxonomyId>,
  tags: Vec<db::TaxonomyId>,
}

pub async fn taxonomy(State(state): State<AppState>) -> Result<ApiJson<TaxonomyTypes>, ApiError> {
  let artists = sqlx::query!("SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'slug', slug) ORDER BY name), '[]') artists FROM artists")
    .fetch_one(&state.pool)
    .await?;

  let circles = sqlx::query!("SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'slug', slug) ORDER BY name), '[]') circles FROM circles")
    .fetch_one(&state.pool)
    .await?;

  let magazines = sqlx::query!("SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'slug', slug) ORDER BY name), '[]') magazines FROM magazines")    .fetch_one(&state.pool)   .await?;

  let events = sqlx::query!("SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'slug', slug) ORDER BY name), '[]') events FROM events")
    .fetch_one(&state.pool)
    .await?;

  let publishers = sqlx::query!("SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'slug', slug) ORDER BY name), '[]') publishers FROM publishers")
    .fetch_one(&state.pool)
    .await?;

  let parodies = sqlx::query!("SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'slug', slug) ORDER BY name), '[]') parodies FROM parodies")
    .fetch_one(&state.pool)
    .await?;

  let tags = sqlx::query!("SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'slug', slug) ORDER BY name), '[]') tags FROM tags")
    .fetch_one(&state.pool)
    .await?;

  Ok(ApiJson(TaxonomyTypes {
    artists: serde_json::from_value(artists.artists.unwrap()).unwrap_or_default(),
    circles: serde_json::from_value(circles.circles.unwrap()).unwrap_or_default(),
    magazines: serde_json::from_value(magazines.magazines.unwrap()).unwrap_or_default(),
    events: serde_json::from_value(events.events.unwrap()).unwrap_or_default(),
    publishers: serde_json::from_value(publishers.publishers.unwrap()).unwrap_or_default(),
    parodies: serde_json::from_value(parodies.parodies.unwrap()).unwrap_or_default(),
    tags: serde_json::from_value(tags.tags.unwrap()).unwrap_or_default(),
  }))
}
