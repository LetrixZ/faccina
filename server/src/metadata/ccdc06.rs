use super::{MultiIdField, MultiTextField};
use crate::{db, utils};
use serde::Deserialize;
use slug::slugify;
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

pub fn add_metadata(info: Metadata, archive: &mut db::UpsertArchiveData) -> anyhow::Result<()> {
  archive.title = Some(info.title);
  archive.slug = archive.title.as_ref().map(slugify);
  archive.description = info.description;
  archive.thumbnail = info.thumb_index.map(|index| index + 1);
  archive.released_at = utils::map_timestamp(info.released);

  archive.artists = info.artists.map(|field| field.to_vec());
  archive.circles = info.circles.map(|field| field.to_vec());
  archive.magazines = info.magazines.map(|field| field.to_vec());
  archive.events = info.events.map(|field| field.to_vec());
  archive.publishers = info.publishers.map(|field| field.to_vec());
  archive.parodies = info.parodies.map(|field| field.to_vec());
  archive.tags = info
    .tags
    .map(|tags| tags.into_iter().map(|tag| (tag, "".to_string())).collect());

  let mut sources: Vec<db::ArchiveSource> = vec![];

  if let Some(urls) = info.urls {
    for (name, url) in urls {
      sources.push(db::ArchiveSource {
        name: utils::parse_source_name(&name),
        url: Some(url),
      })
    }
  }

  if let Some(source_ids) = info.source_ids {
    for (name, id) in source_ids {
      sources.push(db::ArchiveSource {
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
      .map(|(i, file)| db::ArchiveImage {
        filename: file.to_string(),
        page_number: (i + 1) as i16,
        ..Default::default()
      })
      .collect()
  });

  Ok(())
}

fn parse_source_id(name: String, id: MultiIdField) -> Option<String> {
  match name.to_lowercase().as_str() {
    "anchira" => Some(format!("https://anchira.to/g/{id}")),
    "hentainexus" => Some(format!("https://hentainexus.com/view/{id}")),
    _ => None,
  }
}
