use super::{ArchiveMetadata, MultiIdField, MultiTextField};
use crate::{archives, utils};
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize)]
pub struct Metadata {
  #[serde(rename = "Title")]
  pub title: String,
  #[serde(rename = "Description", default)]
  pub description: Option<String>,
  #[serde(rename = "Artist", default)]
  pub artists: Option<MultiTextField>,
  #[serde(rename = "Circle", default)]
  pub circles: Option<MultiTextField>,
  #[serde(rename = "Magazine", default)]
  pub magazines: Option<MultiTextField>,
  #[serde(rename = "Event", default)]
  pub events: Option<MultiTextField>,
  #[serde(rename = "Publisher", default)]
  pub publishers: Option<MultiTextField>,
  #[serde(rename = "Parody", default)]
  pub parodies: Option<MultiTextField>,
  #[serde(rename = "Tags", default)]
  pub tags: Option<Vec<String>>,
  #[serde(rename = "URL", default)]
  pub urls: Option<HashMap<String, String>>,
  #[serde(rename = "Id", default)]
  pub source_ids: Option<HashMap<String, MultiIdField>>,
  #[serde(rename = "Released", default)]
  pub released: Option<i64>,
  #[serde(rename = "ThumbnailIndex", default)]
  pub thumb_index: Option<i16>,
  #[serde(rename = "Files", default)]
  pub files: Option<Vec<String>>,
}

pub fn add_metadata(info: Metadata) -> ArchiveMetadata {
  let mut archive = ArchiveMetadata {
    title: info.title,
    description: info.description,
    thumbnail: info.thumb_index.map(|index| index + 1),
    released_at: utils::map_timestamp(info.released),
    artists: info.artists.map(|field| field.to_vec()),
    circles: info.circles.map(|field| field.to_vec()),
    magazines: info.magazines.map(|field| field.to_vec()),
    events: info.events.map(|field| field.to_vec()),
    publishers: info.publishers.map(|field| field.to_vec()),
    parodies: info.parodies.map(|field| field.to_vec()),
    tags: info
      .tags
      .map(|tags| tags.into_iter().map(|tag| (tag, "".to_string())).collect()),
    ..Default::default()
  };

  let mut sources: Vec<archives::Source> = vec![];

  if let Some(urls) = info.urls {
    for (name, url) in urls {
      sources.push(archives::Source {
        name: utils::parse_source_name(&name),
        url: Some(url),
      })
    }
  }

  if let Some(source_ids) = info.source_ids {
    for (name, id) in source_ids {
      sources.push(archives::Source {
        name: utils::parse_source_name(&name),
        url: parse_source_id(name, id),
      })
    }
  }

  archive.sources = Some(sources);

  archive.images = info.files.map(|files| {
    files
      .iter()
      .enumerate()
      .map(|(i, file)| archives::Image {
        filename: file.to_string(),
        page_number: (i + 1) as i16,
        ..Default::default()
      })
      .collect()
  });

  archive
}

fn parse_source_id(name: String, id: MultiIdField) -> Option<String> {
  match name.to_lowercase().as_str() {
    "anchira" => Some(format!("https://anchira.to/g/{id}")),
    "hentainexus" => Some(format!("https://hentainexus.com/view/{id}")),
    _ => None,
  }
}
