use super::{ArchiveMetadata, MultiTextField};
use crate::{archives, config::CONFIG, utils};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct Metadata {
  #[serde(rename = "Title")]
  pub title: String,
  #[serde(rename = "Description", default)]
  pub description: Option<String>,
  #[serde(rename = "Source", default)]
  pub source: Option<String>,
  #[serde(rename = "URL", default)]
  pub url: Option<String>,
  #[serde(rename = "Artist", default)]
  pub artists: Option<MultiTextField>,
  #[serde(rename = "Groups", alias = "Circle", default)]
  pub groups: Option<MultiTextField>,
  #[serde(rename = "Magazine", default)]
  pub magazines: Option<MultiTextField>,
  #[serde(rename = "Publisher", default)]
  pub publishers: Option<MultiTextField>,
  #[serde(rename = "Parody", default)]
  pub parodies: Option<MultiTextField>,
  #[serde(rename = "Tags", default)]
  pub tags: Option<Vec<String>>,
  #[serde(rename = "Thumbnail", default)]
  pub thumb_index: Option<i16>,
  #[serde(rename = "Released", default)]
  pub released: Option<i64>,
}

pub fn add_metadata(info: Metadata) -> ArchiveMetadata {
  let mut archive = ArchiveMetadata {
    title: if CONFIG.metadata.parse_filename_title {
      utils::parse_filename(&info.title).0.unwrap_or(info.title)
    } else {
      info.title
    },
    description: info.description,
    thumbnail: info.thumb_index.map(|index| index + 1),
    released_at: utils::map_timestamp(info.released),
    artists: info.artists.map(|field| field.to_vec()),
    circles: info.groups.map(|field| field.to_vec()),
    magazines: info.magazines.map(|field| field.to_vec()),
    publishers: info.publishers.map(|field| field.to_vec()),
    parodies: info.parodies.map(|field| field.to_vec()),
    tags: info.tags.map(|tags| {
      tags
        .into_iter()
        .map(|tag| (utils::capitalize_words(&tag), "".to_string()))
        .collect()
    }),
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
