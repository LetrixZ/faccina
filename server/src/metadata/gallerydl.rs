use crate::{config::CONFIG, db, utils};
use chrono::NaiveDateTime;
use serde::Deserialize;
use slug::slugify;

#[derive(Deserialize)]
pub struct Metadata {
  pub title: String,
  #[serde(default)]
  pub language: Option<String>,
  #[serde(default)]
  pub date: Option<String>,
  #[serde(default)]
  pub tags: Option<Vec<String>>,
  #[serde(default)]
  pub category: Option<String>,
  #[serde(default)]
  pub gallery_id: Option<i64>,
  #[serde(default)]
  pub gallery_token: Option<String>,
}

pub fn add_metadata(info: Metadata, archive: &mut db::UpsertArchiveData) -> anyhow::Result<()> {
  archive.title = if CONFIG.metadata.parse_filename_title {
    utils::parse_filename(&info.title).0
  } else {
    Some(info.title)
  };
  archive.slug = archive.title.as_ref().map(slugify);
  archive.thumbnail = Some(1);
  archive.language = info.language.map(|s| utils::capitalize_words(&s));
  archive.released_at = info
    .date
    .and_then(|date| NaiveDateTime::parse_from_str(&date, "%Y-%m-%d %H:%M:%S").ok());

  if let Some(tags) = info.tags {
    let mut artists = vec![];
    let mut circles = vec![];
    let mut parodies = vec![];
    let mut archive_tags = vec![];

    for tag in tags {
      let mut split = tag.split(':');

      let namespace = split.next().unwrap();

      if let Some(tag) = split.next() {
        match namespace {
          "artist" => artists.push(utils::capitalize_words(tag)),
          "group" => circles.push(utils::capitalize_words(tag)),
          "parody" => parodies.push(utils::capitalize_words(tag)),
          "male" => archive_tags.push((utils::capitalize_words(tag), "male".to_string())),
          "female" => archive_tags.push((utils::capitalize_words(tag), "female".to_string())),
          "other" => archive_tags.push((utils::capitalize_words(tag), "misc".to_string())),
          _ => archive_tags.push((utils::capitalize_words(tag), namespace.to_string())),
        }
      } else {
        archive_tags.push((utils::capitalize_words(namespace), "misc".to_string()));
      }
    }

    if !artists.is_empty() {
      archive.artists = Some(artists);
    }

    if !circles.is_empty() {
      archive.circles = Some(circles);
    }

    if !parodies.is_empty() {
      archive.parodies = Some(parodies);
    }

    if !archive_tags.is_empty() {
      archive.tags = Some(archive_tags);
    }
  }

  if let Some(category) = info.category {
    let url = if category == "e-hentai" || category == "exhentai" {
      if let (Some(id), Some(token)) = (info.gallery_id, info.gallery_token) {
        Some(format!("https://exhentai.org/g/{}/{}", id, token))
      } else {
        None
      }
    } else {
      None
    };

    let source = db::ArchiveSource {
      name: utils::parse_source_name(&category),
      url,
    };

    archive.sources = Some(vec![source]);
  }

  Ok(())
}
