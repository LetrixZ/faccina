use crate::archive::TagType;
use crate::config::CONFIG;
use crate::{
  api::{
    models::{ArchiveListItem, Image, ImageDimensions},
    routes::SearchQuery,
  },
  utils,
};
use chrono::NaiveDateTime;
use funty::Fundamental;
use itertools::Itertools;
use sqlx::{
  postgres::{PgConnectOptions, PgSslMode},
  types::Json,
  PgPool, Postgres, QueryBuilder, Row,
};
use std::collections::HashSet;
use std::ops::Mul;

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
  pub images: Vec<Image>,
  pub created_at: NaiveDateTime,
  pub released_at: NaiveDateTime,
}

#[derive(sqlx::FromRow)]
pub struct ArchiveFile {
  pub id: i64,
  pub path: String,
  pub thumbnail: i16,
}

#[derive(sqlx::FromRow)]
pub struct Taxonomy {
  pub slug: String,
  pub name: String,
}

#[derive(sqlx::FromRow)]
pub struct Tag {
  pub slug: String,
  pub name: String,
  pub namespace: Option<String>,
}

#[derive(sqlx::FromRow, Debug)]
pub struct Source {
  pub name: String,
  pub url: Option<String>,
}

#[derive(sqlx::FromRow)]
pub struct ArchiveId {
  pub id: i64,
  pub slug: String,
}

pub struct ArchiveRelations {
  pub id: i64,
  pub slug: String,
  pub title: String,
  pub description: Option<String>,
  pub hash: String,
  pub pages: i16,
  pub size: i64,
  pub cover: Option<ImageDimensions>,
  pub thumbnail: i16,
  pub images: Vec<Image>,
  pub created_at: NaiveDateTime,
  pub released_at: NaiveDateTime,
  pub artists: Vec<Taxonomy>,
  pub circles: Vec<Taxonomy>,
  pub magazines: Vec<Taxonomy>,
  pub publishers: Vec<Taxonomy>,
  pub parodies: Vec<Taxonomy>,
  pub tags: Vec<Tag>,
  pub sources: Vec<Source>,
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
      publishers: Default::default(),
      parodies: Default::default(),
      tags: Default::default(),
      sources: Default::default(),
    }
  }
}

#[derive(Debug)]
pub struct InsertArchive {
  pub id: i64,
  pub slug: String,
  pub title: String,
  pub description: Option<String>,
  pub path: String,
  pub hash: String,
  pub pages: i16,
  pub size: i64,
  pub thumbnail: i16,
  pub language: Option<String>,
  pub translated: Option<bool>,
  pub released_at: Option<NaiveDateTime>,
  pub artists: Vec<String>,
  pub circles: Vec<String>,
  pub magazines: Vec<String>,
  pub publishers: Vec<String>,
  pub parodies: Vec<String>,
  pub tags: Vec<(String, Option<String>)>,
  pub sources: Vec<Source>,
}

impl Default for InsertArchive {
  fn default() -> Self {
    Self {
      id: Default::default(),
      slug: Default::default(),
      title: Default::default(),
      description: Default::default(),
      path: Default::default(),
      hash: Default::default(),
      pages: Default::default(),
      size: Default::default(),
      thumbnail: 1,
      language: Default::default(),
      translated: Default::default(),
      released_at: Default::default(),
      artists: Default::default(),
      circles: Default::default(),
      magazines: Default::default(),
      publishers: Default::default(),
      parodies: Default::default(),
      tags: Default::default(),
      sources: Default::default(),
    }
  }
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
    Vec<Tag>,
    Vec<Source>,
  ),
  sqlx::Error,
> {
  let artists = fetch_taxonomy_data(pool, TagType::Artist, archive_id).await?;
  let circles = fetch_taxonomy_data(pool, TagType::Circle, archive_id).await?;
  let magazines = fetch_taxonomy_data(pool, TagType::Magazine, archive_id).await?;
  let publishers = fetch_taxonomy_data(pool, TagType::Publisher, archive_id).await?;
  let parodies = fetch_taxonomy_data(pool, TagType::Parody, archive_id).await?;
  let tags = fetch_tag_data(pool, archive_id).await?;

  let sources = sqlx::query_as!(
    Source,
    "SELECT name, url FROM archive_sources WHERE archive_id = $1",
    archive_id
  )
  .fetch_all(pool)
  .await?;

  Ok((
    artists, circles, magazines, publishers, parodies, tags, sources,
  ))
}

