use crate::{config::CONFIG, db, utils};
use serde::Deserialize;
use slug::slugify;

#[derive(Deserialize)]
pub struct Metadata {
  pub title: String,
  pub description: Option<String>,
  pub source: Option<String>,
  pub artist: Option<Vec<String>>,
  pub circle: Option<Vec<String>>,
  pub parody: Option<Vec<String>>,
  pub magazine: Option<Vec<String>>,
  pub event: Option<Vec<String>>,
  pub general: Option<Vec<String>>,
  pub female: Option<Vec<String>>,
  pub male: Option<Vec<String>>,
  pub mixed: Option<Vec<String>>,
  pub other: Option<Vec<String>>,
  pub language: Option<Vec<String>>,
  pub url: Option<String>,
}

pub fn add_metadata(info: Metadata, archive: &mut db::UpsertArchiveData) -> anyhow::Result<()> {
  archive.title = if CONFIG.metadata.parse_filename_title {
    utils::parse_filename(&info.title).0
  } else {
    Some(info.title)
  };
  archive.slug = archive.title.as_ref().map(slugify);
  archive.description = info.description;
  archive.thumbnail = Some(1);

  archive.artists = info.artist.map(|tags| {
    tags
      .iter()
      .map(|tag| utils::capitalize_words(tag))
      .collect()
  });
  archive.circles = info.circle.map(|tags| {
    tags
      .iter()
      .map(|tag| utils::capitalize_words(tag))
      .collect()
  });
  archive.magazines = info.magazine.map(|tags| {
    tags
      .iter()
      .map(|tag| utils::capitalize_words(tag))
      .collect()
  });
  archive.events = info.event.map(|tags| {
    tags
      .iter()
      .map(|tag| utils::capitalize_words(tag))
      .collect()
  });
  archive.parodies = info.parody.map(|tags| {
    tags
      .iter()
      .map(|tag| utils::capitalize_words(tag))
      .collect()
  });

  archive.language = info.language.and_then(|languages| {
    languages
      .first()
      .map(|language| utils::capitalize_words(language))
  });

  let mut tags = vec![];

  if let Some(general) = info.general {
    general.into_iter().for_each(|tag| {
      tags.push((utils::capitalize_words(&tag), "".to_string()));
    });
  }

  if let Some(female) = info.female {
    female.into_iter().for_each(|tag| {
      tags.push((utils::capitalize_words(&tag), "female".to_string()));
    });
  }

  if let Some(male) = info.male {
    male.into_iter().for_each(|tag| {
      tags.push((utils::capitalize_words(&tag), "male".to_string()));
    });
  }

  if let Some(mixed) = info.mixed {
    mixed.into_iter().for_each(|tag| {
      tags.push((utils::capitalize_words(&tag), "mixed".to_string()));
    });
  }

  if let Some(other) = info.other {
    other.into_iter().for_each(|tag| {
      tags.push((utils::capitalize_words(&tag), "other".to_string()));
    });
  }

  if !tags.is_empty() {
    archive.tags = Some(tags);
  }

  let mut sources = vec![];

  if let Some(url) = info.url {
    sources.push(db::ArchiveSource {
      name: utils::parse_source_name(&url),
      url: Some(url),
    });
  }

  if let Some(url) = info.source {
    sources.push(db::ArchiveSource {
      name: utils::parse_source_name(&url),
      url: Some(format!(
        "https://koharu.to{}",
        url.split(':').last().unwrap()
      )),
    });
  }

  if !sources.is_empty() {
    archive.sources = Some(sources);
  }

  Ok(())
}
