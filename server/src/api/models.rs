use crate::query;
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

impl From<query::Archive> for Archive {
  fn from(
    query::Archive {
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
    }: query::Archive,
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
pub struct ArchiveData {
  pub id: i64,
  pub title: String,
  pub slug: String,
  pub description: Option<String>,
  pub hash: String,
  pub pages: i16,
  pub size: i64,
  pub thumbnail: i16,
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
  #[serde(skip_serializing_if = "<[_]>::is_empty")]
  pub images: Vec<Image>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub cover: Option<ImageDimensions>,
}

impl From<query::ArchiveRelations> for ArchiveData {
  fn from(
    query::ArchiveRelations {
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
    }: query::ArchiveRelations,
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Taxonomy {
  pub slug: String,
  pub name: String,
}

impl From<query::Taxonomy> for Taxonomy {
  fn from(item: query::Taxonomy) -> Self {
    Taxonomy {
      slug: item.slug,
      name: item.name,
    }
  }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Tag {
  pub slug: String,
  pub name: String,
  pub namespace: String,
}

impl From<query::Tag> for Tag {
  fn from(item: query::Tag) -> Self {
    Tag {
      slug: item.slug,
      name: item.name,
      namespace: item.namespace,
    }
  }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Source {
  pub name: String,
  pub url: Option<String>,
}

impl From<query::ArchiveSource> for Source {
  fn from(item: query::ArchiveSource) -> Self {
    Source {
      name: item.name,
      url: item.url,
    }
  }
}

#[derive(Serialize)]
pub struct ArchiveListItem {
  pub id: i64,
  pub title: String,
  pub slug: String,
  pub hash: String,
  pub thumbnail: i16,
  pub pages: Option<i16>,
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ImageDimensions {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub width: Option<i16>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub height: Option<i16>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Image {
  pub filename: String,
  pub page_number: i16,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub width: Option<i16>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub height: Option<i16>,
}

#[derive(Serialize)]
pub struct LibraryPage<T> {
  pub archives: Vec<T>,
  pub page: usize,
  pub limit: usize,
  pub total: i64,
}
