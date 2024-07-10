pub mod metadata;
pub mod query;

use crate::{
  config::CONFIG,
  utils::{self, ToStringExt},
};
use chrono::NaiveDateTime;
use clap::Args;
use data_encoding::HEXLOWER;
use file_format::FileFormat;
use itertools::Itertools;
use poem_openapi::Object;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use slug::slugify;
use sqlx::{types::Json, PgPool, Postgres, QueryBuilder, Transaction};
use std::{
  fs::{self, File},
  io::{self, Cursor, Read, Seek, SeekFrom},
  path::{Path, PathBuf},
  time::Instant,
};
use thiserror::Error;

pub type ZipArchive = zip::ZipArchive<Cursor<Vec<u8>>>;

#[derive(sqlx::FromRow, Debug)]
struct Archive {
  pub id: i64,
  pub title: String,
  pub description: Option<String>,
  pub path: String,
  pub key: String,
  pub pages: Option<i16>,
  pub size: Option<i64>,
  pub thumbnail: i16,
  pub language: Option<String>,
  pub has_metadata: bool,
  pub created_at: NaiveDateTime,
  pub updated_at: NaiveDateTime,
  pub deleted_at: Option<NaiveDateTime>,
  pub released_at: Option<NaiveDateTime>,
}

#[derive(Object, Deserialize, Debug)]
pub struct Taxonomy {
  pub name: String,
  pub slug: String,
}

#[derive(Object, Deserialize, Debug)]
pub struct Tag {
  pub name: String,
  pub slug: String,
  pub namespace: String,
}

#[derive(Object, Deserialize, Debug)]
pub struct Source {
  pub name: String,
  pub url: Option<String>,
}

#[derive(Object, Deserialize, Default, Debug)]
pub struct Image {
  pub filename: String,
  pub page_number: i16,
  pub width: Option<i16>,
  pub height: Option<i16>,
}

#[derive(Object, Debug)]
pub struct ArchiveWithMetadata {
  pub id: i64,
  pub title: String,
  pub description: Option<String>,
  pub path: String,
  pub key: String,
  pub pages: Option<i16>,
  pub size: Option<i64>,
  pub thumbnail: i16,
  pub language: Option<String>,
  pub has_metadata: bool,
  pub created_at: NaiveDateTime,
  pub updated_at: NaiveDateTime,
  pub deleted_at: Option<NaiveDateTime>,
  pub released_at: Option<NaiveDateTime>,
  pub artists: Vec<Taxonomy>,
  pub circles: Vec<Taxonomy>,
  pub magazines: Vec<Taxonomy>,
  pub events: Vec<Taxonomy>,
  pub publishers: Vec<Taxonomy>,
  pub parodies: Vec<Taxonomy>,
  pub tags: Vec<Tag>,
  pub sources: Vec<Source>,
  pub images: Vec<Image>,
}

#[derive(Object, Debug)]
pub struct ArchiveLibrary {
  pub id: i64,
  pub title: String,
  pub path: String,
  pub key: String,
  pub pages: Option<i16>,
  pub thumbnail: i16,
  pub thumbnail_image: Option<Image>,
  pub artists: Vec<Taxonomy>,
  pub circles: Vec<Taxonomy>,
  pub magazines: Vec<Taxonomy>,
  pub events: Vec<Taxonomy>,
  pub publishers: Vec<Taxonomy>,
  pub parodies: Vec<Taxonomy>,
  pub tags: Vec<Tag>,
}

impl From<ArchiveLibraryEntry> for ArchiveLibrary {
  fn from(entry: ArchiveLibraryEntry) -> Self {
    Self {
      id: entry.id,
      title: entry.title,
      path: entry.path,
      key: entry.key,
      pages: entry.pages,
      thumbnail: entry.thumbnail,
      thumbnail_image: entry.thumbnail_image.map(|image| image.0),
      artists: entry.artists.0,
      circles: entry.circles.0,
      magazines: entry.magazines.0,
      events: entry.events.0,
      publishers: entry.publishers.0,
      parodies: entry.parodies.0,
      tags: entry.tags.0,
    }
  }
}

#[derive(sqlx::FromRow, Debug)]
pub struct ArchiveLibraryEntry {
  pub id: i64,
  pub title: String,
  pub path: String,
  pub key: String,
  pub pages: Option<i16>,
  pub thumbnail: i16,
  pub thumbnail_image: Option<Json<Image>>,
  pub artists: Json<Vec<Taxonomy>>,
  pub circles: Json<Vec<Taxonomy>>,
  pub magazines: Json<Vec<Taxonomy>>,
  pub events: Json<Vec<Taxonomy>>,
  pub publishers: Json<Vec<Taxonomy>>,
  pub parodies: Json<Vec<Taxonomy>>,
  pub tags: Json<Vec<Tag>>,
}

#[derive(PartialEq, Eq, Debug)]
pub enum TagType {
  Artist,
  Circle,
  Magazine,
  Event,
  Publisher,
  Parody,
  Tag,
}

