use crate::db;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use serde_json::Value;

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
  pub cover: Option<ImageDimensions>,
  pub thumbnail: i16,
  pub images: Vec<Image>,
  pub created_at: NaiveDateTime,
  pub released_at: NaiveDateTime,
  pub artists: Vec<Taxonomy>,
  pub circles: Vec<Taxonomy>,
  pub magazines: Vec<Taxonomy>,
  pub publishers: Vec<Taxonomy>,
  pub parodies: Vec<Taxonomy>,
  pub tags: Vec<Tag>,
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
  pub namespace: Option<String>,
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

impl From<db::Source> for Source {
  fn from(item: db::Source) -> Self {
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
  pub cover: Option<ImageDimensions>,
  pub artists: Vec<Taxonomy>,
  pub circles: Vec<Taxonomy>,
  pub magazines: Vec<Taxonomy>,
  pub publishers: Vec<Taxonomy>,
  pub parodies: Vec<Taxonomy>,
  pub tags: Vec<Taxonomy>,
}

#[derive(Serialize, Deserialize)]
pub struct ImageDimensions {
  pub width: Option<i16>,
  pub height: Option<i16>,
}

#[derive(Serialize, Deserialize)]
pub struct Image {
  pub page_number: i16,
  pub width: Option<i16>,
  pub height: Option<i16>,
}

#[derive(Serialize)]
pub struct LibraryPage {
  pub archives: Vec<ArchiveListItem>,
  pub page: usize,
  pub limit: usize,
  pub total: i64,
  pub errors: Value,
}
