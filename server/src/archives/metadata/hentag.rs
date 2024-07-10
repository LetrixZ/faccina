use super::ArchiveMetadata;
use crate::{archives, config::CONFIG, utils};
use chrono::DateTime;
use itertools::Itertools;
use serde::Deserialize;

#[derive(Deserialize, Debug, Clone)]
pub struct Metadata {
  pub title: String,
  #[serde(rename = "parodies", default)]
  pub parodies: Option<Vec<String>>,
  #[serde(rename = "circles", default)]
  pub circles: Option<Vec<String>>,
  #[serde(rename = "artists", default)]
  pub artists: Option<Vec<String>>,
  #[serde(rename = "maleTags", default)]
  pub male_tags: Option<Vec<String>>,
  #[serde(rename = "femaleTags", default)]
  pub female_tags: Option<Vec<String>>,
  #[serde(rename = "otherTags", default)]
  pub other_tags: Option<Vec<String>>,
  #[serde(default)]
  pub language: Option<String>,
  #[serde(rename = "publishedOn", default)]
  pub published: Option<i64>,
  #[serde(default)]
  pub locations: Option<Vec<String>>,
}

pub fn add_metadata(info: Metadata) -> ArchiveMetadata {
  let mut archive = ArchiveMetadata {
    title: if CONFIG.metadata.parse_filename_title {
      utils::parse_filename(&info.title).0.unwrap_or(info.title)
    } else {
      info.title
    },
    thumbnail: Some(1),
    language: info.language.map(|s| utils::capitalize_words(&s)),
    released_at: info
      .published
      .and_then(DateTime::from_timestamp_millis)
      .map(|datetime| datetime.naive_utc()),
    artists: info
      .artists
      .map(|value| value.iter().map(|s| utils::capitalize_words(s)).collect()),
    circles: info
      .circles
      .map(|value| value.iter().map(|s| utils::capitalize_words(s)).collect()),
    parodies: info
      .parodies
      .map(|value| value.iter().map(|s| utils::capitalize_words(s)).collect()),
    ..Default::default()
  };

  let mut archive_tags = vec![];

  if let Some(tags) = info.male_tags {
    tags
      .iter()
      .map(|tag| utils::capitalize_words(tag))
      .for_each(|tag| archive_tags.push((tag, "male".to_string())));
  }

  if let Some(tags) = info.female_tags {
    tags
      .iter()
      .map(|tag| utils::capitalize_words(tag))
      .for_each(|tag| archive_tags.push((tag, "female".to_string())));
  }

  if let Some(tags) = info.other_tags {
    tags
      .iter()
      .map(|tag| utils::capitalize_words(tag))
      .for_each(|tag| archive_tags.push((tag, "misc".to_string())));
  }

  archive.tags = Some(archive_tags);

  if let Some(sources) = info.locations.map(|locations| {
    locations
      .into_iter()
      .map(|url| archives::Source {
        name: utils::parse_source_name(&url),
        url: Some(url),
      })
      .collect_vec()
  }) {
    if !sources.is_empty() {
      archive.sources = Some(sources);
    }
  }

  archive
}
