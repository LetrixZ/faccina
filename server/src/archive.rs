use crate::config::CONFIG;
use crate::db::InsertArchive;
use crate::metadata::add_metadata;
use crate::utils::{self, ToStringExt};
use crate::{cmd, config};
use anyhow::anyhow;
use data_encoding::HEXUPPER;
use funty::Fundamental;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use itertools::Itertools;
use rayon::prelude::*;
use slug::slugify;
use sqlx::{PgConnection, PgPool, Postgres, QueryBuilder, Transaction};
use std::collections::HashMap;
use std::fs::{self, create_dir_all};
use std::io::{Cursor, Read};
use std::os;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{error, info};
use zip::ZipArchive;

pub struct IndexArgs {
  pub path: PathBuf,
  pub reindex: bool,
  pub skip_thumbnails: bool,
}

impl IndexArgs {
  pub fn with_args(args: &cmd::IndexArgs, path: &Path) -> Self {
    Self {
      path: path.to_path_buf(),
      reindex: args.reindex,
      skip_thumbnails: args.skip_thumbnails,
    }
  }
}

pub struct GenerateThumbnailArgs {
  pub quality: u8,
  pub regenerate: bool,
  pub width: u32,
  pub cover_width: u32,
  pub cover_quality: u8,
  pub speed: u8,
  pub cover_speed: u8,
}

impl From<cmd::GenerateThumbnailArgs> for GenerateThumbnailArgs {
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
    }
  }
}

impl From<config::Thumbnails> for GenerateThumbnailArgs {
  fn from(value: config::Thumbnails) -> Self {
    Self {
      quality: value.quality,
      cover_quality: value.cover_quality,
      speed: value.speed,
      cover_speed: value.cover_speed,
      width: value.width,
      cover_width: value.cover_width,
      regenerate: false,
    }
  }
}

pub struct ZipFile {
  filename: String,
  contents: Vec<u8>,
}

#[derive(PartialEq, Eq)]
pub enum TagType {
  Artist,
  Circle,
  Magazine,
  Parody,
  Tag,
}

impl TagType {
  pub fn table(&self) -> String {
    match self {
      TagType::Artist => "artists".to_string(),
      TagType::Circle => "circles".to_string(),
      TagType::Magazine => "magazines".to_string(),
      TagType::Parody => "parodies".to_string(),
      TagType::Tag => "tags".to_string(),
    }
  }

  pub fn id(&self) -> String {
    match self {
      TagType::Artist => "artist_id".to_string(),
      TagType::Circle => "circle_id".to_string(),
      TagType::Magazine => "magazine_id".to_string(),
      TagType::Parody => "parody_id".to_string(),
      TagType::Tag => "tag_id".to_string(),
    }
  }

  pub fn relation(&self) -> String {
    match self {
      TagType::Artist => "archive_artists".to_string(),
      TagType::Circle => "archive_circles".to_string(),
      TagType::Magazine => "archive_magazines".to_string(),
      TagType::Parody => "archive_parodies".to_string(),
      TagType::Tag => "archive_tags".to_string(),
    }
  }
}

#[derive(sqlx::FromRow)]
struct Tag {
  id: i64,
  slug: String,
}

pub struct ZipArchiveData {
  pub file: ZipArchive<Cursor<Vec<u8>>>,
  pub hash: String,
  pub size: usize,
}

pub fn read_zip(path: &impl AsRef<Path>) -> anyhow::Result<ZipArchiveData> {
  let file_contents = fs::read(path)?;
  let size = file_contents.len();

  let mut cursor = Cursor::new(file_contents);

  let digest = utils::sha256_digest(&mut cursor)?;
  let hash = HEXUPPER.encode(digest.as_ref());

  cursor.set_position(0);

  let file = ZipArchive::new(cursor)?;

  Ok(ZipArchiveData { file, hash, size })
}

