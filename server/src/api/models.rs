use crate::db;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct Archive {
  pub id: i64,
  pub slug: String,
  pub title: String,
  pub description: Option<String>,
  pub hash: String,
  pub pages: i16,
  pub size: i64,
  pub cover: Option<ImageDimensions>,
  pub thumbnail: i16,
  pub images: Vec<Image>,
  pub created_at: NaiveDateTime,
  pub released_at: NaiveDateTime,
}

impl From<db::Archive> for Archive {
  fn from(
    db::Archive {
      id,
      slug,
      title,
      description,
      hash,
      pages,
      size,
      cover,
      thumbnail,
      images,
      created_at,
      released_at,
    }: db::Archive,
  ) -> Self {
    Self {
      id,
      slug,
      title,
      description,
      hash,
      pages,
      size,
      cover,
      thumbnail,
      images,
      created_at,
      released_at,
    }
  }
}

#[derive(Serialize)]
pub struct ArchiveId {
  pub id: i64,
  pub slug: String,
}

impl From<db::ArchiveId> for ArchiveId {
  fn from(value: db::ArchiveId) -> Self {
    Self {
      id: value.id,
      slug: value.slug,
    }
  }
}

#[derive(Serialize)]
pub struct ArchiveData {
  pub id: i64,
  pub slug: String,
  pub title: String,
  pub description: Option<String>,
  pub hash: String,
  pub pages: i16,
  pub size: i64,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub cover: Option<ImageDimensions>,
  pub thumbnail: i16,
  pub images: Vec<Image>,
  pub created_at: NaiveDateTime,
  pub released_at: NaiveDateTime,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub artists: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub circles: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub magazines: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub events: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub publishers: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub parodies: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub tags: Vec<Tag>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub sources: Vec<Source>,
}

impl From<db::ArchiveRelations> for ArchiveData {
  fn from(
    db::ArchiveRelations {
      id,
      slug,
      title,
      description,
      hash,
      pages,
      size,
      cover,
      thumbnail,
      images,
      created_at,
      released_at,
      artists,
      circles,
      magazines,
      events,
      publishers,
      parodies,
      tags,
      sources,
    }: db::ArchiveRelations,
  ) -> Self {
    Self {
      id,
      slug,
      title,
      description,
      hash,
      pages,
      size,
      cover,
      thumbnail,
      images,
      created_at,
      released_at,
      artists: artists.into_iter().map(|t| t.into()).collect(),
      circles: circles.into_iter().map(|t| t.into()).collect(),
      magazines: magazines.into_iter().map(|t| t.into()).collect(),
      events: events.into_iter().map(|t| t.into()).collect(),
      publishers: publishers.into_iter().map(|t| t.into()).collect(),
      parodies: parodies.into_iter().map(|t| t.into()).collect(),
      tags: tags.into_iter().map(|t| t.into()).collect(),
      sources: sources.into_iter().map(|s| s.into()).collect(),
    }
  }
}

#[derive(Serialize, Deserialize)]
pub struct Taxonomy {
  pub slug: String,
  pub name: String,
}

impl From<db::Taxonomy> for Taxonomy {
  fn from(item: db::Taxonomy) -> Self {
    Taxonomy {
      slug: item.slug,
      name: item.name,
    }
  }
}

#[derive(Serialize, Deserialize)]
pub struct Tag {
  pub slug: String,
  pub name: String,
  pub namespace: String,
}

impl From<db::Tag> for Tag {
  fn from(item: db::Tag) -> Self {
    Tag {
      slug: item.slug,
      name: item.name,
      namespace: item.namespace,
    }
  }
}

#[derive(Serialize)]
pub struct Source {
  pub name: String,
  pub url: Option<String>,
}

impl From<db::ArchiveSource> for Source {
  fn from(item: db::ArchiveSource) -> Self {
    Source {
      name: item.name,
      url: item.url,
    }
  }
}

#[derive(Serialize)]
pub struct ArchiveListItem {
  pub id: i64,
  pub slug: String,
  pub hash: String,
  pub title: String,
  pub pages: i16,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub cover: Option<ImageDimensions>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub artists: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub circles: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub magazines: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub publishers: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub events: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub parodies: Vec<Taxonomy>,
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub tags: Vec<Taxonomy>,
}

#[derive(Serialize, Deserialize)]
pub struct ImageDimensions {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub width: Option<i16>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub height: Option<i16>,
}

#[derive(Serialize, Deserialize)]
pub struct Image {
  pub filename: String,
  pub page_number: i16,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub width: Option<i16>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub height: Option<i16>,
}

#[derive(Serialize)]
pub struct LibraryPage {
  pub archives: Vec<ArchiveListItem>,
  pub page: usize,
  pub limit: usize,
  pub total: i64,
}
