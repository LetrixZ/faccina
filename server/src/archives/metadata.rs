mod anchira;
mod ccdc06;
mod eze;
mod gallerydl;
pub mod hentag;
mod hentainexus;
mod koromo;

use crate::{archives, utils::ToStringExt};
use chrono::NaiveDateTime;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use serde_json::Value as JsonValue;
use serde_yaml::Value as YamlValue;
use std::{collections::HashMap, fmt::Display, fs, io::Read, path::Path};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MetadataError {
  #[error("Couldn't find external metadata file")]
  ExternalNotFound,
  #[error("Couldn't find embbeded metadata in ZIP file")]
  EmbeddedNotFound,
  #[error("Failed to get the metadata format")]
  MetadataTypeError,
  #[error("Failed to deserialize YAML")]
  YamlDeserializationError(#[from] serde_yaml::Error),
  #[error("Failed to deserialize JSON")]
  JsonDeserializationError(#[from] serde_json::Error),
  #[error("Failed to read metadata file from ZIP")]
  ReadFileError,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum MultiTextField {
  Single(String),
  Many(Vec<String>),
  Map(HashMap<usize, String>),
}

impl MultiTextField {
  fn to_vec(&self) -> Vec<String> {
    match self {
      MultiTextField::Single(value) => value.split(',').map(|s| s.trim().to_string()).collect(),
      MultiTextField::Many(value) => value.to_vec(),
      MultiTextField::Map(value) => value.values().map(|s| s.to_string()).collect(),
    }
  }
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

enum MetadataFormat {
  Anchira(String),
  HentaiNexus(String),
  CCDC06(String),
  HenTag(String),
  Eze(String),
  Koromo(String),
  GalleryDL(String),
}

#[derive(Default, Debug)]
pub struct ArchiveMetadata {
  pub title: String,
  pub description: Option<String>,
  pub thumbnail: Option<i16>,
  pub language: Option<String>,
  pub released_at: Option<NaiveDateTime>,
  pub artists: Option<Vec<String>>,
  pub circles: Option<Vec<String>>,
  pub magazines: Option<Vec<String>>,
  pub events: Option<Vec<String>>,
  pub publishers: Option<Vec<String>>,
  pub parodies: Option<Vec<String>>,
  pub tags: Option<Vec<(String, String)>>,
  pub sources: Option<Vec<archives::Source>>,
  pub images: Option<Vec<archives::Image>>,
}

fn handle_metadata_format(format: MetadataFormat) -> Result<ArchiveMetadata, MetadataError> {
  match format {
    MetadataFormat::Anchira(yaml) => {
      let metadata = serde_yaml::from_str(&yaml)?;
      Ok(anchira::add_metadata(metadata))
    }
    MetadataFormat::HentaiNexus(yaml) => {
      let metadata = serde_yaml::from_str(&yaml)?;
      Ok(hentainexus::add_metadata(metadata))
    }
    MetadataFormat::CCDC06(yaml) => {
      let metadata = serde_yaml::from_str(&yaml)?;
      Ok(ccdc06::add_metadata(metadata))
    }
    MetadataFormat::HenTag(json) => {
      let metadata = serde_json::from_str(&json)?;
      Ok(hentag::add_metadata(metadata))
    }
    MetadataFormat::Eze(json) => {
      let metadata = serde_json::from_str(&json)?;
      Ok(eze::add_metadata(metadata))
    }
    MetadataFormat::Koromo(json) => {
      let metadata = serde_json::from_str(&json)?;
      Ok(koromo::add_metadata(metadata))
    }
    MetadataFormat::GalleryDL(json) => {
      let metadata = serde_json::from_str(&json)?;
      Ok(gallerydl::add_metadata(metadata))
    }
  }
}

fn get_yaml_type(yaml: String) -> Result<MetadataFormat, MetadataError> {
  if yaml.contains("DownloadSource") || yaml.contains("ThumbnailIndex") || yaml.contains("Files") {
    return Ok(MetadataFormat::CCDC06(yaml));
  }

  if let Ok(value) = serde_yaml::from_str::<YamlValue>(&yaml) {
    if let Some(source) = value.get("Source") {
      if let Some(source) = source.as_str() {
        if source.contains("hentainexus.com") {
          return Ok(MetadataFormat::HentaiNexus(yaml));
        } else if source.contains("anchira.to") {
          return Ok(MetadataFormat::Anchira(yaml));
        }
      }
    }

    if let Some(artist) = value.get("Artist") {
      if artist.is_string() || artist.is_mapping() {
        return Ok(MetadataFormat::HentaiNexus(yaml));
      } else if artist.is_sequence() {
        return Ok(MetadataFormat::Anchira(yaml));
      }
    } else if let Some(circle) = value.get("Circle") {
      if circle.is_string() || circle.is_mapping() {
        return Ok(MetadataFormat::HentaiNexus(yaml));
      } else if circle.is_sequence() {
        return Ok(MetadataFormat::Anchira(yaml));
      }
    } else if let Some(parody) = value.get("Parody") {
      if parody.is_string() || parody.is_mapping() {
        return Ok(MetadataFormat::HentaiNexus(yaml));
      } else if parody.is_sequence() {
        return Ok(MetadataFormat::Anchira(yaml));
      }
    }
  }

  Err(MetadataError::MetadataTypeError)
}

fn get_json_type(json: String) -> Result<MetadataFormat, MetadataError> {
  static HENTAG_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"("coverImageUrl"|"maleTags"|"femaleTags")"#).unwrap());
  static EZE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"("group":|"artist":|"male":|"female":)\["#).unwrap());
  static EZE_SAD_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r#""gallery_info":\{"#).unwrap());
  static KOROMO_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"(("Tags":)\[)|("Artist":")"#).unwrap());
  static GALLERY_DL_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"("artist:.*"|"group:.*"|"male:.*"|"female:.*")"#).unwrap());

  if let Ok(value) = serde_json::from_str::<JsonValue>(&json) {
    let minified = serde_json::to_string(&value).expect("Failed to minify");

    if HENTAG_RE.is_match(&minified) {
      return Ok(MetadataFormat::HenTag(minified));
    } else if EZE_SAD_RE.is_match(&minified) {
      let value = serde_json::from_str::<JsonValue>(&minified).expect("Failed to deserialize");
      let value = value
        .get("gallery_info")
        .expect("'gallery_info' key not found");
      let minified = serde_json::to_string(&value).expect("Failed to minify");

      return Ok(MetadataFormat::Eze(minified));
    } else if EZE_RE.is_match(&minified) {
      return Ok(MetadataFormat::Eze(minified));
    } else if KOROMO_RE.is_match(&minified) {
      return Ok(MetadataFormat::Koromo(minified));
    } else if GALLERY_DL_RE.is_match(&minified) {
      return Ok(MetadataFormat::GalleryDL(minified));
    }
  }

  Err(MetadataError::MetadataTypeError)
}

pub fn get_metadata_from_path(path: &Path) -> Result<ArchiveMetadata, MetadataError> {
  static RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\.(cbz|zip)").unwrap());

  let yaml_path = RE.replace_all(&path.to_string(), ".yaml").to_string();
  let json_path = RE.replace_all(&path.to_string(), ".json").to_string();

  if let Ok(yaml) = fs::read_to_string(yaml_path) {
    handle_metadata_format(get_yaml_type(yaml)?)
  } else if let Ok(json) = fs::read_to_string(json_path) {
    handle_metadata_format(get_json_type(json)?)
  } else {
    Err(MetadataError::ExternalNotFound)
  }
}

pub fn get_metadata_from_zip(
  zip: &mut archives::ZipArchive,
) -> Result<ArchiveMetadata, MetadataError> {
  if let Ok(Ok(yaml)) = zip.by_name("info.yaml").map(|mut file| {
    let mut str = String::new();
    match file.read_to_string(&mut str) {
      Ok(_) => Ok(str),
      Err(_) => Err(MetadataError::ReadFileError),
    }
  }) {
    handle_metadata_format(get_yaml_type(yaml)?)
  } else if let Ok(Ok(json)) = zip.by_name("info.json").map(|mut file| {
    let mut str = String::new();
    match file.read_to_string(&mut str) {
      Ok(_) => Ok(str),
      Err(_) => Err(MetadataError::ReadFileError),
    }
  }) {
    handle_metadata_format(get_json_type(json)?)
  } else {
    Err(MetadataError::EmbeddedNotFound)
  }
}

pub fn get_metadata(
  path: &Path,
  mut zip: archives::ZipArchive,
) -> Result<ArchiveMetadata, MetadataError> {
  match get_metadata_from_path(path) {
    Ok(metadata) => Ok(metadata),
    Err(_) => get_metadata_from_zip(&mut zip),
  }
}
