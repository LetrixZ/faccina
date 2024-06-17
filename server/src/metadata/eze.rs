use crate::{config::CONFIG, db, utils};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use funty::Fundamental;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
struct Source {
  site: String,
  gid: i64,
  token: String,
}

#[derive(Deserialize, Debug)]
struct Metadata {
  pub title: String,
  pub tags: HashMap<String, Vec<String>>,
  #[serde(default)]
  pub language: Option<String>,
  #[serde(default)]
  pub translated: Option<bool>,
  #[serde(default)]
  pub source: Option<Source>,
  #[serde(default)]
  pub upload_date: Option<Vec<u32>>,
}

pub fn add_metadata(json: &str, archive: &mut db::InsertArchive) -> anyhow::Result<()> {
  let info = serde_json::from_str::<Metadata>(json)?;

  if CONFIG.metadata.parse_filename_title {
    archive.title = utils::parse_filename(&info.title).0;
  } else {
    archive.title = info.title;
  }

  archive.thumbnail = 1;

  if let Some(language) = info.tags.get("language") {
    archive.language = language.first().map(|s| utils::capitalize_words(s));
    archive.translated = language.get(1).map(|s| s.eq("translated"));
  } else {
    archive.language = info.language.map(|s| utils::capitalize_words(&s));
    archive.translated = info.translated;
  }

  if let Some(artist) = info.tags.get("artist") {
    archive.artists = artist.iter().map(|s| utils::capitalize_words(s)).collect();
  }

  if let Some(group) = info.tags.get("group") {
    archive.circles = group.iter().map(|s| utils::capitalize_words(s)).collect();
  }

  if let Some(parody) = info.tags.get("parody") {
    archive.parodies = parody.iter().map(|s| utils::capitalize_words(s)).collect();
  }

  let mut tags: Vec<(String, Option<String>)> = vec![];

  if let Some(male) = info.tags.get("male") {
    male
      .iter()
      .map(|s| utils::capitalize_words(s))
      .for_each(|s| tags.push((s, Some("male".to_string()))));
  }

  if let Some(female) = info.tags.get("female") {
    female
      .iter()
      .map(|s| utils::capitalize_words(s))
      .for_each(|s| tags.push((s, Some("female".to_string()))));
  }

  if let Some(misc) = info.tags.get("misc") {
    misc
      .iter()
      .map(|s| utils::capitalize_words(s))
      .for_each(|s| tags.push((s, Some("misc".to_string()))));
  }

  archive.tags = tags;

  if let Some(source) = info.source {
    let url = format!("https://{}/g/{}/{}", source.site, source.gid, source.token);

    archive.sources = vec![db::Source {
      name: utils::parse_source_name(&url),
      url: Some(url),
    }];
  }

  if let Some(date) = info.upload_date {
    if date.len() == 6 {
      let year = date.first().unwrap();
      let month = date.get(1).unwrap();
      let day = date.get(2).unwrap();
      let hour = date.get(3).unwrap();
      let min = date.get(4).unwrap();
      let sec = date.get(5).unwrap();

      let d = NaiveDate::from_ymd_opt(year.as_i32(), *month, *day).unwrap();
      let t = NaiveTime::from_hms_milli_opt(*hour, *min, *sec, 0).unwrap();
      let date = NaiveDateTime::new(d, t);
      archive.released_at = Some(date);
    }
  }

  Ok(())
}
