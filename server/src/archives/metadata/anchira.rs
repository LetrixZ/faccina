use super::ArchiveMetadata;
use crate::{archives, utils};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct Metadata {
  #[serde(rename = "Title")]
  pub title: String,
  #[serde(rename = "Description")]
  pub description: Option<String>,
  #[serde(rename = "Source", default)]
  pub source: Option<String>,
  #[serde(rename = "URL", default)]
  pub url: Option<String>,
  #[serde(rename = "Artist", default)]
  pub artists: Option<Vec<String>>,
  #[serde(rename = "Circle", default)]
  pub circles: Option<Vec<String>>,
  #[serde(rename = "Magazine", default)]
  pub magazines: Option<Vec<String>>,
  #[serde(rename = "Event", default)]
  pub events: Option<Vec<String>>,
  #[serde(rename = "Publisher", default)]
  pub publishers: Option<Vec<String>>,
  #[serde(rename = "Parody", default)]
  pub parodies: Option<Vec<String>>,
  #[serde(rename = "Tags", default)]
  pub tags: Option<Vec<String>>,
  #[serde(rename = "Thumbnail", default)]
  pub thumbnail: Option<i16>,
  #[serde(rename = "Released", default)]
  pub released: Option<i64>,
}

pub fn add_metadata(info: Metadata) -> ArchiveMetadata {
  let mut archive = ArchiveMetadata {
    title: info.title,
    description: info.description,
    thumbnail: info.thumbnail,
    released_at: utils::map_timestamp(info.released),
    artists: info.artists,
    circles: info.circles,
    magazines: info.magazines,
    events: info.events,
    publishers: info.publishers,
    parodies: info.parodies,
    tags: info
      .tags
      .map(|tags| tags.into_iter().map(|tag| (tag, "".to_string())).collect()),
    ..Default::default()
  };

  let mut sources: Vec<archives::Source> = vec![];

  if let Some(url) = info.url {
    sources.push(archives::Source {
      name: utils::parse_source_name(&url),
      url: Some(url),
    });
  }

  if let Some(url) = info.source {
    sources.push(archives::Source {
      name: utils::parse_source_name(&url),
      url: Some(url),
    });
  }

  if !sources.is_empty() {
    archive.sources = Some(sources);
  }

  archive
}
