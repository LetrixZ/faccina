use anyhow::anyhow;
use async_zip::ZipString;
use chrono::{DateTime, NaiveDateTime};
use funty::Numeric;
use itertools::Itertools;
use regex::Regex;
use ring::digest::{Context, Digest, SHA256};
use sqlx::{Postgres, QueryBuilder};
use std::{
  ffi::OsStr,
  fs,
  io::Read,
  os,
  path::{Path, PathBuf},
};
use time::OffsetDateTime;

pub fn sha256_digest<R: Read>(mut reader: R) -> anyhow::Result<Digest> {
  let mut context = Context::new(&SHA256);
  let mut buffer = [0; 1024];

  loop {
    let count = reader.read(&mut buffer)?;
    if count == 0 {
      break;
    }
    context.update(&buffer[..count]);
  }

  Ok(context.finish())
}

pub fn parse_filename(
  filename: &str,
) -> (Option<String>, Option<Vec<String>>, Option<Vec<String>>) {
  let filename: &str = filename.trim();

  let mut title = None;
  let mut artists = None;
  let mut circles = None;

  let re = Regex::new(r"(\(|\[|\{)?[^\(\[\{\}\]\)]+(\}\)|\])?").unwrap();
  let mut captures: Vec<String> = vec![];

  for (i, cap) in re.captures_iter(filename).enumerate() {
    let str = cap[0].trim().to_string();

    if i == 2 && (str.starts_with('[') || str.starts_with('(')) {
      continue;
    }

    if !str.is_empty() {
      captures.push(str);
    }
  }

  let captures = captures.iter().collect_vec();

  if let (Some(first), Some(second)) = (captures.first(), captures.get(1)) {
    if !second.starts_with('[') && !second.starts_with('(') {
      title = Some(second.to_string());
      artists = Some(
        first
          .split(',')
          .map(|s| s.trim_matches(&['(', ')', '[', ']']).trim().to_string())
          .collect_vec(),
      );
    } else {
      circles = Some(
        first
          .split(',')
          .map(|s| s.trim_matches(&['(', ')', '[', ']']).trim().to_string())
          .collect_vec(),
      );
      artists = Some(
        second
          .split(',')
          .map(|s| s.trim_matches(&['(', ')', '[', ']']).trim().to_string())
          .collect_vec(),
      );

      if let Some(third) = captures.get(2) {
        title = Some(third.to_string());
      }
    }
  } else if let Some(first) = captures.first() {
    title = Some(first.to_string());
  }

  (title, artists, circles)
}

pub fn parse_source_name(str: &str) -> String {
  let str = str.trim().to_lowercase();

  if str.contains("fakku") {
    "FAKKU".into()
  } else if str.contains("irodori") {
    "Irodori Comics".into()
  } else if str.contains("projecth") || str.contains("project-xxx") || str.contains("projectxxx") {
    "Project Hentai".into()
  } else if str.contains("pixiv") {
    "Pixiv".into()
  } else if str.contains("patreon") {
    "Patreon".into()
  } else if str.contains("anchira") {
    "Anchira".into()
  } else if str.contains("hentainexus") || str.contains("hentai nexus") {
    "HentaiNexus".into()
  } else if str.contains("e-hentai") || str.contains("ehentai") {
    "E-Hentai".into()
  } else if str.contains("exhentai") || str.contains("ex-hentai") {
    "ExHentai".into()
  } else if str.contains("hentag") {
    "HenTag".into()
  } else {
    url::Url::parse(&str)
      .ok()
      .and_then(|url| url.host_str().map(capitalize_words))
      .unwrap_or(capitalize_words(&str))
  }
}

pub fn is_image<S: AsRef<str>>(filename: S) -> bool {
  let filename = filename.as_ref();

  filename.ends_with("png")
    || filename.ends_with("webp")
    || filename.ends_with("jpeg")
    || filename.ends_with("jpg")
    || filename.ends_with("avif")
}

pub fn leading_zeros<T: Numeric>(number: T, count: T) -> String {
  let num_digits = count.to_string().len();
  format!("{:0num_digits$}", number)
}

pub trait ToStringExt {
  fn to_string(&self) -> String;
}

impl ToStringExt for Path {
  fn to_string(&self) -> String {
    self.to_str().unwrap().to_string()
  }
}

impl ToStringExt for PathBuf {
  fn to_string(&self) -> String {
    self.to_str().unwrap().to_string()
  }
}

impl ToStringExt for OsStr {
  fn to_string(&self) -> String {
    self.to_str().unwrap().to_string()
  }
}

impl ToStringExt for ZipString {
  fn to_string(&self) -> String {
    self.as_str().unwrap().to_string()
  }
}

