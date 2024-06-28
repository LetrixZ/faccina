use super::ZipFile;
use crate::{
  cmd,
  config::{self, CONFIG},
  image,
  utils::{self, ToStringExt},
};
use ::image::GenericImageView;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use itertools::Itertools;
use rayon::iter::{IntoParallelIterator, ParallelIterator};
use sqlx::PgPool;
use std::{
  fs::{self, create_dir_all},
  io::Cursor,
  path::Path,
};
use tracing::error;

#[derive(Debug, Clone, Copy)]
pub struct ThumbnailOpts {
  pub regenerate: bool,
  pub quality: u8,
  pub cover_quality: u8,
  pub speed: u8,
  pub cover_speed: u8,
  pub width: u32,
  pub cover_width: u32,
  pub codec: image::ImageCodec,
}

impl From<config::Thumbnails> for ThumbnailOpts {
  fn from(value: config::Thumbnails) -> Self {
    Self {
      regenerate: false,
      quality: value.quality,
      cover_quality: value.cover_quality,
      speed: value.speed,
      cover_speed: value.cover_speed,
      width: value.width,
      cover_width: value.cover_width,
      codec: value.format,
    }
  }
}

impl From<cmd::GenerateThumbnailArgs> for ThumbnailOpts {
  fn from(args: cmd::GenerateThumbnailArgs) -> Self {
    Self {
      regenerate: args.regenerate,
      width: args.width.unwrap_or(CONFIG.thumbnails.width),
      cover_width: args.width.unwrap_or(CONFIG.thumbnails.cover_width),
      quality: args.quality.unwrap_or(CONFIG.thumbnails.quality),
      cover_quality: args
        .cover_quality
        .unwrap_or(args.quality.unwrap_or(CONFIG.thumbnails.quality)),
      speed: args.speed.unwrap_or(CONFIG.thumbnails.speed),
      cover_speed: args
        .cover_speed
        .unwrap_or(args.speed.unwrap_or(CONFIG.thumbnails.speed)),
      codec: args.format.unwrap_or_default(),
    }
  }
}

pub async fn calculate_dimensions(
  archive_id: i64,
  recalcualte: bool,
  files: &mut [ZipFile],
  pool: &PgPool,
  mp: Option<&MultiProgress>,
) -> anyhow::Result<()> {
  let existing_dimensions = sqlx::query_scalar!(
    r#"SELECT page_number FROM archive_images WHERE archive_id = $1 AND width IS NOT NULL AND height IS NOT NULL"#,
    archive_id
  )
  .fetch_all(pool)
  .await?;

  if !recalcualte && existing_dimensions.len() == files.len() {
    return Ok(());
  }

  let mut file_idx = files.iter().enumerate().map(|(i, _)| i).collect_vec();

  if !recalcualte {
    file_idx.retain(|i| {
      existing_dimensions
        .iter()
        .all(|dimension| *dimension != TryInto::<i16>::try_into(i + 1).unwrap())
    });
  }

  let pb = ProgressBar::new(file_idx.len() as u64);
  pb.set_style(
    ProgressStyle::with_template("[{elapsed_precise}] {bar:40} {pos:>7}/{len:7}").unwrap(),
  );

  if let Some(mp) = mp {
    mp.add(pb.clone());
  }

  let dimensions = file_idx
    .into_par_iter()
    .filter_map(|i| {
      let page = i + 1;
      let file = &files[i];

      let result = (|| -> anyhow::Result<(usize, &String, u32, u32)> {
        let cursor = Cursor::new(&file.contents);
        let img = ::image::io::Reader::new(cursor)
          .with_guessed_format()?
          .decode()?;
        let (w, h) = img.dimensions();

        Ok((page, &file.filename, w, h))
      })();

      pb.inc(1);

      match result {
        Ok(dimensions) => Some(dimensions),
        Err(err) => {
          pb.suspend(|| {
            error!(
              target: "archive::calculate_dimensions",
              "Failed to get dimensions for page number {} ({}) for archive ID '{}': {err}",
              page,
              file.filename,
              archive_id
            )
          });
          None
        }
      }
    })
    .collect::<Vec<_>>();

  sqlx::query!(
    r#"INSERT INTO archive_images (archive_id, page_number, filename, width, height)
    SELECT * FROM UNNEST($1::bigint[], $2::smallint[], $3::text[], $4::smallint[], $5::smallint[])
    ON CONFLICT (archive_id, page_number)
    DO UPDATE SET page_number = excluded.page_number, filename = excluded.filename, width = excluded.width, height = excluded.height"#,
    &vec![archive_id; dimensions.len()],
    &dimensions
      .iter()
      .map(|d| i16::try_from(d.0).unwrap())
      .collect_vec(),
    &dimensions
      .iter()
      .map(|d| d.1.clone())
      .collect_vec(),
    &dimensions
      .iter()
      .map(|d| i16::try_from(d.2).unwrap())
      .collect_vec(),
    &dimensions
      .iter()
      .map(|d| i16::try_from(d.3).unwrap())
      .collect_vec(),
  )
  .execute( pool)
  .await?;

  pb.finish_and_clear();

  Ok(())
}

