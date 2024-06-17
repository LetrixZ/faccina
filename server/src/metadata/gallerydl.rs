use crate::{config::CONFIG, db, utils};
use anyhow::anyhow;
use chrono::NaiveDateTime;
use serde::Deserialize;

#[derive(Deserialize)]
struct Metadata {
  pub title: String,
  pub language: String,
  pub date: String,
  pub tags: Vec<String>,
  #[serde(default)]
  pub gallery_id: Option<i64>,
  #[serde(default)]
  pub gallery_token: Option<String>,
}

pub fn add_metadata(json: &str, archive: &mut db::InsertArchive) -> anyhow::Result<()> {
  let info = serde_json::from_str::<Metadata>(json)?;

  if CONFIG.metadata.parse_filename_title {
    archive.title = utils::parse_filename(&info.title).0;
  } else {
    archive.title = info.title.to_string();
  }

  archive.thumbnail = 1;
  archive.language = Some(utils::capitalize_words(&info.language));

  let mut translated = None;
  let mut artists = vec![];
  let mut circles = vec![];
  let mut parodies = vec![];
  let mut tags = vec![];

  for tag in info.tags {
    let mut split = tag.split(":");

    let namespace = split.next().unwrap();

    if let Some(tag) = split.next() {
      match namespace {
        "artist" => artists.push(utils::capitalize_words(tag)),
        "group" => circles.push(utils::capitalize_words(tag)),
        "parody" => parodies.push(utils::capitalize_words(tag)),
        "male" => tags.push((utils::capitalize_words(tag), Some("male".to_string()))),
        "female" => tags.push((utils::capitalize_words(tag), Some("female".to_string()))),
        "other" => tags.push((utils::capitalize_words(tag), Some("misc".to_string()))),
        "language" => {
          if tag == "translated" {
            translated = Some(true)
          }
        }
        _ => tags.push((utils::capitalize_words(tag), Some("misc".to_string()))),
      }
    } else {
      tags.push((utils::capitalize_words(namespace), Some("misc".to_string())));
    }
  }

  archive.artists = artists;
  archive.circles = circles;
  archive.parodies = parodies;
  archive.tags = tags;
  archive.translated = translated;
  archive.released_at = Some(
    NaiveDateTime::parse_from_str(&info.date, "%Y-%m-%d %H:%M:%S")
      .map_err(|err| anyhow!("Couldn't parse date the date '{}': {err}", info.date))?,
  );

  if let (Some(id), Some(token)) = (info.gallery_id, info.gallery_token) {
    let url = format!("https://exhentai.org/g/{}/{}", id, token);

    archive.sources = vec![db::Source {
      name: utils::parse_source_name(&url),
      url: Some(url),
    }];
  }
  Ok(())
}
