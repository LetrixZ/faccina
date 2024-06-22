use crate::{db, utils};
use chrono::DateTime;
use serde::Deserialize;
use std::{collections::HashMap, fmt::Display};

#[derive(Deserialize)]
#[serde(untagged)]
enum MultiField {
  Single(String),
  Many(Vec<String>),
}

#[derive(Deserialize)]
#[serde(untagged)]
enum MultiIdField {
  Integer(i64),
  String(String),
}

impl Display for MultiIdField {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      MultiIdField::Integer(id) => write!(f, "{id}"),
      MultiIdField::String(id) => write!(f, "{id}"),
    }
  }
}

#[derive(Deserialize)]
struct Metadata {
  #[serde(rename = "Title")]
  pub title: String,
  #[serde(rename = "Description", default)]
  pub description: Option<String>,
  #[serde(rename = "Artist", default)]
  pub artists: Option<MultiField>,
  #[serde(rename = "Circle", default)]
  pub circles: Option<MultiField>,
  #[serde(rename = "Magazine", default)]
  pub magazines: Option<MultiField>,
  #[serde(rename = "Event", default)]
  pub events: Option<MultiField>,
  #[serde(rename = "Publisher", default)]
  pub publishers: Option<MultiField>,
  #[serde(rename = "Parody", default)]
  pub parodies: Option<MultiField>,
  #[serde(rename = "Tags", default)]
  pub tags: Option<Vec<String>>,
  #[serde(rename = "URL", default)]
  pub urls: Option<HashMap<String, String>>,
  #[serde(rename = "Id", default)]
  pub source_ids: Option<HashMap<String, MultiIdField>>,
  #[serde(rename = "Released", default)]
  pub released: Option<i64>,
  #[serde(rename = "ThumbnailIndex")]
  pub thumb_index: Option<i16>,
}

pub fn add_metadata(yaml: &str, archive: &mut db::InsertArchive) -> anyhow::Result<()> {
  let info = serde_yaml::from_str::<Metadata>(yaml)?;
  archive.title = info.title;
  archive.description = info.description;

  if let Some(artists) = info.artists {
    match artists {
      MultiField::Single(artists) => {
        archive.artists = artists.split(",").map(|s| s.trim().to_string()).collect()
      }
      MultiField::Many(artists) => archive.artists = artists,
    }
  }

  if let Some(circles) = info.circles {
    match circles {
      MultiField::Single(circles) => {
        archive.circles = circles.split(",").map(|s| s.trim().to_string()).collect()
      }
      MultiField::Many(circles) => archive.circles = circles,
    }
  }

  if let Some(magazines) = info.magazines {
    match magazines {
      MultiField::Single(magazines) => {
        archive.magazines = magazines.split(",").map(|s| s.trim().to_string()).collect()
      }
      MultiField::Many(magazines) => archive.magazines = magazines,
    }
  }

  if let Some(events) = info.events {
    match events {
      MultiField::Single(events) => {
        archive.events = events.split(",").map(|s| s.trim().to_string()).collect()
      }
      MultiField::Many(events) => archive.events = events,
    }
  }

  if let Some(publishers) = info.publishers {
    match publishers {
      MultiField::Single(publishers) => {
        archive.publishers = publishers
          .split(",")
          .map(|s| s.trim().to_string())
          .collect()
      }
      MultiField::Many(publishers) => archive.publishers = publishers,
    }
  }

  if let Some(parodies) = info.parodies {
    match parodies {
      MultiField::Single(parodies) => {
        archive.parodies = parodies.split(",").map(|s| s.trim().to_string()).collect()
      }
      MultiField::Many(parodies) => archive.parodies = parodies,
    }
  }

  if let Some(tags) = info.tags {
    archive.tags = tags.into_iter().map(|t| (t, None)).collect();
  }

  archive.thumbnail = info.thumb_index.map(|t| t + 1).unwrap_or(1);

  if let Some(released) = info.released {
    archive.released_at = Some(DateTime::from_timestamp(released, 0).unwrap().naive_utc());
  }

  let mut sources: Vec<db::Source> = vec![];

  if let Some(urls) = info.urls {
    for (name, url) in urls {
      sources.push(db::Source {
        name: utils::parse_source_name(&name),
        url: Some(url),
      })
    }
  }

  if let Some(source_ids) = info.source_ids {
    for (name, id) in source_ids {
      sources.push(db::Source {
        name: utils::parse_source_name(&name),
        url: parse_source_id(name, id),
      })
    }
  }

  archive.sources = sources;

  Ok(())
}

fn parse_source_id(name: String, id: MultiIdField) -> Option<String> {
  match name.to_lowercase().as_str() {
    "anchira" => Some(format!("https://anchira.to/g/{id}")),
    "hentainexus" => Some(format!("https://hentainexus.com/view/{id}")),
    _ => None,
  }
}