async fn insert_tag_type(
  transaction: &mut Transaction<'_, Postgres>,
  tag_type: TagType,
  tags: &[String],
  archive_id: i64,
) -> Result<(), sqlx::Error> {
  let mut tags = tags
    .iter()
    .map(|tag| (tag.clone(), slugify(tag)))
    .collect_vec();

  let rows = QueryBuilder::new("SELECT id, slug FROM ")
    .push(tag_type.table())
    .push(" WHERE slug = ANY(")
    .push_bind(tags.iter().map(|tag| tag.1.clone()).collect_vec())
    .push(")")
    .build_query_as::<Tag>()
    .fetch_all(&mut **transaction)
    .await?;

  let mut tag_ids: Vec<i64> = Vec::new();
  tag_ids.append(&mut rows.iter().map(|tag| tag.id).collect_vec());
  tags.retain(|tag| !rows.iter().any(|it| it.slug.eq(&tag.1)));

  if !tags.is_empty() {
    let ids = QueryBuilder::new("INSERT INTO ")
      .push(tag_type.table())
      .push(" (name, slug) SELECT * FROM UNNEST(")
      .push_bind(tags.iter().map(|tag| tag.0.clone()).collect_vec())
      .push("::text[], ")
      .push_bind(tags.iter().map(|tag| tag.1.clone()).collect_vec())
      .push("::text[]) RETURNING id")
      .build_query_scalar::<i64>()
      .fetch_all(&mut **transaction)
      .await?;

    tag_ids.append(&mut ids.iter().copied().collect_vec());
  }

  QueryBuilder::new("INSERT INTO ")
    .push(tag_type.relation())
    .push(" (archive_id, ")
    .push(tag_type.id())
    .push(") SELECT * FROM UNNEST(")
    .push_bind(vec![archive_id; tag_ids.len()])
    .push("::bigint[], ")
    .push_bind(tag_ids)
    .push("::bigint[])")
    .build()
    .execute(&mut **transaction)
    .await?;

  Ok(())
}

async fn insert_sources(
  transaction: &mut Transaction<'_, Postgres>,
  sources: &[String],
  archive_id: i64,
) -> Result<(), sqlx::Error> {
  let sources = sources
    .iter()
    .map(|str| {
      (
        utils::parse_source_name(str),
        url::Url::parse(str).map(|url| url.to_string()).ok(),
      )
    })
    .collect_vec();

  for (name, url) in sources {
    sqlx::query!(
      r#"INSERT INTO archive_sources (archive_id, name, url) VALUES ($1, $2, $3)"#,
      archive_id,
      name,
      url
    )
    .execute(&mut **transaction)
    .await?;
  }

  Ok(())
}

