use crate::{db, utils};
use serde::Deserialize;
use slug::slugify;

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

pub fn add_metadata(info: Metadata, archive: &mut db::UpsertArchiveData) -> anyhow::Result<()> {
  archive.title = Some(info.title);
  archive.slug = archive.title.as_ref().map(slugify);
  archive.description = info.description;
  archive.thumbnail = info.thumbnail;
  archive.released_at = utils::map_timestamp(info.released);

  archive.artists = info.artists;
  archive.circles = info.circles;
  archive.magazines = info.magazines;
  archive.events = info.events;
  archive.publishers = info.publishers;
  archive.parodies = info.parodies;
  archive.tags = info
    .tags
    .map(|tags| tags.into_iter().map(|tag| (tag, "".to_string())).collect());

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
