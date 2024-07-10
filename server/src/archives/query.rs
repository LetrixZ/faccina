use super::TagType;
use crate::utils;
use anyhow::anyhow;
use itertools::Itertools;
use serde::Deserialize;
use serde_inline_default::serde_inline_default;
use sqlx::{PgPool, Postgres, QueryBuilder, Row};
use std::{
  collections::{HashMap, HashSet},
  fmt::Display,
  str::FromStr,
};

#[serde_inline_default]
#[derive(Deserialize, Debug)]
pub struct SearchQuery {
  #[serde(default, rename = "q")]
  pub value: String,
  #[serde_inline_default(1)]
  pub page: usize,
  #[serde(default)]
  pub sort: Sorting,
  #[serde(default)]
  pub order: Ordering,
  #[serde_inline_default(24)]
  pub limit: usize,
  #[serde(default)]
  pub deleted: bool,
}

impl SearchQuery {
  #[allow(dead_code)]
  pub fn from_params_dashboard(params: HashMap<String, String>) -> Self {
    Self {
      value: params.get("q").cloned().unwrap_or_default(),
      page: {
        if let Some(page) = params.get("page") {
          page.parse().unwrap_or(1)
        } else {
          1
        }
      },
      sort: {
        if let Some(sort) = params.get("sort") {
          sort.parse().unwrap_or_default()
        } else {
          Sorting::default()
        }
      },
      order: {
        if let Some(order) = params.get("order") {
          order.parse().unwrap_or_default()
        } else {
          Ordering::default()
        }
      },
      limit: params
        .get("limit")
        .and_then(|param| param.parse().ok())
        .unwrap_or(0),
      deleted: params.contains_key("unpublished"),
    }
  }

  pub fn from_params(params: HashMap<String, String>) -> Self {
    Self {
      value: params.get("q").cloned().unwrap_or_default(),
      page: {
        if let Some(page) = params.get("page") {
          page.parse().unwrap_or(1)
        } else {
          1
        }
      },
      sort: {
        if let Some(sort) = params.get("sort") {
          sort.parse().unwrap_or_default()
        } else {
          Sorting::default()
        }
      },
      order: {
        if let Some(order) = params.get("order") {
          order.parse().unwrap_or_default()
        } else {
          Ordering::default()
        }
      },
      limit: 24,
      deleted: false,
    }
  }
}

impl Display for Ordering {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Ordering::Asc => write!(f, "ASC"),
      Ordering::Desc => write!(f, "DESC"),
    }
  }
}

#[derive(Deserialize, Debug)]
pub enum Sorting {
  Relevance,
  ReleasedAt,
  CreatedAt,
  Title,
  Pages,
}

impl Default for Sorting {
  fn default() -> Self {
    Self::ReleasedAt
  }
}

impl FromStr for Sorting {
  type Err = anyhow::Error;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    let s = s.to_lowercase();
    let s = s.as_str();

    match s {
      "relevance" => Ok(Self::Relevance),
      "released_at" => Ok(Self::ReleasedAt),
      "created_at" => Ok(Self::CreatedAt),
      "title" => Ok(Self::Title),
      "pages" => Ok(Self::Pages),
      _ => Err(anyhow!("Invalid sort value '{s}'")),
    }
  }
}

#[derive(Deserialize, Debug)]
pub enum Ordering {
  Asc,
  Desc,
}

impl Default for Ordering {
  fn default() -> Self {
    Self::Desc
  }
}

impl FromStr for Ordering {
  type Err = anyhow::Error;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    let s = s.to_lowercase();
    let s = s.as_str();

    match s {
      "asc" => Ok(Self::Asc),
      "desc" => Ok(Self::Desc),
      _ => Err(anyhow!("Invalid ordering value '{s}'")),
    }
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
        .push(format!(
          "\n        ) {condition_op}\n        {condition} (\n          ",
          condition_op = if negate { "AND" } else { "OR" }
        ))
        .push(get_sql(&tag_type, "slug"))
        .push_bind(value)
        .push("\n        )\n      )\n".to_string());
    };

    let push_tag_sql_sql =
      |qb: &mut QueryBuilder<Postgres>, tag_type: TagType, value: String, namespace: String| {
        qb.push(get_sql(&tag_type, "name"))
          .push_bind(value.clone())
          .push(format!(" AND namespace ILIKE '{namespace}'"))
          .push(format!(
            "\n        ) {condition_op}\n        {condition} (\n          ",
            condition_op = if negate { "AND" } else { "OR" }
          ))
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
  search: &SearchQuery,
  include_deleted: bool,
  pool: &PgPool,
) -> Result<(Vec<i64>, i64), sqlx::Error> {
  let strip_set: HashSet<char> = vec!['[', ']', '(', ')', '~', '&'].into_iter().collect();
  let stripped: String = search
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

  add_namespace_matches(&mut qb, &search.value);

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

  add_namespace_matches(&mut qb, &search.value);

  qb.push(" GROUP BY archives.id, fts.archive_id");

  match search.sort {
    Sorting::Relevance => {
      if !parsed.is_empty() {
        qb.push(format!(
          r#" ORDER BY rank {order}, created_at {order}"#,
          order = search.order.to_string()
        ));
      } else {
        qb.push(format!(r#" ORDER BY created_at {}"#, search.order));
      }
    }
    Sorting::ReleasedAt => {
      qb.push(format!(
        r#" ORDER BY released_at {order} NULLS LAST, created_at {order}"#,
        order = search.order
      ));
    }
    Sorting::CreatedAt => {
      qb.push(format!(r#" ORDER BY created_at {}"#, search.order));
    }
    Sorting::Title => {
      qb.push(format!(r#" ORDER BY archives.title {}"#, search.order));
    }
    Sorting::Pages => {
      qb.push(format!(
        r#" ORDER BY pages {order}, created_at {order}"#,
        order = search.order
      ));
    }
  };

  if search.limit > 0 {
    qb.push(" LIMIT ")
      .push_bind(search.limit as i32)
      .push(" OFFSET ")
      .push_bind((search.limit * (search.page - 1)) as i32);
  }

  let rows = qb.build().fetch_all(pool).await?;

  Ok((rows.iter().map(|row| row.get(0)).collect(), count))
}
