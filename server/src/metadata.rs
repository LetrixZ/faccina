use crate::db::InsertArchive;
use slug::slugify;
use std::io::{Cursor, Read};
use tracing::error;
use zip::ZipArchive;

#[derive(serde::Deserialize)]
pub struct AnchiraMetadata {
  #[serde(rename = "Title")]
  pub title: String,
  #[serde(rename = "Source")]
  pub source: String,
  #[serde(rename = "URL", default)]
  pub url: Option<String>,
  #[serde(rename = "Artist")]
  pub artists: Vec<String>,
  #[serde(rename = "Circle")]
  pub circles: Vec<String>,
  #[serde(rename = "Magazine")]
  pub magazines: Vec<String>,
  #[serde(rename = "Parody")]
  pub parodies: Vec<String>,
  #[serde(rename = "Tags")]
  pub tags: Vec<String>,

  #[serde(rename = "Thumbnail")]
  pub thumb_index: i16,
}

pub fn add_metadata(zip: &mut ZipArchive<Cursor<Vec<u8>>>, archive: &mut InsertArchive) {
  if let Ok(mut info) = zip.by_name("info.yaml") {
    let mut buffer: Vec<u8> = vec![];

    if let Err(err) = info.read_to_end(&mut buffer) {
      error!(target: "metadata", "Error while reading 'info.yaml' file: {err}");
      return;
    }

    if let Ok(info) = serde_yaml::from_slice::<AnchiraMetadata>(&buffer) {
      archive.slug = slugify(&info.title);
      archive.title = info.title;
      archive.artists = info.artists;
      archive.circles = info.circles;
      archive.magazines = info.magazines;
      archive.parodies = info.parodies;
      archive.tags = info.tags;
      archive.thumbnail = info.thumb_index;

      if let Some(url) = info.url {
        archive.sources = vec![url, info.source];
      }
    }
  }
}
