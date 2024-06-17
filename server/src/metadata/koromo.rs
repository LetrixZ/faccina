use crate::{config::CONFIG, db, utils};
use chrono::DateTime;
use itertools::Itertools;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(untagged)]
enum MultiField {
  Single(String),
  Many(Vec<String>),
}

#[derive(Deserialize)]
struct Metadata {
  #[serde(rename = "Title")]
  pub title: String,
  #[serde(rename = "Description")]
  pub description: Option<String>,
  #[serde(rename = "Source", default)]
  pub source: Option<String>,
  #[serde(rename = "URL", default)]
  pub url: Option<String>,
  #[serde(rename = "Artist")]
  pub artists: Option<MultiField>,
  #[serde(rename = "Circle")]
  pub circles: Option<MultiField>,
  #[serde(rename = "Magazine")]
  pub magazines: Option<MultiField>,
  #[serde(rename = "Publisher")]
  pub publishers: Option<MultiField>,
  #[serde(rename = "Parody")]
  pub parodies: Option<MultiField>,
  #[serde(rename = "Tags")]
  pub tags: Vec<String>,
  #[serde(rename = "Thumbnail")]
  pub thumb_index: Option<i16>,
  #[serde(rename = "Released", default)]
  pub released: Option<i64>,
}

pub fn add_metadata(json: &str, archive: &mut db::InsertArchive) -> anyhow::Result<()> {
  let info = serde_json::from_str::<Metadata>(json)?;

  if CONFIG.metadata.parse_filename_title {
    archive.title = utils::parse_filename(&info.title).0;
  } else {
    archive.title = info.title.to_string();
  }

  archive.description = info.description;
  archive.tags = info
    .tags
    .iter()
    .map(|t| (utils::capitalize_words(t), None))
    .collect();

  if let Some(data) = info.artists {
    archive.artists = match data {
      MultiField::Single(str) => str.split(",").map(|s| s.trim().to_string()).collect_vec(),
      MultiField::Many(vec) => vec,
    };
  }

  if let Some(data) = info.circles {
    archive.circles = match data {
      MultiField::Single(str) => str.split(",").map(|s| s.trim().to_string()).collect_vec(),
      MultiField::Many(vec) => vec,
    };
  }

  if let Some(data) = info.magazines {
    archive.magazines = match data {
      MultiField::Single(str) => str.split(",").map(|s| s.trim().to_string()).collect_vec(),
      MultiField::Many(vec) => vec,
    };
  }

  if let Some(data) = info.publishers {
    archive.publishers = match data {
      MultiField::Single(str) => str.split(",").map(|s| s.trim().to_string()).collect_vec(),
      MultiField::Many(vec) => vec,
    };
  }

  if let Some(data) = info.parodies {
    archive.parodies = match data {
      MultiField::Single(str) => str.split(",").map(|s| s.trim().to_string()).collect_vec(),
      MultiField::Many(vec) => vec,
    };
  }

  archive.thumbnail = info.thumb_index.map(|thumb| thumb + 1).unwrap_or(1);

  if let Some(released) = info.released {
    archive.released_at = Some(DateTime::from_timestamp(released, 0).unwrap().naive_utc());
  }

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

  archive.sources = sources;

  Ok(())
}
