use capitalize::Capitalize;
use funty::Numeric;
use image::{codecs::avif::AvifEncoder, imageops::FilterType};
use itertools::Itertools;
use regex::Regex;
use ring::digest::{Context, Digest, SHA256};
use std::{
  io::{Cursor, Read},
  path::{Path, PathBuf},
};

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

pub fn parse_filename(filename: &str) -> (String, Vec<String>, Vec<String>) {
  let filename = filename.trim();

  let mut title = String::new();
  let mut artists = vec![];
  let mut circles = vec![];

  let re = Regex::new(r"(\(|\[|\{)?[^\(\[\{\}\]\)]+(\}\)|\])?").unwrap();
  let mut captures: Vec<String> = vec![];

  for cap in re.captures_iter(filename) {
    let str = cap[0].trim().to_string();

    if !str.is_empty() {
      captures.push(str);
    }
  }

  let mut captures = captures.iter();

  match captures.len() {
    0 => {}
    1 => {
      title = captures.next().unwrap().to_string();
    }
    2 => {
      artists = captures
        .next()
        .unwrap()
        .split(',')
        .map(|s| s.trim_matches('[').trim_matches(']').trim().to_string())
        .collect_vec();

      title = captures.next().unwrap().to_string();
    }
    _ => {
      let str = captures.next().unwrap();

      if str.starts_with('(') {
        artists = str
          .split(',')
          .map(|s| s.trim_matches('(').trim_matches('(').trim().to_string())
          .collect_vec();
      } else if str.starts_with('[') {
        circles = str
          .split(',')
          .map(|s| s.trim_matches('[').trim_matches(']').trim().to_string())
          .collect_vec();
      }

      let str = captures.next().unwrap();

      if str.starts_with('(') {
        artists = str
          .split(',')
          .map(|s| s.trim_matches('(').trim_matches('(').trim().to_string())
          .collect_vec();
      } else if str.starts_with('[') {
        circles = str
          .split(',')
          .map(|s| s.trim_matches('[').trim_matches(']').trim().to_string())
          .collect_vec();
      }

      title = captures.next().unwrap().to_string();
    }
  }

  (title, artists, circles)
}

pub fn parse_source_name(str: &str) -> String {
  let str = str.trim().to_lowercase();

  if str.contains("fakku") {
    "FAKKU".into()
  } else if str.contains("irodori") {
    return "Irodori Comics".into();
  } else if str.contains("projecth") {
    return "Project Hentai".into();
  } else if str.contains("pixiv") {
    return "Pixiv".into();
  } else if str.contains("patreon") {
    return "Patreon".into();
  } else if str.contains("anchira") {
    return "Anchira".into();
  } else if str.contains("hentainexus") || str.contains("hentai nexus") {
    return "HentaiNexus".into();
  } else {
    return if let Ok(url) = url::Url::parse(&str) {
      url.host_str().unwrap_or(&str).to_string()
    } else {
      str
    }
    .capitalize_words();
  }
}

#[derive(Clone, Copy)]
pub struct ImageEncodeOpts {
  pub width: u32,
  pub speed: u8,
  pub quality: u8,
}

pub fn encode_image(
  img: &[u8],
  ImageEncodeOpts {
    width,
    speed,
    quality,
  }: ImageEncodeOpts,
) -> anyhow::Result<Vec<u8>> {
  let cursor = Cursor::new(img);
  let img = image::io::Reader::new(cursor)
    .with_guessed_format()?
    .decode()?;

  let img = img.resize(width, width * 2, FilterType::Lanczos3);

  let mut buf = vec![];
  let encoder = AvifEncoder::new_with_speed_quality(&mut buf, speed, quality);
  img.write_with_encoder(encoder)?;

  Ok(buf)
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