pub fn generate_thumbnails(
  archive_id: i64,
  thumbnail: usize,
  files: &mut [ZipFile],
  opts: &ThumbnailOpts,
  mp: Option<&MultiProgress>,
) -> anyhow::Result<()> {
  let archive_thumb_dir = CONFIG.directories.thumbs.join(format!("{}", archive_id));
  create_dir_all(&archive_thumb_dir)?;

  let extension = opts.codec.extension();

  let walker =
    globwalk::glob(format!("{}/*.t.{extension}", archive_thumb_dir.to_string())).unwrap();
  let existing_thumbnails = walker
    .map(|entry| entry.unwrap().path().to_string())
    .collect_vec();

  let cover_name = format!(
    "{}.c.{extension}",
    utils::leading_zeros(thumbnail, files.len())
  );

  if !opts.regenerate
    && (existing_thumbnails.len()) == files.len()
    && archive_thumb_dir.join(&cover_name).exists()
  {
    return Ok(());
  }

  let encode_opts = image::ImageEncodeOpts {
    width: opts.width,
    quality: opts.quality,
    speed: opts.speed,
    codec: opts.codec,
  };

  let encode_cover_opts = image::ImageEncodeOpts {
    width: opts.cover_width,
    quality: opts.cover_quality,
    speed: opts.cover_speed,
    codec: opts.codec,
  };

  let mut file_idx = files.iter().enumerate().map(|(i, _)| i).collect_vec();

  if !opts.regenerate {
    file_idx.retain(|i| {
      existing_thumbnails
        .iter()
        .all(|name: &String| utils::get_digits(name) != i + 1)
    });
  }

  let pb = ProgressBar::new(file_idx.len() as u64);
  pb.set_style(
    ProgressStyle::with_template("[{elapsed_precise}] {bar:40} {pos:>7}/{len:7}").unwrap(),
  );
  if let Some(mp) = mp {
    mp.add(pb.clone());
  }

  let encode_cover = |buf: &Vec<u8>, name: String| {
    let encoded = image::encode_image(buf, encode_cover_opts).unwrap();

    match fs::write(archive_thumb_dir.join(&cover_name), encoded) {
      Ok(_) => {}
      Err(err) => {
        if let Some(mp) = mp {
          mp.suspend(|| {
            error!(
              target: "archive::generate_thumbnails",
              "Failed to generate cover '{}' for archive ID '{}': {err}",
              name, archive_id
            )
          })
        }
      }
    }

    Ok::<_, anyhow::Error>(())
  };

  file_idx.into_par_iter().for_each(|i| {
    let page = i + 1;

    let name = format!("{}.t.{extension}", utils::leading_zeros(page, files.len()));

    _ = (|| -> anyhow::Result<()> {
      if !opts.regenerate && existing_thumbnails.contains(&name) {
        if page == thumbnail && !Path::new(&cover_name).exists() {
          let _ = encode_cover(&files[i].contents, name);
        }

        return Ok(());
      }

      match image::encode_image(&files[i].contents, encode_opts) {
        Ok(encoded) => {
          match fs::write(archive_thumb_dir.join(&name), encoded) {
            Ok(_) => {}
            Err(err) =>
            if let Some(mp) = mp {
              mp.suspend(|| {
                error!(
                  target: "archive::generate_thumbnails",
                  "Failed to save thumbnail '{}' for archive ID '{}': {err}",
                  name, archive_id
                )
              })
            },
          }

          if page == thumbnail
            && (opts.regenerate || !archive_thumb_dir.join(&cover_name).exists())
          {
            encode_cover(&files[i].contents, name).unwrap();
          }

          pb.inc(1);
        }
        Err(err) => pb.suspend(|| {
          error!(target: "archive::generate_thumbnails", "Failed to encode thumbnail '{}' for archive ID '{}': {err}", name, archive_id)
        }),
      }

      Ok(())
    })();
  });

  pb.finish_and_clear();

  Ok(())
}