pub fn get_digits(s: &str) -> usize {
  let digits: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
  digits.parse::<usize>().unwrap()
}

pub fn trim_whitespace(s: &str) -> String {
  let mut new_str = s.trim().to_owned();
  let mut prev = ' ';
  new_str.retain(|ch| {
    let result = ch != ' ' || prev != ' ';
    prev = ch;
    result
  });
  new_str
}

pub fn capitalize_words(s: &str) -> String {
  s.split_whitespace()
    .map(|word: &str| {
      word
        .chars()
        .enumerate()
        .map(|(i, c)| {
          if i == 0 {
            c.to_uppercase().to_string()
          } else {
            c.to_string()
          }
        })
        .collect::<String>()
    })
    .collect::<Vec<String>>()
    .join(" ")
}

pub fn parse_zip_date(date: zip::DateTime) -> NaiveDateTime {
  DateTime::from_timestamp(OffsetDateTime::try_from(date).unwrap().unix_timestamp(), 0)
    .unwrap()
    .naive_utc()
}

pub fn tag_alias(name: &str, slug: &str) -> String {
  match slug {
    "fff-threesome" => "FFF Threesome".to_string(),
    "fffm-foursome" => "FFFM Foursome".to_string(),
    "ffm-threesome" => "FFM Threesome".to_string(),
    "fft-threesome" => "FFT Threesome".to_string(),
    "mmf-threesome" => "MMF Threesome".to_string(),
    "mmm-threesome" => "MMM Threesome".to_string(),
    "mmmf-foursome" => "MMMF Foursome".to_string(),
    "mmt-threesome" => "MMT Threesome".to_string(),
    "cg-set" => "CG Set".to_string(),
    "bss" => "BSS".to_string(),
    "bl" => "BL".to_string(),
    "comics-r18" => "Comics R18".to_string(),
    "sci-fi" => "Sci-Fi".to_string(),
    "x-ray" => "X-ray".to_string(),
    "non-h" => "Non-H".to_string(),
    "sixty-nine" => "Sixty-Nine".to_string(),
    _ => name.to_string(),
  }
}

pub fn map_timestamp(timestamp: Option<i64>) -> Option<NaiveDateTime> {
  timestamp
    .and_then(|timestamp| DateTime::from_timestamp(timestamp, 0))
    .map(|datetime| datetime.naive_utc())
}

pub fn create_symlink(src: &impl AsRef<Path>, dest: &impl AsRef<Path>) -> anyhow::Result<()> {
  #[cfg(unix)]
  if let Err(err) = os::unix::fs::symlink(src, dest) {
    match err.kind() {
      std::io::ErrorKind::AlreadyExists => {
        if fs::remove_file(dest).is_ok() {
          if let Err(err) = os::unix::fs::symlink(src, dest) {
            return Err(anyhow!("Couldn't create a symbolic link: {err}"));
          }
        }
      }
      _ => {
        return Err(anyhow!("Couldn't create a symbolic link: {err}"));
      }
    }
  }

  #[cfg(windows)]
  if let Err(err) = os::windows::fs::symlink_file(src, dest) {
    match err.kind() {
      std::io::ErrorKind::AlreadyExists => {
        if fs::remove_file(dest).is_ok() {
          if let Err(err) = os::windows::fs::symlink(src, dest) {
            return Err(anyhow!("Couldn't create a symbolic link: {err}"));
          }
        }
      }
      _ => {
        return Err(anyhow!("Couldn't create a symbolic link: {err}"));
      }
    }
  }

  Ok(())
}

pub fn add_id_ranges(qb: &mut QueryBuilder<Postgres>, id_ranges: &str) {
  let id_ranges = id_ranges.split(',').map(|s| s.trim()).collect_vec();
  let mut ids = vec![];
  let mut ranges = vec![];

  for range in id_ranges {
    let splits = range.split('-').filter(|s| !s.is_empty()).collect_vec();

    if splits.len() == 1 {
      let id = splits.first().unwrap();
      ids.push(id.parse::<i64>().unwrap());
    } else if splits.len() == 2 {
      let start = splits.first().unwrap();
      let end = splits.last().unwrap();
      ranges.push((start.parse::<i64>().unwrap(), end.parse::<i64>().unwrap()))
    }
  }

  qb.push(" id = ANY(").push_bind(ids).push(")");

  if !ranges.is_empty() {
    qb.push(" OR");
  }

  for (i, (start, end)) in ranges.clone().into_iter().enumerate() {
    qb.push(" (id >= ")
      .push(start)
      .push(" AND id <= ")
      .push_bind(end)
      .push(")");

    if i != ranges.len() - 1 {
      qb.push(" OR");
    }
  }
}