impl TagType {
  pub fn table(&self) -> String {
    match self {
      TagType::Artist => "artists".to_string(),
      TagType::Circle => "circles".to_string(),
      TagType::Magazine => "magazines".to_string(),
      TagType::Event => "events".to_string(),
      TagType::Publisher => "publishers".to_string(),
      TagType::Parody => "parodies".to_string(),
      TagType::Tag => "tags".to_string(),
    }
  }

  pub fn id(&self) -> String {
    match self {
      TagType::Artist => "artist_id".to_string(),
      TagType::Circle => "circle_id".to_string(),
      TagType::Magazine => "magazine_id".to_string(),
      TagType::Event => "event_id".to_string(),
      TagType::Publisher => "publisher_id".to_string(),
      TagType::Parody => "parody_id".to_string(),
      TagType::Tag => "tag_id".to_string(),
    }
  }

  pub fn relation(&self) -> String {
    match self {
      TagType::Artist => "archive_artists".to_string(),
      TagType::Circle => "archive_circles".to_string(),
      TagType::Magazine => "archive_magazines".to_string(),
      TagType::Event => "archive_events".to_string(),
      TagType::Publisher => "archive_publishers".to_string(),
      TagType::Parody => "archive_parodies".to_string(),
      TagType::Tag => "archive_tags".to_string(),
    }
  }
}

#[derive(Debug)]
struct Relations {
  pub artists: Option<Vec<String>>,
  pub circles: Option<Vec<String>>,
  pub magazines: Option<Vec<String>>,
  pub events: Option<Vec<String>>,
  pub publishers: Option<Vec<String>>,
  pub parodies: Option<Vec<String>>,
  pub tags: Option<Vec<(String, String)>>,
  pub sources: Option<Vec<Source>>,
  pub images: Option<Vec<Image>>,
}

#[derive(Args, Clone, Default)]
pub struct IndexArgs {
  pub paths: Option<Vec<PathBuf>>,
  #[arg(
    long,
    default_value = "false",
    help = "Reindex and update existing archives"
  )]
  pub reindex: bool,
  #[arg(long, default_value = "false", help = "Calculate image dimensions")]
  pub dimensions: bool,
  #[arg(long, default_value = "false", help = "Generate thumbnails")]
  pub thumbnails: bool,
  #[arg(
    long,
    help = "Start re-indexing from this path. Useful for resuming after an error."
  )]
  pub from_path: Option<PathBuf>,
  #[arg(
    long,
    help = "Copy files not present in the content folder during migration."
  )]
  pub copy: bool,
}

