mod anchira;
mod eze;
mod gallerydl;
mod hentag;
mod hentainexus;
mod koromo;
mod koromo_alt;

use crate::{
  config::REGEX,
  db,
  utils::{self, ToStringExt},
};
use anyhow::anyhow;
use serde_json::Value as JsonValue;
use serde_yaml::Value as YamlValue;
use std::{
  fs,
  io::{Cursor, Read},
  path::Path,
};
use zip::ZipArchive;

enum MetadataFormat {
  Yaml(MetadataFormatYaml),
  Json(MetadataFormatJson),
}

enum MetadataFormatYaml {
  Anchira(String),
  HentaiNexus(String),
}

enum MetadataFormatJson {
  HenTag(String),
  Eze(String),
  Koromo(String),
  KoromoAlt(String),
  GalleryDL(String),
}

fn handle_metadata_format(
  archive: &mut db::InsertArchive,
  format: MetadataFormat,
) -> anyhow::Result<()> {
  match format {
    MetadataFormat::Yaml(yaml) => match yaml {
      MetadataFormatYaml::Anchira(yaml) => anchira::add_metadata(&yaml, archive)?,
      MetadataFormatYaml::HentaiNexus(yaml) => hentainexus::add_metadata(&yaml, archive)?,
    },
    MetadataFormat::Json(json) => match json {
      MetadataFormatJson::HenTag(json) => hentag::add_metadata(&json, archive)?,
      MetadataFormatJson::Eze(json) => eze::add_metadata(&json, archive)?,
      MetadataFormatJson::Koromo(json) => koromo::add_metadata(&json, archive)?,
      MetadataFormatJson::KoromoAlt(json) => koromo_alt::add_metadata(&json, archive)?,
      MetadataFormatJson::GalleryDL(json) => gallerydl::add_metadata(&json, archive)?,
    },
  }

  Ok(())
}

fn get_yaml_type(yaml: String) -> anyhow::Result<MetadataFormatYaml> {
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
  } else if REGEX.koromo_alt.is_match(&minified) {
    return Ok(MetadataFormatJson::KoromoAlt(minified));
  }

  Err(anyhow!("Failed to get metadata type from JSON"))
}

pub fn add_external_metadata(path: &Path, archive: &mut db::InsertArchive) -> anyhow::Result<()> {
  let yaml_path = path
    .parent()
    .unwrap()
    .join(format!("{}.yaml", path.file_stem().unwrap().to_string()));

  let json_path = path
    .parent()
    .unwrap()
    .join(format!("{}.json", path.file_stem().unwrap().to_string()));

  if let Ok(yaml) = fs::read_to_string(yaml_path) {
    handle_metadata_format(archive, MetadataFormat::Yaml(get_yaml_type(yaml)?))?;

    Ok(())
  } else if let Ok(json) = fs::read_to_string(json_path) {
    handle_metadata_format(archive, MetadataFormat::Json(get_json_type(json)?))?;

    Ok(())
  } else {
    Err(anyhow!("Couldn't find external metadata file"))
  }
}

pub fn add_metadata(
  zip: &mut ZipArchive<Cursor<Vec<u8>>>,
  archive: &mut db::InsertArchive,
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

    Ok(())
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

    Ok(())
  } else {
    Err(anyhow!("Couldn't find metadata file"))
  }
}
