use once_cell::sync::Lazy;
use serde::Deserialize;
use serde_inline_default::serde_inline_default;
use std::{env, fs, path::PathBuf};

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
}

#[derive(Deserialize)]
pub struct Database {
  pub host: String,
  pub port: u16,
  pub name: String,
  pub user: String,
  pub pass: String,
}

#[derive(Deserialize)]
pub struct Server {
  pub host: String,
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

#[derive(Deserialize)]
pub struct Directories {
  pub data: PathBuf,
  pub content: PathBuf,
  #[serde(skip)]
  pub links: PathBuf,
  #[serde(skip)]
  pub thumbs: PathBuf,
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

#[derive(Deserialize, Clone, Copy)]
pub struct Thumbnails {
  pub quality: u8,
  pub cover_quality: u8,
  pub speed: u8,
  pub cover_speed: u8,
  pub width: u32,
  pub cover_width: u32,
}

impl Default for Thumbnails {
  fn default() -> Self {
    Self {
      quality: 50,
      cover_quality: 50,
      speed: 4,
      cover_speed: 4,
      width: 320,
      cover_width: 540,
    }
  }
}
