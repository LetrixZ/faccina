use crate::{config::CONFIG, db, utils};
use chrono::DateTime;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct Metadata {
  pub title: String,
  #[serde(rename = "parodies", default)]
  pub parodies: Vec<String>,
  #[serde(rename = "circles", default)]
  pub circles: Vec<String>,
  #[serde(rename = "artists", default)]
  pub artists: Vec<String>,
  #[serde(rename = "maleTags", default)]
  pub male_tags: Vec<String>,
  #[serde(rename = "femaleTags", default)]
  pub female_tags: Vec<String>,
  #[serde(rename = "otherTags", default)]
  pub other_tags: Vec<String>,
  #[serde(default)]
  pub language: Option<String>,
  #[serde(rename = "createdAt")]
  pub created_at: i64,
  #[serde(default)]
  pub locations: Option<Vec<String>>,
}

pub fn add_metadata(json: &str, archive: &mut db::InsertArchive) -> anyhow::Result<()> {
  let info = serde_json::from_str::<Metadata>(json)?;

  if CONFIG.metadata.parse_filename_title {
    archive.title = utils::parse_filename(&info.title).0;
  } else {
    archive.title = info.title.to_string();
  }

  archive.thumbnail = 1;
  archive.released_at = Some(
    DateTime::from_timestamp_millis(info.created_at)
      .unwrap()
      .naive_utc(),
  );

  archive.artists = info
    .artists
    .iter()
    .map(|s| utils::capitalize_words(s))
    .collect();
  archive.circles = info
    .circles
    .iter()
    .map(|s| utils::capitalize_words(s))
    .collect();
  archive.parodies = info
    .parodies
    .iter()
    .map(|s| utils::capitalize_words(s))
    .collect();

  let mut tags = vec![];

  info
    .male_tags
    .iter()
    .map(|s| utils::capitalize_words(s))
    .for_each(|s| tags.push((s, Some("male".to_string()))));

  info
    .female_tags
    .iter()
    .map(|s| utils::capitalize_words(s))
    .for_each(|s| tags.push((s, Some("female".to_string()))));

  info
    .other_tags
    .iter()
    .map(|s| utils::capitalize_words(s))
    .for_each(|s| tags.push((s, Some("misc".to_string()))));

  archive.tags = tags;

  archive.language = info.language.map(|s| utils::capitalize_words(&s));

  if let Some(locations) = info.locations {
    archive.sources = locations
      .iter()
      .map(|url| db::Source {
        name: utils::parse_source_name(url),
        url: Some(url.to_string()),
      })
      .collect();
  }

  Ok(())
}
