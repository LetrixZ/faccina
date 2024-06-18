use crate::config;
use clap::ValueEnum;
use image::{
  codecs::{
    avif::AvifEncoder,
    jpeg::JpegEncoder,
    png::{self, PngEncoder},
  },
  imageops::FilterType,
  DynamicImage, GenericImageView,
};
use serde::Deserialize;
use std::io::Cursor;

#[derive(Clone, Copy, Debug, ValueEnum, Deserialize)]
#[clap(rename_all = "lower")]
pub enum ImageCodec {
  #[serde(rename = "avif")]
  Avif,
  #[serde(rename = "webp")]
  Webp,
  #[serde(rename = "jpeg")]
  Jpeg,
  #[serde(rename = "png")]
  Png,
}

impl Default for ImageCodec {
  fn default() -> Self {
    Self::Webp
  }
}

impl ImageCodec {
  pub fn extension(&self) -> String {
    match self {
      ImageCodec::Avif => "avif".into(),
      ImageCodec::Webp => "webp".into(),
      ImageCodec::Jpeg => "jpeg".into(),
      ImageCodec::Png => "png".into(),
    }
  }
}

#[derive(Clone, Copy, Debug)]
pub struct ImageEncodeOpts {
  pub width: u32,
  pub speed: u8,
  pub quality: u8,
  pub codec: ImageCodec,
}

impl ImageEncodeOpts {
  pub fn cover_from(value: config::Thumbnails) -> Self {
    Self {
      width: value.cover_width,
      speed: value.cover_speed,
      quality: value.cover_quality,
      codec: value.format,
    }
  }

  pub fn thumb_from(value: config::Thumbnails) -> Self {
    Self {
      width: value.width,
      speed: value.speed,
      quality: value.quality,
      codec: value.format,
    }
  }
}

fn encode(
  img: &DynamicImage,
  ImageEncodeOpts {
    width: _,
    speed,
    quality,
    codec,
  }: ImageEncodeOpts,
) -> anyhow::Result<Vec<u8>> {
  let mut buf = vec![];

  match codec {
    ImageCodec::Avif => {
      let encoder = AvifEncoder::new_with_speed_quality(&mut buf, speed, quality);
      img.write_with_encoder(encoder)?;
    }
    ImageCodec::Jpeg => {
      let encoder = JpegEncoder::new_with_quality(&mut buf, quality);
      img.write_with_encoder(encoder)?;
    }
    ImageCodec::Png => {
      let encoder = PngEncoder::new_with_quality(
        &mut buf,
        png::CompressionType::Default,
        png::FilterType::NoFilter,
      );

      img.write_with_encoder(encoder)?;
    }
    ImageCodec::Webp => {
      let encoder = webp::Encoder::from_image(img).unwrap();
      let encoded = encoder.encode(quality.into());
      return Ok((*encoded).to_vec());
    }
  };

  Ok(buf)
}

pub fn encode_image(img: &[u8], opts: ImageEncodeOpts) -> anyhow::Result<Vec<u8>> {
  let cursor = Cursor::new(img);
  let img = image::io::Reader::new(cursor)
    .with_guessed_format()?
    .decode()?;
  let (w, h) = img.dimensions();

  if w < 50 || h < 50 {
    return encode(&img, opts);
  }

  let resized = img.resize(opts.width, opts.width * h / w, FilterType::Lanczos3);
  let img = image::DynamicImage::ImageRgb8(resized.into());

  encode(&img, opts)
}
