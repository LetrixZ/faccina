use std::path::Path;

use crate::{db, metadata::hentag, utils::ToStringExt};
use clap::ValueEnum;
use indicatif::MultiProgress;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;

#[derive(Copy, Clone, ValueEnum, Deserialize)]
#[clap(rename_all = "lower")]
pub enum ScrapeSite {
  HenTag,
}

const HENTAG_API: &str = "https://hentag.com/api/v1/search/vault";

async fn scrape_hentag(id: i64, pool: &PgPool, mp: &MultiProgress) -> anyhow::Result<()> {
  let sources = sqlx::query!(
    "SELECT name, url FROM archive_sources WHERE archive_id = $1",
    id
  )
  .fetch_all(pool)
  .await?;

  let request = if let Some((_, url)) = sources
    .iter()
    .filter_map(|rec| rec.url.as_ref().map(|url| (rec.name.clone(), url)))
    .find(|(name, _)| ["FAKKU", "Irodori Comics", "E-Hentai", "ExHentai"].contains(&name.as_str()))
  {
    let client = reqwest::Client::new();
    client
      .post(format!("{HENTAG_API}/url"))
      .json(&json!({"urls": [url]}))
  } else {
    let path = sqlx::query_scalar!("SELECT path FROM archives WHERE id = $1", id)
      .fetch_one(pool)
      .await?;

    let filename = Path::new(&path).file_stem().unwrap().to_string();

    let client = reqwest::Client::new();
    client
      .post(format!("{HENTAG_API}/title"))
      .json(&json!({"title": filename}))
  };

  let res = request.send().await?;
  let data: Vec<hentag::Metadata> = res.json().await?;

  if let Some(info) = data.first() {
    let mut data = db::UpsertArchiveData {
      id: Some(id),
      ..Default::default()
    };

    data.has_metadata = Some(true);

    hentag::add_metadata(info.clone(), &mut data)?;
    db::upsert_archive(data, pool, mp).await?;
  }

  Ok(())
}

pub async fn scrape(
  id: i64,
  site: ScrapeSite,
  pool: &PgPool,
  mp: &MultiProgress,
) -> anyhow::Result<()> {
  match site {
    ScrapeSite::HenTag => scrape_hentag(id, pool, mp).await?,
  };

  Ok(())
}
