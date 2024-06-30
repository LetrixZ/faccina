use crate::api;
use crate::config::CONFIG;
use crate::utils::tag_alias;
use crate::{
  api::{
    models::{ArchiveListItem, ImageDimensions},
    routes::SearchQuery,
  },
  utils,
};
use anyhow::anyhow;
use chrono::NaiveDateTime;
use indicatif::MultiProgress;
use itertools::Itertools;
use serde::Deserialize;
use slug::slugify;
use sqlx::Transaction;
use sqlx::{
  postgres::{PgConnectOptions, PgSslMode},
  types::Json,
  PgPool, Postgres, QueryBuilder, Row,
};
use std::collections::HashSet;
use std::ops::Mul;
use tracing::warn;

#[derive(sqlx::FromRow)]
pub struct ArchiveId {
  pub id: i64,
  pub path: String,
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

#[derive(Default)]
pub struct Archive {
  pub id: i64,
  pub slug: String,
  pub title: String,
  pub description: Option<String>,
  pub hash: String,
  pub pages: i16,
  pub size: i64,
  pub cover: Option<ImageDimensions>,
  pub thumbnail: i16,
  pub images: Vec<api::models::Image>,
  pub created_at: NaiveDateTime,
  pub released_at: NaiveDateTime,
}

#[derive(sqlx::FromRow)]
pub struct ArchiveFile {
  pub id: i64,
  pub path: String,
  pub thumbnail: i16,
}

#[derive(sqlx::FromRow, Default, Debug, Clone, Deserialize)]
pub struct ArchiveImage {
  pub filename: String,
  pub page_number: i16,
  pub width: Option<i16>,
  pub height: Option<i16>,
}

#[derive(sqlx::FromRow, Clone, Debug)]
pub struct Taxonomy {
  pub slug: String,
  pub name: String,
}

#[derive(sqlx::FromRow, Debug)]
pub struct Tag {
  pub slug: String,
  pub name: String,
  pub namespace: String,
}

#[derive(sqlx::FromRow, Debug, Clone, Deserialize)]
pub struct ArchiveSource {
  pub name: String,
  pub url: Option<String>,
}

pub struct ArchiveRelations {
  pub id: i64,
  pub title: String,
  pub slug: String,
  pub description: Option<String>,
  pub hash: String,
  pub pages: i16,
  pub size: i64,
  pub thumbnail: i16,
  pub created_at: NaiveDateTime,
  pub released_at: NaiveDateTime,
  pub artists: Vec<Taxonomy>,
  pub circles: Vec<Taxonomy>,
  pub magazines: Vec<Taxonomy>,
  pub events: Vec<Taxonomy>,
  pub publishers: Vec<Taxonomy>,
  pub parodies: Vec<Taxonomy>,
  pub tags: Vec<Tag>,
  pub sources: Vec<ArchiveSource>,
  pub images: Vec<api::models::Image>,
  pub cover: Option<ImageDimensions>,
}

impl From<Archive> for ArchiveRelations {
  fn from(
    Archive {
      id,
      slug,
      title,
      description,
      hash,
      pages,
      size,
      cover,
      thumbnail,
      images,
      created_at,
      released_at,
    }: Archive,
  ) -> Self {
    Self {
      id,
      slug,
      title,
      description,
      hash,
      pages,
      size,
      cover,
      thumbnail,
      images,
      created_at,
      released_at,
      artists: Default::default(),
      circles: Default::default(),
      magazines: Default::default(),
      events: Default::default(),
      publishers: Default::default(),
      parodies: Default::default(),
      tags: Default::default(),
      sources: Default::default(),
    }
  }
}

#[derive(Default, Debug, Clone, Deserialize)]
pub struct UpsertArchiveData {
  pub id: Option<i64>,
  pub title: Option<String>,
  pub slug: Option<String>,
  pub description: Option<String>,
  pub path: Option<String>,
  pub hash: Option<String>,
  pub pages: Option<i16>,
  pub size: Option<i64>,
  pub thumbnail: Option<i16>,
  pub language: Option<String>,
  pub released_at: Option<NaiveDateTime>,
  pub deleted_at: Option<NaiveDateTime>,
  pub has_metadata: Option<bool>,
  pub artists: Option<Vec<String>>,
  pub circles: Option<Vec<String>>,
  pub magazines: Option<Vec<String>>,
  pub events: Option<Vec<String>>,
  pub publishers: Option<Vec<String>>,
  pub parodies: Option<Vec<String>>,
  pub tags: Option<Vec<(String, String)>>,
  pub sources: Option<Vec<ArchiveSource>>,
  pub images: Option<Vec<ArchiveImage>>,
}

#[derive(Debug, Clone)]
pub struct Relations {
  pub artists: Option<Vec<String>>,
  pub circles: Option<Vec<String>>,
  pub magazines: Option<Vec<String>>,
  pub events: Option<Vec<String>>,
  pub publishers: Option<Vec<String>>,
  pub parodies: Option<Vec<String>>,
  pub tags: Option<Vec<(String, String)>>,
  pub sources: Option<Vec<ArchiveSource>>,
  pub images: Option<Vec<ArchiveImage>>,
}

pub async fn get_pool() -> anyhow::Result<PgPool> {
  let pool = PgPool::connect_with(
    PgConnectOptions::new()
      .host(&CONFIG.database.host)
      .port(CONFIG.database.port)
      .database(&CONFIG.database.name)
      .username(&CONFIG.database.user)
      .password(&CONFIG.database.pass)
      .ssl_mode(PgSslMode::Allow),
  )
  .await?;

  sqlx::migrate!("./migrations").run(&pool).await?;

  Ok(pool)
}

async fn fetch_taxonomy_data(
  pool: &PgPool,
  tag_type: TagType,
  archive_id: i64,
) -> Result<Vec<Taxonomy>, sqlx::Error> {
  QueryBuilder::<Postgres>::new(format!(
    r#"SELECT slug, name FROM {table}
      INNER JOIN {relation} ON {relation}.{id} = id
      WHERE {relation}.archive_id = "#,
    table = tag_type.table(),
    relation = tag_type.relation(),
    id = tag_type.id()
  ))
  .push_bind(archive_id)
  .push(" ORDER BY name")
  .build_query_as::<Taxonomy>()
  .fetch_all(pool)
  .await
}

async fn fetch_tag_data(pool: &PgPool, archive_id: i64) -> Result<Vec<Tag>, sqlx::Error> {
  sqlx::query_as!(
    Tag,
    r#"SELECT slug, name, namespace FROM tags INNER JOIN archive_tags ON archive_tags.tag_id = id
    WHERE archive_tags.archive_id = $1 ORDER BY name"#,
    archive_id
  )
  .fetch_all(pool)
  .await
}

pub async fn fetch_relations(
  archive_id: i64,
  pool: &PgPool,
) -> Result<
  (
    Vec<Taxonomy>,
    Vec<Taxonomy>,
    Vec<Taxonomy>,
    Vec<Taxonomy>,
    Vec<Taxonomy>,
    Vec<Taxonomy>,
    Vec<Tag>,
    Vec<ArchiveSource>,
  ),
  sqlx::Error,
> {
  let artists = fetch_taxonomy_data(pool, TagType::Artist, archive_id).await?;
  let circles = fetch_taxonomy_data(pool, TagType::Circle, archive_id).await?;
  let magazines = fetch_taxonomy_data(pool, TagType::Magazine, archive_id).await?;
  let events = fetch_taxonomy_data(pool, TagType::Event, archive_id).await?;
  let publishers = fetch_taxonomy_data(pool, TagType::Publisher, archive_id).await?;
  let parodies = fetch_taxonomy_data(pool, TagType::Parody, archive_id).await?;
  let tags = fetch_tag_data(pool, archive_id).await?;

  let sources = sqlx::query_as!(
    ArchiveSource,
    "SELECT name, url FROM archive_sources WHERE archive_id = $1 ORDER BY name ASC",
    archive_id
  )
  .fetch_all(pool)
  .await?;

  Ok((
    artists, circles, magazines, events, publishers, parodies, tags, sources,
  ))
}

pub async fn fetch_archive_data(
  pool: &PgPool,
  id: i64,
) -> Result<Option<ArchiveRelations>, sqlx::Error> {
  let row = sqlx::query!(
    r#"SELECT id, slug, title, description, hash, pages, size, thumbnail,
    (SELECT json_build_object('width', width, 'height', height) FROM archive_images WHERE archive_id = id AND page_number = archives.thumbnail) cover,
    (SELECT json_agg(image) FROM (SELECT json_build_object('filename', filename, 'page_number', page_number, 'width', width, 'height', height) AS image FROM archive_images WHERE archive_id = id ORDER BY page_number ASC) AS ordered_images) images,
    created_at, released_at FROM archives WHERE id = $1"#,
    id
  ).fetch_optional(pool).await?;

  if let Some(row) = row {
    let cover = row
      .cover
      .map(|cover: serde_json::Value| serde_json::from_value(cover).ok())
      .unwrap_or_default()
      .filter(|cover: &ImageDimensions| cover.width.is_some() || cover.height.is_some());

    let archive = Archive {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      hash: row.hash,
      pages: row.pages.unwrap_or_default(),
      size: row.size,
      thumbnail: row.thumbnail,
      cover,
      images: row
        .images
        .and_then(|images| serde_json::from_value(images).ok())
        .unwrap_or(vec![]),
      created_at: row.created_at,
      released_at: row.released_at,
    };

    let mut relations: ArchiveRelations = archive.into();

    let (artists, circles, magazines, events, publishers, parodies, tags, sources) =
      fetch_relations(relations.id, pool).await?;
    relations.artists = artists;
    relations.circles = circles;
    relations.magazines = magazines;
    relations.events = events;
    relations.publishers = publishers;
    relations.parodies = parodies;
    relations.tags = tags;
    relations.sources = sources;

    Ok(Some(relations))
  } else {
    Ok(None)
  }
}

fn parse_query(query: &str) -> String {
  if query.is_empty() {
    return "".to_string();
  }

  let parsed_query = query
    .replace('&', " ")
    .split(' ')
    .map(|s| s.split(':').last().unwrap())
    .map(|s| {
      if s.ends_with('$') {
        s.trim_end_matches('$').to_string()
      } else {
        format!("{s}:*").to_string()
      }
    })
    .map(|s| {
      if s.starts_with('-') {
        s.replacen('-', "!", 1)
      } else {
        s
      }
    })
    .collect::<Vec<_>>()
    .join("&");
  let mut parsed_query = parsed_query
    .split('|')
    .map(|s| s.to_string())
    .collect::<Vec<String>>();

  if parsed_query.len() > 1 {
    parsed_query = parsed_query
      .iter()
      .enumerate()
      .map(|(i, s)| {
        if i == 0 {
          if let Some(position) = s
            .chars()
            .collect::<Vec<_>>()
            .iter()
            .rposition(|s| *s == '&' || *s == '|')
          {
            let mut x = s.to_string();
            x.insert(position + 1, '(');
            x
          } else {
            format!("({s}")
          }
        } else if i == parsed_query.len() - 1 {
          let mut s = s.to_string();

          if let Some(position) = s.char_indices().find(|&(_, c)| c == '&' || c == '|') {
            s.insert(position.0, ')');
          } else {
            s = format!("{s})");
          }

          s
        } else {
          let mut s = s.to_string();

          if let Some(position) = s.char_indices().find(|&(_, c)| c == '&' || c == '|') {
            s.insert(position.0, ')');
          }

          if let Some(position) = s
            .chars()
            .collect::<Vec<_>>()
            .iter()
            .rposition(|s| *s == '&')
          {
            s.insert(position + 1, '(');
          }

          s
        }
      })
      .collect::<Vec<_>>();
  }

  let parsed_query = parsed_query
    .iter()
    .enumerate()
    .map(|(i, s)| {
      if i < parsed_query.len() - 1 {
        if s.ends_with('$') {
          s.trim_end_matches('$').to_string()
        } else {
          format!("{}:*", s)
        }
      } else {
        s.to_string()
      }
    })
    .collect::<Vec<_>>()
    .join("|");

  parsed_query
}

fn add_namespace_matches(qb: &mut QueryBuilder<Postgres>, value: &str) {
  let re = regex::Regex::new(
    r#"(?i)-?(artist|circle|magazine|event|publisher|parody|tag|male|female|misc|other|title|pages|id):(".*?"|'.*?'|[^\s]+)"#,
  )
  .unwrap();

  let captures = re.captures_iter(value).collect_vec();

  for capture in captures.into_iter() {
    qb.push(" AND \n(");

    let negate = capture.get(0).unwrap().as_str().starts_with('-');
    let condition = if negate { "NOT EXISTS" } else { "EXISTS" };

    let tag_type = capture.get(1).unwrap().as_str().to_lowercase();

    let get_sql = |tag_type: &TagType, column: &str| {
      format!(
        r#"SELECT 1 FROM {relation} LEFT JOIN {table} ON {table}.id = {relation}.{id} WHERE {relation}.archive_id = archives.id AND {table}.{column} ILIKE "#,
        relation = tag_type.relation(),
        table = tag_type.table(),
        id = tag_type.id(),
      )
    };

    let push_taxonomy_sql = |qb: &mut QueryBuilder<Postgres>, tag_type: TagType, value: String| {
      qb.push(get_sql(&tag_type, "name"))
        .push_bind(value.clone())
        .push(format!("\n        ) OR\n        {condition} (\n          "))
        .push(get_sql(&tag_type, "slug"))
        .push_bind(value)
        .push("\n        )\n      )\n".to_string());
    };

    let push_tag_sql_sql =
      |qb: &mut QueryBuilder<Postgres>, tag_type: TagType, value: String, namespace: String| {
        qb.push(get_sql(&tag_type, "name"))
          .push_bind(value.clone())
          .push(format!(" AND namespace ILIKE '{namespace}'"))
          .push(format!("\n        ) OR\n        {condition} (\n          "))
          .push(get_sql(&tag_type, "slug"))
          .push_bind(value)
          .push(format!(" AND namespace ILIKE '{namespace}'"))
          .push("\n        )\n      )\n".to_string());
      };

    let value = capture
      .get(2)
      .unwrap()
      .as_str()
      .trim_matches('\"')
      .trim_matches('\'')
      .replace('*', "%")
      .replace(['(', ')'], "");

    let or_splits = value.split('|').collect_vec();

    for (i, or_split) in or_splits.iter().enumerate() {
      qb.push("\n  (\n");
      let and_splits = or_split.split('&').collect_vec();

      if i == 0 {
        qb.push("    (\n");
      }

      for (j, and_split) in and_splits.iter().enumerate() {
        qb.push(format!("      (\n        {condition} (\n          "));

        let and_split = and_split.to_string();

        match tag_type.as_str() {
          "artist" => push_taxonomy_sql(qb, TagType::Artist, and_split),
          "circle" => push_taxonomy_sql(qb, TagType::Circle, and_split),
          "magazine" => push_taxonomy_sql(qb, TagType::Magazine, and_split),
          "publisher" => push_taxonomy_sql(qb, TagType::Publisher, and_split),
          "parody" => push_taxonomy_sql(qb, TagType::Parody, and_split),
          "tag" => push_tag_sql_sql(qb, TagType::Tag, and_split, "%%".to_string()),
          "male" => push_tag_sql_sql(qb, TagType::Tag, and_split, "male".to_string()),
          "female" => push_tag_sql_sql(qb, TagType::Tag, and_split, "female".to_string()),
          "misc" | "other" => push_tag_sql_sql(qb, TagType::Tag, and_split, "misc".to_string()),
          "id" => {
            qb.push("SELECT 1 WHERE");
            utils::add_id_ranges(qb, &and_split);
            qb.push("\n        )\n      )");
          }
          _ => {}
        }

        if j != and_splits.len() - 1 {
          qb.push(" AND ");
        } else {
          qb.push("\n    )");
        }
      }

      if i != or_splits.len() - 1 {
        qb.push(" OR\n  ");
      }
    }

    qb.push("\n  )\n)");
  }
}

fn clean_value(query: &str) -> String {
  let mut value = query.to_owned();

  let re = regex::Regex::new(
    r#"(?i)-?(artist|circle|magazine|event|publisher|parody|tag|male|female|misc|other|title|pages|id):(".*?"|'.*?'|[^\s]+)"#,
  )
  .unwrap();
  let captures = re.captures_iter(query).collect_vec();

  for capture in captures {
    let capture = capture.get(0).unwrap();
    value = value.replace(capture.as_str(), "");
  }

  value.trim().replace(':', "").to_string()
}

pub async fn search(
  query: &SearchQuery,
  include_deleted: bool,
  pool: &PgPool,
) -> Result<(Vec<i64>, i64), sqlx::Error> {
  let strip_set: HashSet<char> = vec!['[', ']', '(', ')', '~', '&'].into_iter().collect();
  let stripped: String = query
    .value
    .chars()
    .filter(|&c| !strip_set.contains(&c))
    .collect();

  let value = utils::trim_whitespace(&stripped);
  let clean = &utils::trim_whitespace(&clean_value(&value));
  let parsed = parse_query(clean);

  let mut qb = QueryBuilder::new(
    r#"SELECT COUNT(*) FROM archives INNER JOIN archive_fts fts ON fts.archive_id = archives.id"#,
  );

  if !include_deleted {
    qb.push(" WHERE deleted_at IS NULL");
  }

  if !parsed.is_empty() {
    qb.push(
      r#" AND (title_tsv || artists_tsv || circles_tsv || magazines_tsv || parodies_tsv || tags_tsv) @@ to_tsquery('english', "#,
    )
    .push_bind(&parsed)
    .push(")");
  }

  add_namespace_matches(&mut qb, &query.value);

  let count: i64 = qb.build_query_scalar().fetch_one(pool).await?;

  let mut qb = QueryBuilder::new(r#"SELECT archives.id"#);

  if !parsed.is_empty() {
    qb.push(", ts_rank((title_tsv || artists_tsv || circles_tsv || magazines_tsv || parodies_tsv || tags_tsv), to_tsquery('english', ")
      .push_bind(&parsed)
      .push(")) rank");
  }

  qb.push(r#" FROM archives INNER JOIN archive_fts fts ON fts.archive_id = archives.id"#);

  if !include_deleted {
    qb.push(" WHERE deleted_at IS NULL");
  }

  if !parsed.is_empty() {
    qb.push(
      r#" AND (title_tsv || artists_tsv || circles_tsv || magazines_tsv || parodies_tsv || tags_tsv) @@ to_tsquery('english', "#,
    )
    .push_bind(&parsed)
    .push(")");
  }

  add_namespace_matches(&mut qb, &query.value);

  qb.push(" GROUP BY archives.id, fts.archive_id");

  match query.sort {
    crate::api::routes::Sorting::Relevance => {
      if !parsed.is_empty() {
        qb.push(format!(
          r#" ORDER BY rank {order}, created_at {order}"#,
          order = query.order.to_string()
        ));
      } else {
        qb.push(format!(r#" ORDER BY created_at {}"#, query.order));
      }
    }
    crate::api::routes::Sorting::ReleasedAt => {
      qb.push(format!(r#" ORDER BY released_at {}"#, query.order));
    }
    crate::api::routes::Sorting::CreatedAt => {
      qb.push(format!(r#" ORDER BY created_at {}"#, query.order));
    }
    crate::api::routes::Sorting::Title => {
      qb.push(format!(r#" ORDER BY archives.title {}"#, query.order));
    }
    crate::api::routes::Sorting::Pages => {
      qb.push(format!(
        r#" ORDER BY pages {order}, created_at {order}"#,
        order = query.order
      ));
    }
  };

  if query.limit > 0 {
    qb.push(" LIMIT ")
      .push_bind(query.limit as i32)
      .push(" OFFSET ")
      .push_bind(query.limit.mul(query.page - 1) as i32);
  }

  let rows = qb.build().fetch_all(pool).await?;

  Ok((rows.iter().map(|row| row.get(0)).collect(), count))
}

pub async fn get_list_items(
  ids: Vec<i64>,
  pool: &PgPool,
) -> Result<Vec<ArchiveListItem>, sqlx::Error> {
  let mut qb = QueryBuilder::new(
    r#"SELECT id, slug, hash, title,
    (
      SELECT json_build_object('width', width, 'height', height)
      FROM archive_images WHERE archive_id = id AND page_number = thumbnail
    ) cover,"#,
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
    qb.push(format!(
        r#" COALESCE((SELECT json_agg(json_build_object('slug', {table}.slug, 'name', {table}.name) ORDER BY {table}.name)
        FROM {table} INNER JOIN {relation} r ON r.{id} = {table}.id
        WHERE r.archive_id = archives.id), '[]') {table}"#,
        table = tag_type.table(),
        relation = tag_type.relation(),
        id = tag_type.id()
      ));

    if tag_type != TagType::Tag {
      qb.push(",");
    }
  }

  qb.push(", ARRAY_POSITION(")
    .push_bind(&ids)
    .push(",id) AS ord");

  qb.push(" FROM archives WHERE id = ANY(")
    .push_bind(&ids)
    .push(") ORDER BY ord");

  let rows = qb.build().fetch_all(pool).await?;

  let archives = rows
    .iter()
    .map(|row| {
      let cover = row
        .try_get::<Json<_>, _>(4)
        .map(|r| r.0)
        .unwrap_or(None)
        .filter(|cover: &ImageDimensions| cover.width.is_some() || cover.height.is_some());

      ArchiveListItem {
        id: row.get(0),
        slug: row.get(1),
        hash: row.get(2),
        title: row.get(3),
        cover,
        artists: row.get::<Json<_>, _>(5).0,
        circles: row.get::<Json<_>, _>(6).0,
        magazines: row.get::<Json<_>, _>(7).0,
        events: row.get::<Json<_>, _>(8).0,
        publishers: row.get::<Json<_>, _>(9).0,
        parodies: row.get::<Json<_>, _>(10).0,
        tags: row.get::<Json<_>, _>(11).0,
      }
    })
    .collect();

  Ok(archives)
}

async fn copy_archive(
  old_hash: String,
  new_hash: String,
  transaction: &mut Transaction<'_, Postgres>,
) -> Result<i64, sqlx::Error> {
  let rec = sqlx::query!(
    r#"SELECT slug, title, description, path, pages, size, thumbnail, language, released_at, has_metadata FROM archives WHERE hash = $1"#,
    old_hash
  )
  .fetch_one(&mut **transaction)
  .await?;

  let new_id = sqlx::query_scalar!(
      r#"INSERT INTO archives (
        slug, title, description, path, hash, pages, size, thumbnail, language, released_at, has_metadata
      ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING id"#,
    rec.slug,
    rec.title,
    rec.description,
    rec.path,
    new_hash,
    rec.pages,
    rec.size,
    rec.thumbnail,
    rec.language,
    rec.released_at,
    rec.has_metadata
  ).fetch_one(&mut **transaction).await?;

  Ok(new_id)
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

pub async fn upsert_archive(
  data: UpsertArchiveData,
  pool: &PgPool,
  mp: Option<&MultiProgress>,
) -> anyhow::Result<i64> {
  let mut path_link = None;

  let mut transaction = pool.begin().await?;

  let rec = sqlx::query!(
    r#"SELECT id, slug, path, hash FROM archives WHERE (id = $1 OR path = $2 OR hash = $3) AND deleted_at IS NULL"#,
    data.id,
    data.path,
    data.hash
  )
  .fetch_optional(&mut *transaction)
  .await?;

  let archive_id = if let Some(rec) = rec {
    if let Some(hash) = data.hash {
      if hash != rec.hash {
        if let Some(mp) = mp {
          mp.suspend(|| {
            warn!(
              target: "db::upsert_archive",
              "Hash mismatch - OLD: {}, NEW: {}", rec.hash, hash
            );
            warn!(
              target: "db::upsert_archive",
              "A new copy of the old archive will be created and it will replace the old one."
            );
          });
        }

        let new_id = copy_archive(rec.hash, hash, &mut transaction).await?;

        upsert_relations(
          Relations {
            artists: data.artists,
            circles: data.circles,
            magazines: data.magazines,
            events: data.events,
            publishers: data.publishers,
            parodies: data.parodies,
            tags: data.tags,
            sources: data.sources,
            images: data.images,
          },
          new_id,
          true,
          &mut transaction,
        )
        .await?;

        sqlx::query!(
          "UPDATE archives SET deleted_at = NOW() WHERE id = $1",
          rec.id,
        )
        .execute(&mut *transaction)
        .await?;

        transaction.commit().await?;

        utils::create_symlink(
          &rec.path,
          &CONFIG.directories.links.join(new_id.to_string()),
        )?;

        return Ok(new_id);
      }
    }

    let mut qb = QueryBuilder::new("UPDATE archives SET");

    if let Some(title) = data.title {
      qb.push(" title = ").push_bind(title).push(",");
    }

    if let Some(slug) = data.slug {
      qb.push(" slug = ").push_bind(slug).push(",");
    }

    qb.push(" description = ")
      .push_bind(data.description.clone())
      .push(",");

    if let Some(path) = data.path {
      path_link = Some(path.clone());

      if path != rec.path {
        qb.push(" path = ").push_bind(path).push(",");
      }
    }

    if let Some(pages) = data.pages {
      qb.push(" pages = ").push_bind(pages).push(",");
    }

    if let Some(size) = data.size {
      qb.push(" size = ").push_bind(size).push(",");
    }

    if let Some(thumbnail) = data.thumbnail {
      qb.push(" thumbnail = ").push_bind(thumbnail).push(",");
    }

    qb.push(" language = ")
      .push_bind(data.language.clone())
      .push(",");

    if let Some(released_at) = data.released_at {
      qb.push(" released_at = ").push_bind(released_at).push(",");
    }

    qb.push(" deleted_at = ")
      .push_bind(data.deleted_at)
      .push(",");

    if let Some(has_metadata) = data.has_metadata {
      qb.push(" has_metadata = ")
        .push_bind(has_metadata)
        .push(",");
    }

    qb.push(" updated_at = NOW() WHERE id = ")
      .push_bind(rec.id)
      .build()
      .execute(&mut *transaction)
      .await?;

    rec.id
  } else if let (Some(title), Some(path), Some(hash), Some(pages), Some(size), Some(thumbnail)) = (
    data.title,
    data.path,
    data.hash,
    data.pages,
    data.size,
    data.thumbnail,
  ) {
    let slug = data.slug.unwrap_or(slugify(&title));

    let id = sqlx::query_scalar!(
    r#"INSERT INTO archives (
      slug, title, description, path, hash, pages, size, thumbnail, language, released_at, has_metadata
    ) VALUES (
     $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    ) RETURNING id"#,
    slug,
    title,
    data.description,
    path,
    hash,
    pages,
    size,
    thumbnail,
    data.language,
    data.released_at,
    data.has_metadata.unwrap_or_default()
  ).fetch_one(&mut *transaction).await?;

    path_link = Some(path);

    id
  } else {
    return Err(anyhow!("Insufficient archive data to insert"));
  };

  upsert_relations(
    Relations {
      artists: data.artists,
      circles: data.circles,
      magazines: data.magazines,
      events: data.events,
      publishers: data.publishers,
      parodies: data.parodies,
      tags: data.tags,
      sources: data.sources,
      images: data.images,
    },
    archive_id,
    true,
    &mut transaction,
  )
  .await?;

  transaction.commit().await?;

  if let Some(path) = path_link {
    utils::create_symlink(
      &path,
      &CONFIG.directories.links.join(archive_id.to_string()),
    )?;
  }

  Ok(archive_id)
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
      let name = tag_alias(&name, &slug);
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
  sources: Vec<ArchiveSource>,
  archive_id: i64,
  merge: bool,
  transaction: &mut Transaction<'_, Postgres>,
) -> Result<(), sqlx::Error> {
  let sources = sources
    .into_iter()
    .filter(|source| !source.name.trim().is_empty())
    .map(|source| ArchiveSource {
      name: source.name.trim().to_string(),
      url: source.url,
    })
    .collect_vec();

  let existing_sources = sqlx::query_as!(
    ArchiveSource,
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
  images: Vec<ArchiveImage>,
  archive_id: i64,
  transaction: &mut Transaction<'_, Postgres>,
) -> Result<(), sqlx::Error> {
  let existing_images = sqlx::query_as!(
    ArchiveImage,
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

pub async fn update_archive(
  data: UpsertArchiveData,
  info: &ArchiveId,
  merge_sources: bool,
  pool: &PgPool,
) -> anyhow::Result<i64> {
  let mut transaction = pool.begin().await?;
  let mut path_link = None;

  let mut qb = QueryBuilder::new("UPDATE archives SET");

  if let Some(title) = data.title {
    qb.push(" title = ").push_bind(title).push(",");
  }

  if let Some(slug) = data.slug {
    qb.push(" slug = ").push_bind(slug).push(",");
  }

  qb.push(" description = ")
    .push_bind(data.description.clone())
    .push(",");

  if let Some(path) = data.path {
    path_link = Some(path.clone());

    if path != info.path {
      qb.push(" path = ").push_bind(path).push(",");
    }
  }

  if let Some(pages) = data.pages {
    qb.push(" pages = ").push_bind(pages).push(",");
  }

  if let Some(size) = data.size {
    qb.push(" size = ").push_bind(size).push(",");
  }

  if let Some(thumbnail) = data.thumbnail {
    qb.push(" thumbnail = ").push_bind(thumbnail).push(",");
  }

  qb.push(" language = ")
    .push_bind(data.language.clone())
    .push(",");

  if let Some(released_at) = data.released_at {
    qb.push(" released_at = ").push_bind(released_at).push(",");
  }

  qb.push(" deleted_at = ")
    .push_bind(data.deleted_at)
    .push(",");

  if let Some(has_metadata) = data.has_metadata {
    qb.push(" has_metadata = ")
      .push_bind(has_metadata)
      .push(",");
  }

  qb.push(" updated_at = NOW() WHERE id = ")
    .push_bind(info.id)
    .build()
    .execute(&mut *transaction)
    .await?;

  upsert_relations(
    Relations {
      artists: data.artists,
      circles: data.circles,
      magazines: data.magazines,
      events: data.events,
      publishers: data.publishers,
      parodies: data.parodies,
      tags: data.tags,
      sources: data.sources,
      images: data.images,
    },
    info.id,
    merge_sources,
    &mut transaction,
  )
  .await?;

  transaction.commit().await?;

  if let Some(path) = path_link {
    utils::create_symlink(&path, &CONFIG.directories.links.join(info.id.to_string()))?;
  }

  Ok(1)
}
