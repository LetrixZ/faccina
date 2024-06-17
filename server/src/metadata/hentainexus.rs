use crate::{db, utils};
use chrono::DateTime;
use itertools::Itertools;
use serde::Deserialize;
use serde_inline_default::serde_inline_default;
use std::collections::HashMap;

#[derive(Deserialize)]
#[serde(untagged)]
enum MultiField {
  Single(String),
  Many(Vec<String>),
  Map(HashMap<usize, String>),
}

#[serde_inline_default]
#[derive(serde::Deserialize)]
struct Metadata {
  #[serde(rename = "Title")]
  pub title: String,
  #[serde(rename = "Description", default)]
  pub description: Option<String>,
  #[serde(rename = "Source", default)]
  pub source: Option<String>,
  #[serde(rename = "URL", default)]
  pub url: Option<String>,
  #[serde(rename = "Artist", default)]
  pub artists: Option<MultiField>,
  #[serde(rename = "Circle", default)]
  pub circles: Option<MultiField>,
  #[serde(rename = "Magazine", default)]
  pub magazines: Option<MultiField>,
  #[serde(rename = "Publisher", default)]
  pub publishers: Option<MultiField>,
  #[serde(rename = "Parody", default)]
  pub parodies: Option<MultiField>,
  #[serde(rename = "Tags")]
  pub tags: Vec<String>,
  #[serde(rename = "Thumbnail")]
  pub thumb_index: Option<i16>,
  #[serde(rename = "Released", default)]
  pub released: Option<i64>,
}

pub fn add_metadata(yaml: &str, archive: &mut db::InsertArchive) -> anyhow::Result<()> {
  let info = serde_yaml::from_str::<Metadata>(yaml)?;
  archive.title = info.title;
  archive.description = info.description;
  archive.tags = info
    .tags
    .into_iter()
    .map(|t| (utils::capitalize_words(&t), None))
    .collect();

  if let Some(data) = info.artists {
    archive.artists = match data {
      MultiField::Single(str) => str.split(",").map(|s| s.trim().to_string()).collect_vec(),
      MultiField::Many(vec) => vec,
      MultiField::Map(map) => map.values().map(|s| s.to_string()).collect_vec(),
    };
  }

  if let Some(data) = info.circles {
    archive.circles = match data {
      MultiField::Single(str) => str.split(",").map(|s| s.trim().to_string()).collect_vec(),
      MultiField::Many(vec) => vec,
      MultiField::Map(map) => map.values().map(|s| s.to_string()).collect_vec(),
    };
  }

  if let Some(data) = info.magazines {
    archive.magazines = match data {
      MultiField::Single(str) => str.split(",").map(|s| s.trim().to_string()).collect_vec(),
      MultiField::Many(vec) => vec,
      MultiField::Map(map) => map.values().map(|s| s.to_string()).collect_vec(),
    };
  }

  if let Some(data) = info.publishers {
    archive.publishers = match data {
      MultiField::Single(str) => str.split(",").map(|s| s.trim().to_string()).collect_vec(),
      MultiField::Many(vec) => vec,
      MultiField::Map(map) => map.values().map(|s| s.to_string()).collect_vec(),
    };
  }

  if let Some(data) = info.parodies {
    archive.parodies = match data {
      MultiField::Single(str) => str.split(",").map(|s| s.trim().to_string()).collect_vec(),
      MultiField::Many(vec) => vec,
      MultiField::Map(map) => map.values().map(|s| s.to_string()).collect_vec(),
    };
  }

  archive.thumbnail = info.thumb_index.map(|thumb| thumb + 1).unwrap_or(1);

  let mut sources: Vec<db::Source> = vec![];

  if let Some(url) = info.url {
    sources.push(db::Source {
      name: utils::parse_source_name(&url),
      url: Some(url),
    });
  }

  if let Some(url) = info.source {
    sources.push(db::Source {
      name: utils::parse_source_name(&url),
      url: Some(url),
    });
  }

  if let Some(released) = info.released {
    archive.released_at = Some(DateTime::from_timestamp(released, 0).unwrap().naive_utc());
  }

  archive.sources = sources;

  Ok(())
}
