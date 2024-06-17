use crate::{db, utils};
use chrono::DateTime;

#[derive(serde::Deserialize)]
struct Metadata {
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
  #[serde(rename = "Publisher", default)]
  pub publishers: Option<Vec<String>>,
  #[serde(rename = "Parody", default)]
  pub parodies: Option<Vec<String>>,
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
  archive.tags = info.tags.into_iter().map(|t| (t, None)).collect();
  archive.artists = info.artists.unwrap_or_default();
  archive.circles = info.circles.unwrap_or_default();
  archive.magazines = info.magazines.unwrap_or_default();
  archive.publishers = info.publishers.unwrap_or_default();
  archive.parodies = info.parodies.unwrap_or_default();
  archive.thumbnail = info.thumb_index.unwrap_or(1);

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
