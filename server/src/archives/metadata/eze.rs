use super::ArchiveMetadata;
use crate::{archives, config::CONFIG, utils};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use funty::Fundamental;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
pub struct Source {
  site: String,
  gid: i64,
  token: String,
}

#[derive(Deserialize, Debug)]
pub struct Metadata {
  pub title: String,
  #[serde(default)]
  pub tags: Option<HashMap<String, Vec<String>>>,
  #[serde(default)]
  pub language: Option<String>,
  #[serde(default)]
  pub upload_date: Option<Vec<u32>>,
  #[serde(default)]
  pub source: Option<Source>,
}

pub fn add_metadata(info: Metadata) -> ArchiveMetadata {
  let mut archive = ArchiveMetadata {
    title: if CONFIG.metadata.parse_filename_title {
      utils::parse_filename(&info.title).0.unwrap_or(info.title)
    } else {
      info.title
    },
    thumbnail: Some(1),
    language: info.language,
    ..Default::default()
  };

  if let Some(date) = info.upload_date {
    if let (Some(year), Some(month), Some(day), Some(hour), Some(min), Some(sec)) = (
      date.first(),
      date.get(1),
      date.get(2),
      date.get(3),
      date.get(4),
      date.get(5),
    ) {
      if let (Some(date), Some(time)) = (
        NaiveDate::from_ymd_opt(year.as_i32(), *month, *day),
        NaiveTime::from_hms_milli_opt(*hour, *min, *sec, 0),
      ) {
        let date = NaiveDateTime::new(date, time);
        archive.released_at = Some(date);
      }
    }
  }

  if let Some(tags) = info.tags {
    archive.artists = tags
      .get("artist")
      .map(|value| value.iter().map(|s| utils::capitalize_words(s)).collect());
    archive.circles = tags
      .get("group")
      .map(|value| value.iter().map(|s| utils::capitalize_words(s)).collect());
    archive.parodies = tags
      .get("parody")
      .map(|value| value.iter().map(|s| utils::capitalize_words(s)).collect());

    let mut archive_tags = vec![];

    if let Some(tags) = tags.get("male") {
      tags
        .iter()
        .map(|tag| utils::capitalize_words(tag))
        .for_each(|tag| archive_tags.push((tag, "male".to_string())))
    }
    if let Some(tags) = tags.get("female") {
      tags
        .iter()
        .map(|tag| utils::capitalize_words(tag))
        .for_each(|tag| archive_tags.push((tag, "female".to_string())))
    }
    if let Some(tags) = tags.get("misc") {
      tags
        .iter()
        .map(|tag| utils::capitalize_words(tag))
        .for_each(|tag| archive_tags.push((tag, "misc".to_string())))
    }

    archive.tags = Some(archive_tags);
  }

  if let Some(source) = info.source {
    let url = if source.site == "e-hentai" || source.site == "exhentai" {
      Some(format!(
        "https://{}.org/g/{}/{}",
        source.site, source.gid, source.token
      ))
    } else {
      None
    };

    let source = archives::Source {
      name: utils::parse_source_name(&source.site),
      url,
    };

    archive.sources = Some(vec![source]);
  }

  archive
}
