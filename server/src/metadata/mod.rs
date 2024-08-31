mod anchira;
mod ccdc06;
mod eze;
mod gallerydl;
pub mod hentag;
mod hentainexus;
mod koharu;
mod koromo;

use crate::{
  config::REGEX,
  db,
  utils::{self, ToStringExt},
};
use anyhow::anyhow;
use regex::Regex;
use serde::Deserialize;
use serde_json::Value as JsonValue;
use serde_yaml::Value as YamlValue;
use std::{
  collections::HashMap,
  fmt::Display,
  fs,
  io::{Cursor, Read},
  path::Path,
};
use zip::ZipArchive;

#[derive(Deserialize)]
#[serde(untagged)]
enum MultiTextField {
  Single(String),
  Many(Vec<String>),
  MapUsize(HashMap<usize, String>),
  MapString(HashMap<String, String>),
}

impl MultiTextField {
  fn to_vec(&self) -> Vec<String> {
    match self {
      MultiTextField::Single(value) => value.split(',').map(|s| s.trim().to_string()).collect(),
      MultiTextField::Many(value) => value.to_vec(),
      MultiTextField::MapUsize(value) => value.values().map(|s| s.to_string()).collect(),
      MultiTextField::MapString(value) => value.values().map(|s| s.to_string()).collect(),
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
  Yaml(MetadataFormatYaml),
  Json(MetadataFormatJson),
}

enum MetadataFormatYaml {
  Anchira(String),
  HentaiNexus(String),
  CCDC06(String),
  Koharu(String),
}

enum MetadataFormatJson {
  HenTag(String),
  Eze(String),
  Koromo(String),
  GalleryDL(String),
}

fn handle_metadata_format(
  archive: &mut db::UpsertArchiveData,
  format: MetadataFormat,
) -> anyhow::Result<()> {
  match format {
    MetadataFormat::Yaml(yaml) => match yaml {
      MetadataFormatYaml::Anchira(yaml) => {
        let metadata = serde_yaml::from_str(&yaml)?;
        anchira::add_metadata(metadata, archive)?
      }
      MetadataFormatYaml::HentaiNexus(yaml) => {
        let metadata = serde_yaml::from_str(&yaml)?;
        hentainexus::add_metadata(metadata, archive)?
      }
      MetadataFormatYaml::CCDC06(yaml) => {
        let metadata = serde_yaml::from_str(&yaml)?;
        ccdc06::add_metadata(metadata, archive)?
      }
      MetadataFormatYaml::Koharu(yaml) => {
        let metadata = serde_yaml::from_str(&yaml)?;
        koharu::add_metadata(metadata, archive)?
      }
    },
    MetadataFormat::Json(json) => match json {
      MetadataFormatJson::HenTag(json) => {
        let metadata = serde_json::from_str(&json)?;
        hentag::add_metadata(metadata, archive)?
      }
      MetadataFormatJson::Eze(json) => {
        let metadata = serde_json::from_str(&json)?;
        eze::add_metadata(metadata, archive)?
      }
      MetadataFormatJson::Koromo(json) => {
        let metadata = serde_json::from_str(&json)?;
        koromo::add_metadata(metadata, archive)?
      }
      MetadataFormatJson::GalleryDL(json) => {
        let metadata = serde_json::from_str(&json)?;
        gallerydl::add_metadata(metadata, archive)?
      }
    },
  }

  Ok(())
}

fn get_yaml_type(yaml: String) -> anyhow::Result<MetadataFormatYaml> {
  if yaml.contains("title") || yaml.contains("general") {
    return Ok(MetadataFormatYaml::Koharu(yaml));
  }

  if yaml.contains("DownloadSource") || yaml.contains("ThumbnailIndex") || yaml.contains("Files") {
    return Ok(MetadataFormatYaml::CCDC06(yaml));
  }

  let value: YamlValue = serde_yaml::from_str(&yaml).expect("Failed to parse YAML");
  if let Some(source) = value.get("Source") {
    if let Some(source) = source.as_str() {
      if source.contains("hentainexus.com") {
        return Ok(MetadataFormatYaml::HentaiNexus(yaml));
      } else if source.contains("anchira.to") {
        return Ok(MetadataFormatYaml::Anchira(yaml));
      }
    }
  }

  if let Some(artist) = value.get("Artist") {
    if artist.is_string() || artist.is_mapping() {
      return Ok(MetadataFormatYaml::HentaiNexus(yaml));
    } else if artist.is_sequence() {
      return Ok(MetadataFormatYaml::Anchira(yaml));
    }
  } else if let Some(circle) = value.get("Circle") {
    if circle.is_string() || circle.is_mapping() {
      return Ok(MetadataFormatYaml::HentaiNexus(yaml));
    } else if circle.is_sequence() {
      return Ok(MetadataFormatYaml::Anchira(yaml));
    }
  } else if let Some(parody) = value.get("Parody") {
    if parody.is_string() || parody.is_mapping() {
      return Ok(MetadataFormatYaml::HentaiNexus(yaml));
    } else if parody.is_sequence() {
      return Ok(MetadataFormatYaml::Anchira(yaml));
    }
  }

  Err(anyhow!("Failed to get metadata type from YAML"))
}

fn get_json_type(json: String) -> anyhow::Result<MetadataFormatJson> {
  let value: JsonValue = serde_json::from_str(&json).expect("Failed to parse JSON");
  let minified = serde_json::to_string(&value).expect("Failed to minify");

  if REGEX.hentag.is_match(&minified) {
    return Ok(MetadataFormatJson::HenTag(minified));
  } else if REGEX.eze_sad.is_match(&minified) {
    let value: JsonValue = serde_json::from_str(&minified).unwrap();
    let value = value.get("gallery_info").unwrap();
    let minified = serde_json::to_string(&value).unwrap();
    return Ok(MetadataFormatJson::Eze(minified));
  } else if REGEX.eze.is_match(&minified) {
    return Ok(MetadataFormatJson::Eze(minified));
  } else if REGEX.gallery_dl.is_match(&minified) {
    return Ok(MetadataFormatJson::GalleryDL(minified));
  } else if REGEX.koromo.is_match(&minified) {
    return Ok(MetadataFormatJson::Koromo(minified));
  }

  Err(anyhow!("Failed to get metadata type from JSON"))
}

pub fn add_external_metadata(
  path: &Path,
  archive: &mut db::UpsertArchiveData,
) -> anyhow::Result<()> {
  let re = Regex::new(r#"\.(cbz|zip)"#).unwrap();

  let yaml_path = re.replace_all(&path.to_string(), ".yaml").to_string();
  let json_path = re.replace_all(&path.to_string(), ".json").to_string();

  if let Ok(yaml) = fs::read_to_string(yaml_path) {
    handle_metadata_format(archive, MetadataFormat::Yaml(get_yaml_type(yaml)?))?;
  } else if let Ok(json) = fs::read_to_string(json_path) {
    handle_metadata_format(archive, MetadataFormat::Json(get_json_type(json)?))?;
  } else {
    return Err(anyhow!("Couldn't find external metadata file"));
  }

  archive.has_metadata = Some(true);

  Ok(())
}

pub fn add_metadata(
  zip: &mut ZipArchive<Cursor<Vec<u8>>>,
  archive: &mut db::UpsertArchiveData,
) -> anyhow::Result<()> {
  if let Ok((yaml, date)) = zip.by_name("info.yaml").map(|mut file| {
    let mut str = String::new();
    let _ = file.read_to_string(&mut str);
    (str, file.last_modified())
  }) {
    if yaml.is_empty() {
      return Err(anyhow!("Empty 'info.yaml' file"));
    }

    archive.released_at = date.map(utils::parse_zip_date);
    handle_metadata_format(archive, MetadataFormat::Yaml(get_yaml_type(yaml)?))?;
  } else if let Ok((json, date)) = zip.by_name("info.json").map(|mut file| {
    let mut str = String::new();
    let _ = file.read_to_string(&mut str);
    (str, file.last_modified())
  }) {
    if json.is_empty() {
      return Err(anyhow!("Empty 'info.json' file"));
    }

    archive.released_at = date.map(utils::parse_zip_date);
    handle_metadata_format(archive, MetadataFormat::Json(get_json_type(json)?))?;
  } else {
    return Err(anyhow!("Couldn't find metadata file"));
  }

  archive.has_metadata = Some(true);

  Ok(())
}