#[derive(Debug, Error)]
pub enum ArchiveError {
  #[error(transparent)]
  DatabaseError(#[from] sqlx::Error),
  #[error(transparent)]
  IoError(#[from] io::Error),
  #[error("Archive located in '{1}' already exists")]
  AlreadyExists(i64, PathBuf),
  #[error("'{0}' is not a valid ZIP archive")]
  NotZipArchive(PathBuf),
  #[error("Archive file not found")]
  NotFound(i64),
  #[error("Archive not located in the content directory")]
  NotInContent(i64),
  #[error(transparent)]
  ZipError(#[from] zip::result::ZipError),
}

async fn index_archive(
  path: &Path,
  relative_path: &Path,
  reindex: bool,
  pool: &PgPool,
) -> Result<(i64, bool), ArchiveError> {
  let relative_path = relative_path.to_string();

  let mut file = File::open(path)?;

  let length = 1000;
  file.seek(SeekFrom::Start(0))?;
  let mut chunk = file.take(length);
  let mut bytes = vec![];
  chunk.read_to_end(&mut bytes)?;

  let format = FileFormat::from_bytes(&bytes);

  if format != FileFormat::Zip {
    return Err(ArchiveError::NotZipArchive(path.to_path_buf()));
  }

  let mut hasher = Sha256::new();
  hasher.update(&bytes);
  let result = hasher.finalize();
  let key = HEXLOWER.encode(&result)[..10].to_string();

  if !reindex {
    if let Some(id) = sqlx::query_scalar!(
      r#"SELECT id FROM archives WHERE path = $1 OR key = $2"#,
      relative_path,
      key
    )
    .fetch_optional(pool)
    .await?
    {
      return Err(ArchiveError::AlreadyExists(id, path.to_path_buf()));
    }
  }

  let mut transaction = pool.begin().await?;

  let mut is_new = false;

  let existing_archive = sqlx::query!(
    r#"SELECT id, key, path, has_metadata FROM archives WHERE key = $1 OR path = $2 AND deleted_at IS NULL"#,
    key,
    relative_path
  )
  .fetch_optional(&mut *transaction)
  .await?;

  let id = if let Some(archive) = existing_archive {
    if relative_path != archive.path {
      let old_filestem = Path::new(&archive.path)
        .file_stem()
        .expect("Failed to get filestem")
        .to_string();
      let new_filestem = path
        .file_stem()
        .expect("Failed to get filestem")
        .to_string();

      let mut qb = QueryBuilder::new("UPDATE ARCHIVES SET path = ");

      qb.push_bind(relative_path);

      if !archive.has_metadata && old_filestem != new_filestem {
        let title = if CONFIG.metadata.parse_filename_title {
          utils::parse_filename(&new_filestem)
            .0
            .unwrap_or(new_filestem)
        } else {
          new_filestem
        };

        qb.push(", title = ").push_bind(title.clone());
      }

      qb.push(", updated_at = NOW() WHERE id = ")
        .push_bind(archive.id)
        .push(" RETURNING id");

      qb.build_query_scalar().fetch_one(&mut *transaction).await?
    } else if key != archive.key {
      let existing_archive = sqlx::query_scalar!("SELECT id FROM archives WHERE key = $1", key)
        .fetch_optional(&mut *transaction)
        .await?;

      if let Some(id) = existing_archive {
        sqlx::query!(
          r#"UPDATE archives SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1"#,
          archive.id
        )
        .execute(&mut *transaction)
        .await?;
        sqlx::query!(
          r#"UPDATE archives SET deleted_at = NULL, updated_at = NOW() WHERE id = $1"#,
          id
        )
        .execute(&mut *transaction)
        .await?;

        id
      } else {
        sqlx::query!(
          r#"UPDATE archives SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1"#,
          archive.id
        )
        .execute(&mut *transaction)
        .await?;

        let data = sqlx::query!(
          r#"SELECT title, description, path, pages, size,
          thumbnail, language, released_at, has_metadata
          FROM archives WHERE id = $1"#,
          archive.id
        )
        .fetch_one(&mut *transaction)
        .await?;

        is_new = true;

        sqlx::query_scalar!(
          r#"INSERT INTO archives (
            key, title, description, path, pages, size,
            thumbnail, language, released_at, has_metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id"#,
          key,
          data.title,
          data.description,
          data.path,
          data.pages,
          data.size,
          data.thumbnail,
          data.language,
          data.released_at,
          data.has_metadata
        )
        .fetch_one(&mut *transaction)
        .await?
      }
    } else {
      archive.id
    }
  } else {
    let filestem = path
      .file_stem()
      .expect("Failed to get filestem")
      .to_string();

    let title = if CONFIG.metadata.parse_filename_title {
      utils::parse_filename(&filestem).0.unwrap_or(filestem)
    } else {
      filestem
    };

    is_new = true;

    sqlx::query_scalar!(
      r#"INSERT INTO archives (key, title, path) VALUES ($1, $2, $3) RETURNING id"#,
      key,
      title,
      relative_path
    )
    .fetch_one(&mut *transaction)
    .await?
  };

  transaction.commit().await?;

  Ok((id, is_new))
}

async fn migrate(
  id: i64,
  path: &str,
  content_dir: &PathBuf,
  pool: &PgPool,
) -> Result<(i64, String), ArchiveError> {
  let path = Path::new(&path);
  let relative_path = path
    .strip_prefix(content_dir)
    .map(|p| p.to_string())
    .map_err(|_| ArchiveError::NotInContent(id))?;

  match File::open(path) {
    Ok(mut file) => {
      let length = 1000;
      file.seek(SeekFrom::Start(0))?;
      let mut chunk = file.take(length);
      let mut bytes = vec![];
      chunk.read_to_end(&mut bytes)?;

      let mut hasher = Sha256::new();
      hasher.update(&bytes);
      let result = hasher.finalize();
      let key = HEXLOWER.encode(&result)[..10].to_string();

      let mut transaction = pool.begin().await?;

      let existing_archive = sqlx::query!(r#"SELECT id FROM archives WHERE key = $1"#, key)
        .fetch_optional(&mut *transaction)
        .await?;

      if existing_archive.is_some() {
        tracing::warn!(
          "There is another archive with the same key. Unpublishing archive with ID {id}."
        );

        sqlx::query!(
          r#"UPDATE archives SET path = $2, deleted_at = NOW(), updated_at = NOW() WHERE id = $1"#,
          id,
          relative_path
        )
        .execute(&mut *transaction)
        .await?;
      } else {
        sqlx::query!(
          r#"UPDATE archives SET path = $2, key = $3, updated_at = NOW() WHERE id = $1"#,
          id,
          relative_path,
          key
        )
        .execute(&mut *transaction)
        .await?;
      }

      transaction.commit().await?;

      Ok((id, relative_path))
    }
    Err(err) => match err.kind() {
      io::ErrorKind::NotFound => Err(ArchiveError::NotFound(id))?,
      _ => Err(err)?,
    },
  }
}

async fn check_old(copy: bool, pool: &PgPool) -> anyhow::Result<()> {
  let content_dir = &CONFIG.directories.content;
  let legacy_archives = sqlx::query!(
    r#"SELECT id, path, key FROM archives WHERE LENGTH(key) = 8 AND deleted_at IS NULL"#
  )
  .fetch_all(pool)
  .await?;

  if legacy_archives.is_empty() {
    return Ok(());
  }

  tracing::info!("Migrating {} archive(s)", legacy_archives.len());

  let mut count = 0;

  for archive in legacy_archives {
    match migrate(archive.id, &archive.path, content_dir, pool).await {
      Ok((id, path)) => {
        tracing::info!("Migrated archive ID {id} - {path}");
        count += 1;
      }
      Err(err) => match err {
        ArchiveError::NotFound(id) => {
          tracing::warn!("Archive file not found. Unpublishing archive with ID {id}.",);

          sqlx::query!(
            r#"UPDATE archives SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1"#,
            id
          )
          .execute(pool)
          .await?;
        }
        ArchiveError::NotInContent(id) => {
          if copy {
            let old_path = Path::new(&archive.path);
            let new_path = content_dir
              .join("_MIGRATED")
              .join(format!("{}", old_path.file_name().unwrap().to_string()));
            match fs::copy(&old_path, &new_path) {
              Ok(_) => {
                sqlx::query!(
                  "UPDATE archives SET path = $2, updated_at = NOW() WHERE id = $1",
                  archive.id,
                  new_path.to_string()
                )
                .execute(pool)
                .await?;

                migrate(archive.id, &new_path.to_string(), content_dir, pool).await?;
              }
              Err(err) => {
                tracing::error!(
                  "Failed to copy path {} to {}: {err}",
                  old_path.to_string(),
                  new_path.to_string()
                )
              }
            }
          } else {
            tracing::warn!("Can't migrate archive with ID {id} as is not located in the configured content directory.")
          }
        }
        _ => tracing::error!("Failed to migrate archive ID {}: {err}", archive.id),
      },
    };
  }

  if count == 0 {
    tracing::info!("No archives were migrated")
  } else {
    tracing::info!("Migrated {count} archive(s)")
  }

  Ok(())
}

pub fn get_image_filenames(zip: &mut ZipArchive) -> Result<Vec<String>, ArchiveError> {
  let mut filenames = vec![];

  for i in 0..zip.len() {
    let file = zip.by_index(i)?;
    let filename = file.enclosed_name().unwrap().to_string();

    if !utils::is_image(&filename) {
      continue;
    }

    filenames.push(filename);
  }

  filenames.sort_by(|a, b| natord::compare(a, b));

  Ok(filenames)
}

fn get_archive_images(zip: &mut ZipArchive) -> Result<Vec<Image>, ArchiveError> {
  Ok(
    get_image_filenames(zip)?
      .into_iter()
      .enumerate()
      .map(|(i, filename)| Image {
        filename,
        page_number: (i + 1) as i16,
        ..Default::default()
      })
      .collect(),
  )
}

async fn upsert_taxonomy(
  tags: Vec<String>,
  r#type: TagType,
  archive_id: i64,
  transaction: &mut Transaction<'_, Postgres>,
) -> Result<(), sqlx::Error> {
  let tags = tags
    .into_iter()
    .filter(|tag| !tag.trim().is_empty())
    .map(|tag| tag.trim().to_string())
    .collect_vec();

  #[derive(sqlx::FromRow, Debug)]
  struct TaxonomyRow {
    id: i64,
    slug: String,
  }

  #[derive(sqlx::FromRow, Debug)]
  struct RelationRow {
    taxonomy_id: i64,
    slug: String,
  }

  let archive_tags = tags
    .into_iter()
    .map(|name| Taxonomy {
      slug: slugify(&name),
      name,
    })
    .collect_vec();

  let table = r#type.table();
  let relation_name = r#type.relation();
  let relation_id = r#type.id();

  let mut tags: Vec<TaxonomyRow> = sqlx::query_as(&format!(
    r#"SELECT id, slug FROM {table} WHERE slug = ANY($1)"#
  ))
  .bind(
    &archive_tags
      .iter()
      .map(|tag| tag.slug.to_string())
      .collect_vec(),
  )
  .fetch_all(&mut **transaction)
  .await?;

  let tags_to_insert = archive_tags
    .iter()
    .filter(|tag| tags.iter().all(|row| row.slug != tag.slug))
    .unique_by(|tag| tag.slug.to_string())
    .collect_vec();

  let mut db_tags = vec![];
  db_tags.append(&mut tags);

  if !tags_to_insert.is_empty() {
    let mut new_tags: Vec<TaxonomyRow> = sqlx::query_as(&format!(
      r#"INSERT INTO {table} (name, slug)
      SELECT * FROM UNNEST($1::text[], $2::text[]) RETURNING id, slug"#
    ))
    .bind(
      &tags_to_insert
        .iter()
        .map(|tag| tag.name.clone())
        .collect_vec(),
    )
    .bind(
      &tags_to_insert
        .iter()
        .map(|tag| tag.slug.clone())
        .collect_vec(),
    )
    .fetch_all(&mut **transaction)
    .await?;

    db_tags.append(&mut new_tags);
  }

  let archive_tags_relation: Vec<RelationRow> = sqlx::query_as(&format!(
    r#"SELECT {relation_id} AS taxonomy_id, slug FROM {relation_name}
    INNER JOIN {table} ON id = {relation_id} WHERE archive_id = $1"#
  ))
  .bind(archive_id)
  .fetch_all(&mut **transaction)
  .await?;

  let relations_to_delete = archive_tags_relation
    .iter()
    .filter(|relation| !archive_tags.iter().any(|tag| tag.slug == relation.slug))
    .collect_vec();

  for relation in relations_to_delete {
    sqlx::query(&format!(
      r#"DELETE FROM {relation_name} WHERE archive_id = $1 AND {relation_id} = $2"#
    ))
    .bind(archive_id)
    .bind(relation.taxonomy_id)
    .execute(&mut **transaction)
    .await?;
  }

  let relations_to_insert = archive_tags
    .iter()
    .filter(|tag| {
      !archive_tags_relation
        .iter()
        .any(|relation| relation.slug == tag.slug)
    })
    .collect_vec();

  let tag_ids = relations_to_insert
    .iter()
    .map(|tag| db_tags.iter().find(|t| t.slug.eq(&tag.slug)).unwrap().id)
    .collect_vec();

  sqlx::query(&format!(
    r#"INSERT INTO {relation_name} (archive_id, {relation_id})
    SELECT * FROM UNNEST($1::bigint[], $2::bigint[])"#
  ))
  .bind(&vec![archive_id; tag_ids.len()])
  .bind(&tag_ids)
  .execute(&mut **transaction)
  .await?;

  Ok(())
}

async fn upsert_tags(
  tags: Vec<(String, String)>,
  archive_id: i64,
  transaction: &mut Transaction<'_, Postgres>,
) -> Result<(), sqlx::Error> {
  let tags = tags
    .into_iter()
    .filter(|tag| !tag.0.trim().is_empty())
    .map(|tag| (tag.0.trim().to_string(), tag.1.trim().to_string()))
    .collect_vec();

  #[derive(sqlx::FromRow, Debug)]
  struct TagRow {
    id: i64,
    slug: String,
  }

  #[derive(sqlx::FromRow, Debug)]
  struct RelationRow {
    tag_id: i64,
    slug: String,
    namespace: String,
  }

  let archive_tags = tags
    .into_iter()
    .map(|(name, namespace)| {
      let slug = slugify(&name);
      let name = utils::tag_alias(&name, &slug);
      Tag {
        slug,
        name,
        namespace,
      }
    })
    .collect_vec();

  let mut tags = sqlx::query_as!(
    TagRow,
    r#"SELECT id, slug FROM tags WHERE slug = ANY($1)"#,
    &archive_tags
      .iter()
      .map(|tag| tag.slug.to_string())
      .collect_vec()
  )
  .fetch_all(&mut **transaction)
  .await?;

  let tags_to_insert = archive_tags
    .iter()
    .filter(|tag| tags.iter().all(|row| row.slug != tag.slug))
    .unique_by(|tag| tag.slug.to_string())
    .collect_vec();

  let mut db_tags = vec![];
  db_tags.append(&mut tags);

  if !tags_to_insert.is_empty() {
    let mut new_tags = sqlx::query_as!(
      TagRow,
      r#"INSERT INTO tags (name, slug) SELECT * FROM UNNEST($1::text[], $2::text[]) RETURNING id, slug"#,
      &tags_to_insert.iter().map(|tag| tag.name.clone()).collect_vec(),
      &tags_to_insert
        .iter()
        .map(|tag| tag.slug.clone())
        .collect_vec()
    ).fetch_all(&mut **transaction).await?;

    db_tags.append(&mut new_tags);
  }

  let archive_tags_relation = sqlx::query_as!(
    RelationRow,
    r#"SELECT tag_id, slug, namespace FROM archive_tags
    INNER JOIN tags ON id = tag_id WHERE archive_id = $1"#,
    archive_id
  )
  .fetch_all(&mut **transaction)
  .await?;

  let relations_to_delete = archive_tags_relation
    .iter()
    .filter(|relation| {
      !archive_tags
        .iter()
        .any(|tag| tag.slug == relation.slug && tag.namespace == relation.namespace)
    })
    .collect_vec();

  for relation in relations_to_delete {
    sqlx::query!(
      r#"DELETE FROM archive_tags WHERE archive_id = $1 AND tag_id = $2 AND namespace = $3"#,
      archive_id,
      relation.tag_id,
      relation.namespace,
    )
    .execute(&mut **transaction)
    .await?;
  }

  let relations_to_insert = archive_tags
    .iter()
    .filter(|tag| {
      !archive_tags_relation
        .iter()
        .any(|relation| relation.slug == tag.slug && relation.namespace == tag.namespace)
    })
    .collect_vec();

  let tag_ids = relations_to_insert
    .iter()
    .map(|tag| db_tags.iter().find(|t| t.slug.eq(&tag.slug)).unwrap().id)
    .collect_vec();

  sqlx::query!(
    r#"INSERT INTO archive_tags (archive_id, tag_id, namespace) SELECT * FROM UNNEST($1::bigint[], $2::bigint[], $3::text[])"#,
    &vec![archive_id; tag_ids.len()],
    &tag_ids,
    &relations_to_insert
      .into_iter()
      .map(|tag| tag.namespace.clone())
      .collect_vec()
  ).execute(&mut **transaction).await?;

  Ok(())
}

async fn upsert_sources(
  sources: Vec<Source>,
  archive_id: i64,
  merge: bool,
  transaction: &mut Transaction<'_, Postgres>,
) -> Result<(), sqlx::Error> {
  let sources = sources
    .into_iter()
    .filter(|source| !source.name.trim().is_empty())
    .map(|source| Source {
      name: source.name.trim().to_string(),
      url: source.url,
    })
    .collect_vec();

  let existing_sources = sqlx::query_as!(
    Source,
    r#"SELECT name, url FROM archive_sources WHERE archive_id = $1"#,
    archive_id
  )
  .fetch_all(&mut **transaction)
  .await?;

  if !merge {
    let relations_to_delete = existing_sources
      .iter()
      .filter(|relation| {
        !sources
          .iter()
          .any(|source| source.name == relation.name && source.url == relation.url)
      })
      .collect_vec();

    for relation in relations_to_delete {
      sqlx::query!(
        r#"DELETE FROM archive_sources WHERE archive_id = $1 AND name = $2 AND url = $3"#,
        archive_id,
        relation.name,
        relation.url
      )
      .execute(&mut **transaction)
      .await?;
    }
  }

  let relations_to_insert = sources
    .iter()
    .filter(|source| {
      !existing_sources
        .iter()
        .any(|relation| relation.name == source.name && relation.url == source.url)
    })
    .collect_vec();

  for source in relations_to_insert {
    sqlx::query!(
      r#"INSERT INTO archive_sources (archive_id, name, url) VALUES ($1, $2, $3)
      ON CONFLICT (archive_id, name) DO UPDATE SET url = EXCLUDED.url"#,
      archive_id,
      source.name,
      source.url
    )
    .execute(&mut **transaction)
    .await?;
  }

  Ok(())
}

async fn upsert_images(
  images: Vec<Image>,
  archive_id: i64,
  transaction: &mut Transaction<'_, Postgres>,
) -> Result<(), sqlx::Error> {
  let existing_images = sqlx::query_as!(
    Image,
    r#"SELECT filename, page_number, width, height FROM archive_images WHERE archive_id = $1"#,
    archive_id
  )
  .fetch_all(&mut **transaction)
  .await?;

  let relations_to_delete = existing_images
    .iter()
    .filter(|relation| {
      !images
        .iter()
        .any(|source| source.page_number == relation.page_number)
    })
    .collect_vec();

  for relation in relations_to_delete {
    sqlx::query!(
      r#"DELETE FROM archive_images WHERE archive_id = $1 AND page_number = $2"#,
      archive_id,
      relation.page_number,
    )
    .execute(&mut **transaction)
    .await?;
  }

  for image in images {
    sqlx::query!(
      r#"INSERT INTO archive_images (archive_id, filename, page_number, width, height)
      VALUES ($1, $2, $3, $4, $5) ON CONFLICT (archive_id, page_number) DO UPDATE
      SET filename = EXCLUDED.filename, width = EXCLUDED.width, height = EXCLUDED.height"#,
      archive_id,
      image.filename,
      image.page_number,
      image.width,
      image.height
    )
    .execute(&mut **transaction)
    .await?;
  }

  Ok(())
}

async fn upsert_relations(
  data: Relations,
  archive_id: i64,
  merge_sources: bool,
  transaction: &mut Transaction<'_, Postgres>,
) -> Result<(), sqlx::Error> {
  if let Some(artists) = data.artists {
    upsert_taxonomy(artists, TagType::Artist, archive_id, transaction).await?;
  }

  if let Some(circles) = data.circles {
    upsert_taxonomy(circles, TagType::Circle, archive_id, transaction).await?;
  }

  if let Some(magazines) = data.magazines {
    upsert_taxonomy(magazines, TagType::Magazine, archive_id, transaction).await?;
  }

  if let Some(events) = data.events {
    upsert_taxonomy(events, TagType::Event, archive_id, transaction).await?;
  }

  if let Some(publishers) = data.publishers {
    upsert_taxonomy(publishers, TagType::Publisher, archive_id, transaction).await?;
  }

  if let Some(parodies) = data.parodies {
    upsert_taxonomy(parodies, TagType::Parody, archive_id, transaction).await?;
  }

  if let Some(tags) = data.tags {
    upsert_tags(tags, archive_id, transaction).await?;
  }

  if let Some(source) = data.sources {
    upsert_sources(source, archive_id, merge_sources, transaction).await?;
  }

  if let Some(images) = data.images {
    upsert_images(images, archive_id, transaction).await?;
  }

  Ok(())
}

pub async fn update_metadata(
  id: i64,
  metadata: metadata::ArchiveMetadata,
  transaction: &mut Transaction<'_, Postgres>,
) -> Result<(), ArchiveError> {
  let mut qb = QueryBuilder::new("UPDATE archives SET");
  qb.push(" title = ").push_bind(metadata.title.clone());
  qb.push(", description = ")
    .push_bind(metadata.description.clone());
  qb.push(", thumbnail = ")
    .push_bind(metadata.thumbnail.unwrap_or(1));
  qb.push(", language = ")
    .push_bind(metadata.language.clone());
  qb.push(", released_at = ").push_bind(metadata.released_at);
  qb.push(", has_metadata = true, updated_at = NOW() WHERE id =")
    .push_bind(id)
    .build()
    .execute(&mut **transaction)
    .await?;

  upsert_relations(
    Relations {
      artists: metadata.artists,
      circles: metadata.circles,
      magazines: metadata.magazines,
      events: metadata.events,
      publishers: metadata.publishers,
      parodies: metadata.parodies,
      tags: metadata.tags,
      sources: metadata.sources,
      images: metadata.images,
    },
    id,
    true,
    transaction,
  )
  .await?;

  Ok(())
}

async fn handle_metadata(
  id: i64,
  path: &Path,
  content_dir: &Path,
  pool: &PgPool,
) -> Result<(), ArchiveError> {
  let absolute_path = &content_dir.join(path);

  let file_contents = fs::read(absolute_path)?;
  let filesize = file_contents.len();

  let cursor = Cursor::new(file_contents);
  let mut zip = ZipArchive::new(cursor)?;

  let archive_images = get_archive_images(&mut zip)?;
  let pages = archive_images.len();

  let mut transaction = pool.begin().await?;

  let mut qb = QueryBuilder::new("UPDATE archives SET");

  qb.push(" size = ").push_bind(filesize as i64);
  qb.push(", pages = ").push_bind(pages as i16);

  qb.push(", updated_at = NOW() WHERE id =")
    .push_bind(id)
    .build()
    .execute(&mut *transaction)
    .await?;

  match metadata::get_metadata(&absolute_path, zip) {
    Ok(metadata) => update_metadata(id, metadata, &mut transaction).await?,
    Err(err) => tracing::error!("Failed to get metadata for archive ID {id}: {err}"),
  }

  transaction.commit().await?;

  Ok(())
}

pub async fn index(args: &IndexArgs, pool: PgPool) -> anyhow::Result<()> {
  check_old(args.copy, &pool).await?;

  let content_dir = &CONFIG.directories.content;
  let pattern = format!("{}/**/*.{{cbz,zip}}", content_dir.to_string());
  let walker = globwalk::glob(&pattern)?.flatten();

  let start = Instant::now();

  let mut ids = vec![];

  let mut can_index = args.from_path.is_none();

  for entry in walker {
    let path = entry.path();
    let relative_path = path.strip_prefix(content_dir).unwrap_or(path);

    if let Some(ref paths) = args.paths {
      if !paths
        .iter()
        .map(|path| path.strip_prefix(content_dir).unwrap_or(path))
        .any(|path| path.eq(relative_path))
      {
        continue;
      }
    }

    if let Some(ref path) = args.from_path {
      if relative_path == path {
        can_index = true;
      }
    }

    if !can_index {
      continue;
    }

    match index_archive(path, relative_path, args.reindex, &pool).await {
      Ok((id, is_new)) => {
        tracing::info!(
          "{} archive with ID {id} - '{}'",
          if is_new { "Inserted" } else { "Updated" },
          relative_path.to_string(),
        );

        ids.push(id);
      }
      Err(err) => match err {
        ArchiveError::AlreadyExists(_, _) => {}
        _ => tracing::error!(
          "Failed to index archive '{}': {err}",
          relative_path.to_string(),
        ),
      },
    }
  }

  let end = Instant::now();

  if ids.is_empty() {
    tracing::info!("No archives were indexed");

    return Ok(());
  } else {
    tracing::info!("Indexed {} archive(s) in {:?}", ids.len(), end - start)
  }

  tracing::info!("Getting metadata for indexed archive(s)");

  let archives = sqlx::query!(
    r#"SELECT id, path, key FROM archives WHERE id = ANY($1)"#,
    &ids
  )
  .fetch_all(&pool)
  .await?;

  let start = Instant::now();

  for archive in archives {
    tracing::info!("Updating metadata for archive ID {}", archive.id);

    if let Err(err) =
      handle_metadata(archive.id, Path::new(&archive.path), content_dir, &pool).await
    {
      tracing::error!(
        "Failed to update metadata for archive ID {}: {err}",
        archive.id
      )
    }
  }

  let end = Instant::now();

  tracing::info!(
    "Updated metadata for {} archive(s) in {:?}",
    ids.len(),
    end - start
  );

  Ok(())
}

pub async fn get(id: i64, pool: &PgPool) -> Result<Option<ArchiveWithMetadata>, sqlx::Error> {
  let archive = sqlx::query_as!(
    Archive,
    r#"SELECT id, title, description, path, key, pages, size, thumbnail, language, has_metadata,
    created_at, updated_at, deleted_at, released_at FROM archives WHERE id = $1"#,
    id
  )
  .fetch_one(pool)
  .await?;

  let artists = sqlx::query_as!(
    Taxonomy,
    r#"SELECT name, slug FROM artists
    JOIN archive_artists ON archive_artists.artist_id = artists.id
    WHERE archive_id = $1"#,
    id
  )
  .fetch_all(pool)
  .await?;

  let circles = sqlx::query_as!(
    Taxonomy,
    r#"SELECT name, slug FROM circles
    JOIN archive_circles ON archive_circles.circle_id = circles.id
    WHERE archive_id = $1"#,
    id
  )
  .fetch_all(pool)
  .await?;

  let magazines = sqlx::query_as!(
    Taxonomy,
    r#"SELECT name, slug FROM magazines
    JOIN archive_magazines ON archive_magazines.magazine_id = magazines.id
    WHERE archive_id = $1"#,
    id
  )
  .fetch_all(pool)
  .await?;

  let events = sqlx::query_as!(
    Taxonomy,
    r#"SELECT name, slug FROM events
    JOIN archive_events ON archive_events.event_id = events.id
    WHERE archive_id = $1"#,
    id
  )
  .fetch_all(pool)
  .await?;

  let publishers = sqlx::query_as!(
    Taxonomy,
    r#"SELECT name, slug FROM publishers
    JOIN archive_publishers ON archive_publishers.publisher_id = publishers.id
    WHERE archive_id = $1"#,
    id
  )
  .fetch_all(pool)
  .await?;

  let parodies = sqlx::query_as!(
    Taxonomy,
    r#"SELECT name, slug FROM parodies
    JOIN archive_parodies ON archive_parodies.parody_id = parodies.id
    WHERE archive_id = $1"#,
    id
  )
  .fetch_all(pool)
  .await?;

  let tags = sqlx::query_as!(
    Tag,
    r#"SELECT name, slug, namespace FROM tags
    JOIN archive_tags ON archive_tags.tag_id = tags.id
    WHERE archive_id = $1"#,
    id
  )
  .fetch_all(pool)
  .await?;

  let sources = sqlx::query_as!(
    Source,
    r#"SELECT name, url FROM archive_sources
    WHERE archive_id = $1"#,
    id
  )
  .fetch_all(pool)
  .await?;

  let images = sqlx::query_as!(
    Image,
    r#"SELECT filename, page_number, width, height FROM archive_images
    WHERE archive_id = $1"#,
    id
  )
  .fetch_all(pool)
  .await?;

  let archive = ArchiveWithMetadata {
    id: archive.id,
    title: archive.title,
    description: archive.description,
    path: archive.path,
    key: archive.key,
    pages: archive.pages,
    size: archive.size,
    thumbnail: archive.thumbnail,
    language: archive.language,
    has_metadata: archive.has_metadata,
    created_at: archive.created_at,
    updated_at: archive.updated_at,
    deleted_at: archive.deleted_at,
    released_at: archive.released_at,
    artists,
    circles,
    magazines,
    events,
    publishers,
    parodies,
    tags,
    sources,
    images,
  };

  Ok(Some(archive))
}

pub async fn get_library_archives(
  ids: Vec<i64>,
  pool: &PgPool,
) -> Result<Vec<ArchiveLibrary>, sqlx::Error> {
  let mut qb = QueryBuilder::new(
    r#"SELECT id, title, path, key, pages, thumbnail,
    (
      SELECT json_build_object(
        'filename', filename, 'page_number', page_number, 'width', width, 'height', height
      )
      FROM archive_images WHERE archive_id = id AND page_number = thumbnail
    ) thumbnail_image,"#,
  );

  for tag_type in [
    TagType::Artist,
    TagType::Circle,
    TagType::Magazine,
    TagType::Event,
    TagType::Publisher,
    TagType::Parody,
    TagType::Tag,
  ] {
    if tag_type != TagType::Tag {
      qb.push(format!(
        r#" COALESCE((SELECT json_agg(json_build_object('slug', {table}.slug, 'name', {table}.name) ORDER BY {table}.name)
        FROM {table} INNER JOIN {relation} r ON r.{id} = {table}.id
        WHERE r.archive_id = archives.id), '[]') {table}"#,
        table = tag_type.table(),
        relation = tag_type.relation(),
        id = tag_type.id()
      )).push(",");
    } else {
      qb.push(format!(
        r#" COALESCE((SELECT json_agg(json_build_object('slug', {table}.slug, 'name', {table}.name, 'namespace', r.namespace) ORDER BY {table}.name)
        FROM {table} INNER JOIN {relation} r ON r.{id} = {table}.id
        WHERE r.archive_id = archives.id), '[]') {table}"#,
        table = tag_type.table(),
        relation = tag_type.relation(),
        id = tag_type.id()
      ));
    }
  }

  qb.push(", ARRAY_POSITION(")
    .push_bind(&ids)
    .push(", id) AS ord");

  qb.push(" FROM archives WHERE id = ANY(")
    .push_bind(&ids)
    .push(") ORDER BY ord");

  println!("{}", qb.sql());

  let rows = qb
    .build_query_as::<ArchiveLibraryEntry>()
    .fetch_all(pool)
    .await?;

  let archives = rows.into_iter().map(|row| row.into()).collect();

  Ok(archives)
}
