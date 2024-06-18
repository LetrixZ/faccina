use crate::image;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use serde_inline_default::serde_inline_default;
use std::{env, fmt::Display, fs, path::PathBuf};

pub static CONFIG: Lazy<Config> = Lazy::new(|| {
  let config_location = env::var("CONFIG_FILE").unwrap_or("config.toml".to_string());
  let file = fs::read_to_string(config_location).expect("Failed to read read configuration file");
  let mut config: Config = toml::from_str(&file)
    .map_err(|e| e.message().to_string())
    .expect("Failed to pase config file");

  config.directories.set_relative();
  config.directories.create_dirs();
  config
});

pub static REGEX: Lazy<RegexCollection> = Lazy::new(|| {
  let hentag = Regex::new(r#"("coverImageUrl"|"maleTags"|"femaleTags")"#).unwrap();
  let gallery_dl = Regex::new(r#"("artist:.*"|"group:.*"|"male:.*"|"female:.*")"#).unwrap();
  let eze = Regex::new(r#"("group":|"artist":|"male":|"female":)\["#).unwrap();
  let eze_sad = Regex::new(r#""gallery_info":\{"#).unwrap();
  let koromo = Regex::new(r#"(("Tags":)\[)|("Artist":")"#).unwrap();
  let koromo_alt = Regex::new(r#"(("tags":)\[)|("artists":")"#).unwrap();

  RegexCollection {
    hentag,
    gallery_dl,
    eze,
    eze_sad,
    koromo,
    koromo_alt,
  }
});

pub struct RegexCollection {
  pub hentag: Regex,
  pub gallery_dl: Regex,
  pub eze: Regex,
  pub eze_sad: Regex,
  pub koromo: Regex,
  pub koromo_alt: Regex,
}

#[serde_inline_default]
#[derive(Deserialize)]
pub struct Config {
  pub database: Database,
  #[serde_inline_default(Server::default())]
  pub server: Server,
  #[serde_inline_default(Directories::default())]
  pub directories: Directories,
  #[serde_inline_default(Thumbnails::default())]
  pub thumbnails: Thumbnails,
  #[serde_inline_default(Metadata::default())]
  pub metadata: Metadata,
}

impl Display for Config {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(
      f,
      "{:?}\n{:?}\n{:?}\n{:?}\n{:?}",
      self.database, self.server, self.directories, self.thumbnails, self.metadata
    )
  }
}

#[derive(Deserialize, Debug)]
pub struct Database {
  pub host: String,
  pub port: u16,
  pub name: String,
  pub user: String,
  pub pass: String,
}

#[serde_inline_default(Server::default())]
#[derive(Deserialize, Debug)]
pub struct Server {
  #[serde_inline_default("0.0.0.0".to_string())]
  pub host: String,
  #[serde_inline_default(3000)]
  pub port: u16,
}

impl Default for Server {
  fn default() -> Self {
    Self {
      host: "0.0.0.0".to_string(),
      port: 3000,
    }
  }
}

#[serde_inline_default]
#[derive(Deserialize, Debug)]
pub struct Directories {
  #[serde_inline_default("./data".into())]
  pub data: PathBuf,
  #[serde_inline_default("./content".into())]
  pub content: PathBuf,
  #[serde(skip)]
  pub links: PathBuf,
  #[serde(skip)]
  pub thumbs: PathBuf,
  #[serde_inline_default("./logs".into())]
  pub log: PathBuf,
}

impl Directories {
  fn set_relative(&mut self) {
    self.links = self.data.join("links");
    self.thumbs = self.data.join("thumbs");
  }

  fn create_dirs(&self) {
    fs::create_dir_all(&self.data).expect("Failed to create data directory");
    fs::create_dir_all(&self.links).expect("Failed to create symbolic links directory");
    fs::create_dir_all(&self.thumbs).expect("Failed to create thumbnail directory");
    fs::create_dir_all(&self.log).expect("Failed to create logs directory");

    let _ = fs::create_dir_all(&self.content);
  }
}

impl Default for Directories {
  fn default() -> Self {
    Self {
      data: "./data".into(),
      links: "./data/links".into(),
      thumbs: "./data/thumbs".into(),
      content: "./content".into(),
      log: "./logs".into(),
    }
  }
}

#[serde_inline_default]
#[derive(Deserialize, Clone, Copy, Debug)]
pub struct Thumbnails {
  #[serde_inline_default(50)]
  pub quality: u8,
  #[serde_inline_default(50)]
  pub cover_quality: u8,
  #[serde_inline_default(4)]
  pub speed: u8,
  #[serde_inline_default(4)]
  pub cover_speed: u8,
  #[serde(default)]
  pub format: image::ImageCodec,
  #[serde_inline_default(320)]
  pub width: u32,
  #[serde_inline_default(540)]
  pub cover_width: u32,
}

impl Default for Thumbnails {
  fn default() -> Self {
    Self {
      quality: 50,
      cover_quality: 50,
      speed: 4,
      cover_speed: 4,
      format: Default::default(),
      width: 320,
      cover_width: 540,
    }
  }
}

#[serde_inline_default]
#[derive(Deserialize, Clone, Copy, Debug)]
pub struct Metadata {
  #[serde_inline_default(true)]
  pub parse_filename_title: bool,
}

impl Default for Metadata {
  fn default() -> Self {
    Self {
      parse_filename_title: true,
    }
  }
}
