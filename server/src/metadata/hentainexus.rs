use super::MultiTextField;
use crate::{db, utils};
use serde::Deserialize;
use slug::slugify;

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
  #[serde(rename = "Thumbnail", default)]
  pub thumb_index: Option<i16>,
  #[serde(rename = "Released", default)]
  pub released: Option<i64>,
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
  archive.tags = info.tags.map(|tags| {
    tags
      .into_iter()
      .map(|tag| (utils::capitalize_words(&tag), "".to_string()))
      .collect()
  });

  let mut sources: Vec<db::ArchiveSource> = vec![];

  if let Some(url) = info.url {
    sources.push(db::ArchiveSource {
      name: utils::parse_source_name(&url),
      url: Some(url),
    });
  }

  if let Some(url) = info.source {
    sources.push(db::ArchiveSource {
      name: utils::parse_source_name(&url),
      url: Some(url),
    });
  }

  if !sources.is_empty() {
    archive.sources = Some(sources);
  }

  Ok(())
}