pub async fn fetch_archive_data(
  pool: &PgPool,
  id: i64,
) -> Result<Option<ArchiveRelations>, sqlx::Error> {
  let row = sqlx::query!(
    r#"SELECT id, slug, title, description, hash, pages, size, thumbnail,
    (SELECT json_build_object('width', width, 'height', height) FROM archive_images WHERE archive_id = id AND page_number = archives.thumbnail) cover,
    (SELECT json_agg(image) FROM (SELECT json_build_object('page_number', page_number, 'width', width, 'height', height) AS image FROM archive_images WHERE archive_id = id ORDER BY page_number ASC) AS ordered_images) images,
    created_at, released_at FROM archives WHERE id = $1"#,
    id
  ).fetch_optional(pool).await?;

  if let Some(row) = row {
    let archive = Archive {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      hash: row.hash,
      pages: row.pages,
      size: row.size,
      thumbnail: row.thumbnail,
      cover: row
        .cover
        .map(|cover| serde_json::from_value(cover).ok())
        .unwrap_or_default(),
      images: row
        .images
        .and_then(|images| serde_json::from_value(images).ok())
        .unwrap_or(vec![]),
      created_at: row.created_at,
      released_at: row.released_at,
    };

    let mut relations: ArchiveRelations = archive.into();

    let (artists, circles, magazines, publishers, parodies, tags, sources) =
      fetch_relations(relations.id, pool).await?;
    relations.artists = artists;
    relations.circles = circles;
    relations.magazines = magazines;
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
    .replace("&", " ")
    .split(" ")
    .map(|s| s.split(":").last().unwrap())
    .map(|s| {
      if s.ends_with("$") {
        s.trim_end_matches("$").to_string()
      } else {
        format!("{s}:*").to_string()
      }
    })
    .map(|s| {
      if s.starts_with("-") {
        s.replacen('-', "!", 1)
      } else {
        s
      }
    })
    .collect::<Vec<_>>()
    .join("&");
  let mut parsed_query = parsed_query
    .split("|")
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
        if s.ends_with("$") {
          s.trim_end_matches("$").to_string()
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

fn add_tag_matches(qb: &mut QueryBuilder<Postgres>, has_parsed: bool, value: &str) {
  let re = regex::Regex::new(
    r#"(?i)-?(artist|circle|magazine|parody|tag|male|female|misc|other|title|pages):(".*?"|'.*?'|[^\s]+)"#,
  )
  .unwrap();

  let captures = re.captures_iter(value).collect_vec();

  for (i, capture) in captures.into_iter().enumerate() {
    if i == 0 {
      if has_parsed {
        qb.push(" AND (");
      } else {
        qb.push(" WHERE (\n");
      }
    } else {
      qb.push(" AND (");
    }

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
      .replace("(", "")
      .replace(")", "");

    let or_splits = value.split("|").collect_vec();

    for (i, or_split) in or_splits.iter().enumerate() {
      qb.push("  (\n");
      let and_splits = or_split.split("&").collect_vec();

      if i == 0 {
        qb.push("    (\n");
      }

      for (j, and_split) in and_splits.iter().enumerate() {
        qb.push(format!("      (\n        {condition} (\n          "));

        let and_split = and_split.to_string();
        println!("and_split {and_split}");

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
          _ => {}
        }

        if j != and_splits.len() - 1 {
          qb.push(" AND ");
        } else {
          qb.push("    )");
        }
      }

      if i != or_splits.len() - 1 {
        qb.push(" OR\n  ");
      }
    }

    qb.push("))");
  }
}

fn clean_value(query: &str) -> String {
  let mut value = query.to_owned();

  let re = regex::Regex::new(
    r#"(?i)-?(artist|circle|magazine|parody|tag|male|female|misc|other|title|pages):(".*?"|'.*?'|[^\s]+)"#,
  )
  .unwrap();
  let captures = re.captures_iter(query).collect_vec();

  for capture in captures {
    let capture = capture.get(0).unwrap();
    value = value.replace(capture.as_str(), "");
  }

  value.trim().replace(":", "").to_string()
}

pub async fn search(
  query: &SearchQuery,
  pool: &PgPool,
) -> Result<(Vec<ArchiveListItem>, i64), sqlx::Error> {
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

  if !parsed.is_empty() {
    qb.push(
      r#" WHERE (title_tsv || artists_tsv || circles_tsv || magazines_tsv || parodies_tsv || tags_tsv) @@ to_tsquery('english', "#,
    )
    .push_bind(&parsed)
    .push(")");
  }

  add_tag_matches(&mut qb, !parsed.is_empty(), &query.value);

  let count: i64 = qb.build_query_scalar().fetch_one(pool).await?;

  let mut qb = QueryBuilder::new(r#"SELECT archives.id"#);

  if !parsed.is_empty() {
    qb.push(", ts_rank((title_tsv || artists_tsv || circles_tsv || magazines_tsv || parodies_tsv || tags_tsv), to_tsquery('english', ")
      .push_bind(&parsed)
      .push(")) rank");
  }

  qb.push(r#" FROM archives INNER JOIN archive_fts fts ON fts.archive_id = archives.id"#);

  if !parsed.is_empty() {
    qb.push(
      r#" WHERE (title_tsv || artists_tsv || circles_tsv || magazines_tsv || parodies_tsv || tags_tsv) @@ to_tsquery('english', "#,
    )
    .push_bind(&parsed)
    .push(")");
  }

  add_tag_matches(&mut qb, !parsed.is_empty(), &query.value);

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

  qb.push(" LIMIT ")
    .push_bind(24)
    .push(" OFFSET ")
    .push_bind(24.mul(query.page - 1).as_i32());

  let rows = qb.build().fetch_all(pool).await?;

  let ids: Vec<i64> = rows.iter().map(|row| row.get(0)).collect();

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
    .map(|row| ArchiveListItem {
      id: row.get(0),
      slug: row.get(1),
      hash: row.get(2),
      title: row.get(3),
      cover: row.try_get::<Json<_>, _>(4).map(|r| r.0).unwrap_or(None),
      artists: row.get::<Json<_>, _>(5).0,
      circles: row.get::<Json<_>, _>(6).0,
      magazines: row.get::<Json<_>, _>(7).0,
      publishers: row.get::<Json<_>, _>(8).0,
      parodies: row.get::<Json<_>, _>(9).0,
      tags: row.get::<Json<_>, _>(10).0,
    })
    .collect();

  Ok((archives, count))
}