async fn insert_archive(
  transaction: &mut Transaction<'_, Postgres>,
  multi: &MultiProgress,
  data: &InsertArchive,
) -> anyhow::Result<(i64, bool)> {
  let InsertArchive {
    id: _,
    slug,
    title,
    path,
    hash,
    pages,
    size,
    thumbnail,
    artists,
    circles,
    magazines,
    parodies,
    tags,
    sources,
  } = data;

  let rec = sqlx::query!(
    r#"SELECT id, slug, title FROM archives WHERE hash = $1"#,
    hash
  )
  .fetch_optional(&mut **transaction)
  .await?;

  let (id, new) = if let Some(rec) = rec {
    // TODO: Update relations
    multi.suspend(|| info!(target: "archive::index", "Matching hash archive found. Updating archive with ID {}: {path}", rec.id));

    let slug_exists = sqlx::query_scalar!(
      r#"SELECT EXISTS(SELECT 1 FROM archives WHERE slug = $1)"#,
      slug
    )
    .fetch_one(&mut **transaction)
    .await?;

    if !slug_exists.unwrap() {
      sqlx::query!(
      r#"UPDATE archives SET slug = $2, title = $3, path = $4, pages = $5, size = $6, thumbnail = $7, updated_at = NOW() WHERE id = $1"#,
      rec.id, slug, title, path, pages, size, thumbnail
    )
    .execute(&mut **transaction)
    .await?;
    } else if *title == rec.title {
      sqlx::query!(
        r#"UPDATE archives SET title = $2, path = $3, pages = $4, size = $5, thumbnail = $6, updated_at = NOW() WHERE id = $1"#,
        rec.id, title, path, pages, size, thumbnail
      ).execute(&mut **transaction).await?;
    } else {
      let slug = format!(
        "{slug}-{}",
        SystemTime::now()
          .duration_since(UNIX_EPOCH)
          .unwrap()
          .as_secs()
      );
      sqlx::query!(
        r#"UPDATE archives SET slug = $2, title = $3, path = $4, pages = $5, size = $6, thumbnail = $7, updated_at = NOW() WHERE id = $1"#,
        rec.id, slug, title ,path, pages, size, thumbnail
      ).execute(&mut **transaction).await?;
    }

    (rec.id, false)
  } else {
    let count = sqlx::query_scalar!(r#"SELECT COUNT(*) FROM archives WHERE slug = $1"#, slug)
      .fetch_one(&mut **transaction)
      .await?
      .unwrap();

    let slug = if count > 0 {
      format!(
        "{slug}-{}",
        SystemTime::now()
          .duration_since(UNIX_EPOCH)
          .unwrap()
          .as_secs()
      )
    } else {
      slug.to_string()
    };

    let rec = sqlx::query!(
      r#"INSERT INTO archives (slug, title, path, thumbnail, hash, pages, size)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id"#,
      slug,
      title,
      path,
      thumbnail,
      hash,
      pages,
      size
    )
    .fetch_one(&mut **transaction)
    .await?;

    let archive_id = rec.id;

    insert_tag_type(transaction, TagType::Artist, artists, archive_id).await?;
    insert_tag_type(transaction, TagType::Circle, circles, archive_id).await?;
    insert_tag_type(transaction, TagType::Magazine, magazines, archive_id).await?;
    insert_tag_type(transaction, TagType::Parody, parodies, archive_id).await?;
    insert_tag_type(transaction, TagType::Tag, tags, archive_id).await?;
    insert_sources(transaction, sources, archive_id).await?;

    (archive_id, true)
  };

  #[cfg(unix)]
  if let Err(err) = os::unix::fs::symlink(path, CONFIG.directories.links.join(id.to_string())) {
    match err.kind() {
      std::io::ErrorKind::AlreadyExists => {
        if fs::remove_file(CONFIG.directories.links.join(id.to_string())).is_ok() {
          if let Err(err) =
            os::unix::fs::symlink(path, CONFIG.directories.links.join(id.to_string()))
          {
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
  if let Err(err) =
    os::windows::fs::symlink_file(path.clone(), CONFIG.directories.links.join(id.to_string()))
  {
    match err.kind() {
      std::io::ErrorKind::AlreadyExists => {
        if fs::remove_file(CONFIG.directories.links.join(id.to_string())).is_ok() {
          if let Err(err) =
            os::unix::fs::symlink(path, CONFIG.directories.links.join(id.to_string()))
          {
            return Err(anyhow!("Couldn't create a symbolic link: {err}"));
          }
        }
      }
      _ => {
        return Err(anyhow!("Couldn't create a symbolic link: {err}"));
      }
    }
  }

  Ok((id, new))
}

pub async fn index_archive(
  pool: &PgPool,
  multi: &MultiProgress,
  opts: IndexArgs,
) -> anyhow::Result<()> {
  if !opts.reindex {
    let rec = sqlx::query_scalar!(
      r#"SELECT COUNT(*) AS count FROM archives WHERE path = $1"#,
      opts.path.to_string()
    )
    .fetch_one(pool)
    .await?;

    let count = rec.unwrap();

    if count > 0 {
      return Ok(());
    }
  }

  let mut zip = read_zip(&opts.path)?;

  let mut archive = InsertArchive {
    path: opts.path.to_string(),
    hash: zip.hash,
    size: zip.size.as_i64(),
    ..Default::default()
  };

  let mut files: Vec<ZipFile> = vec![];

  for i in 0..zip.file.len() {
    let mut file = zip.file.by_index(i)?;
    let mut buf = vec![];
    file.read_to_end(&mut buf)?;
    files.push(ZipFile {
      filename: file.enclosed_name().unwrap().to_string(),
      contents: buf,
    });
  }

  add_metadata(&mut zip.file, &mut archive);

  if archive.title.is_empty() {
    let (title, artists, circles) =
      utils::parse_filename(opts.path.file_stem().unwrap().to_str().unwrap());

    archive.slug = slugify(&title);
    archive.title = title;
    archive.artists = artists;
    archive.circles = circles;
  }

  if archive.title.is_empty() {
    return Err(anyhow!("Couldn't get a title for the archive"));
  }

  let mut image_files = get_image_files(&mut zip.file)?;
  archive.pages = i16::try_from(image_files.len()).unwrap();

  let mut transaction = pool.begin().await?;
  let (id, new) = insert_archive(&mut transaction, multi, &archive).await?;

  archive.id = id;

  calculate_dimensions(&mut transaction, multi, false, &mut image_files, archive.id).await?;

  transaction.commit().await?;

  if new {
    multi.suspend(|| {
      info!(
        target: "archive::index",
        "New archive saved in the database with ID {}: '{}'",
        archive.id,
        opts.path.display()
      )
    });
  }

  if !opts.skip_thumbnails {
    generate_thumbnails(
      &GenerateThumbnailArgs::from(CONFIG.thumbnails),
      multi,
      &mut image_files,
      archive.id,
      archive.thumbnail.as_usize(),
    )?;
  }

  Ok(())
}

pub fn get_image_files(zip: &mut ZipArchive<Cursor<Vec<u8>>>) -> anyhow::Result<Vec<ZipFile>> {
  let mut files: Vec<ZipFile> = vec![];

  for i in 0..zip.len() {
    let mut file = zip.by_index(i)?;
    let filename = file.enclosed_name().unwrap().to_string();

    if !utils::is_image(&filename) {
      continue;
    }

    let mut buf = vec![];
    file.read_to_end(&mut buf)?;
    files.push(ZipFile {
      filename,
      contents: buf,
    });
  }

  let mut filenames: Vec<&str> = files.iter().map(|s| s.filename.as_str()).collect_vec();
  let filenames = filenames.as_mut_slice();
  human_sort::sort(filenames);

  let files_lookup: HashMap<_, _> = filenames
    .iter_mut()
    .enumerate()
    .map(|(index, filename)| (filename.to_string(), index))
    .collect();

  files.sort_by(|a, b| {
    let a_order = files_lookup.get(&a.filename).unwrap();
    let b_order = files_lookup.get(&b.filename).unwrap();
    a_order.cmp(b_order)
  });

  Ok(files)
}

async fn calculate_dimensions(
  conn: &mut PgConnection,
  multi: &MultiProgress,
  recalcualte: bool,
  files: &mut [ZipFile],
  archive_id: i64,
) -> anyhow::Result<()> {
  let existing_dimensions = sqlx::query_scalar!(
    r#"SELECT page_number FROM archive_images WHERE archive_id = $1"#,
    archive_id
  )
  .fetch_all(&mut *conn)
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

  let pb = ProgressBar::new(file_idx.len().as_u64());
  pb.set_style(
    ProgressStyle::with_template("[{elapsed_precise}] {bar:40} {pos:>7}/{len:7}").unwrap(),
  );
  multi.add(pb.clone());

  let dimensions = file_idx
    .into_par_iter()
    .filter_map(|i| {
      let page = i + 1;
      let file = &files[i];

      let result = (|| -> anyhow::Result<(usize, &String, u32, u32)> {
        let cursor = Cursor::new(&file.contents);
        let img = image::io::Reader::new(cursor)
          .with_guessed_format()?
          .decode()?;

        Ok((page, &file.filename, img.width(), img.height()))
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
  .execute(&mut *conn)
  .await?;

  pb.finish_and_clear();

  multi.suspend(|| info!(target: "archive::calculate_dimensions", "Calculated image dimmensions for archive ID '{}'", archive_id));

  Ok(())
}

pub fn generate_thumbnails(
  args: &GenerateThumbnailArgs,
  multi: &MultiProgress,
  files: &mut [ZipFile],
  archive_id: i64,
  thumbnail: usize,
) -> anyhow::Result<()> {
  let archive_thumb_dir = CONFIG.directories.thumbs.join(format!("{}", archive_id));
  create_dir_all(&archive_thumb_dir)?;

  let walker = globwalk::glob(format!("{}/*.t.avif", archive_thumb_dir.to_string())).unwrap();
  let existing_thumbnails = walker
    .map(|entry| entry.unwrap().path().to_string())
    .collect_vec();

  let cover_name = format!("{}.c.avif", utils::leading_zeros(thumbnail, files.len()));

  if !args.regenerate
    && (existing_thumbnails.len()) == files.len()
    && archive_thumb_dir.join(&cover_name).exists()
  {
    return Ok(());
  }

  let opts = utils::ImageEncodeOpts {
    width: args.width,
    quality: args.quality,
    speed: args.speed,
  };

  let cover_opts = utils::ImageEncodeOpts {
    width: args.cover_width,
    quality: args.cover_quality,
    speed: args.cover_speed,
  };

  let mut file_idx = files.iter().enumerate().map(|(i, _)| i).collect_vec();

  if !args.regenerate {
    file_idx.retain(|i| {
      existing_thumbnails
        .iter()
        .all(|name: &String| utils::get_digits(name) != i + 1)
    });
  }

  let pb = ProgressBar::new(file_idx.len().as_u64());
  pb.set_style(
    ProgressStyle::with_template("[{elapsed_precise}] {bar:40} {pos:>7}/{len:7}").unwrap(),
  );
  multi.add(pb.clone());

  let encode_cover = |buf: &Vec<u8>, name: String| {
    let encoded = utils::encode_image(buf, cover_opts).unwrap();

    match fs::write(archive_thumb_dir.join(&cover_name), encoded) {
      Ok(_) => {}
      Err(err) => multi.suspend(|| {
        error!(
          target: "archive::generate_thumbnails",
          "Failed to generate cover '{}' for archive ID '{}': {err}",
          name, archive_id
        )
      }),
    }

    Ok::<_, anyhow::Error>(())
  };

  file_idx.into_par_iter().for_each(|i| {
    let page = i + 1;

    let name = format!("{}.t.avif", utils::leading_zeros(page, files.len()));

    _ = (|| -> anyhow::Result<()> {
      if !args.regenerate && existing_thumbnails.contains(&name) {
        if page == thumbnail.as_usize() && !Path::new(&cover_name).exists() {
          let _ = encode_cover(&files[i].contents, name);
        }

        return Ok(());
      }

      let encoded = utils::encode_image(&files[i].contents, opts).unwrap();

      match fs::write(archive_thumb_dir.join(&name), encoded) {
        Ok(_) => {}
        Err(err) => multi.suspend(|| {
          error!(
            target: "archive::generate_thumbnails",
            "Failed to generate thumbnail '{}' for archive ID '{}': {err}",
            name, archive_id
          )
        }),
      }

      if page == thumbnail.as_usize()
        && (args.regenerate || !archive_thumb_dir.join(&cover_name).exists())
      {
        encode_cover(&files[i].contents, name).unwrap();
      }

      pb.inc(1);

      Ok(())
    })();
  });

  pb.finish_and_clear();

  multi.suspend(|| info!(target: "archive::generate_thumbnails", "Generated thumbnails for archive ID '{}'", archive_id));

  Ok(())
}
