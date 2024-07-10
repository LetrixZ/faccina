use crate::{
  archives::{self, metadata},
  utils::ToStringExt,
};
use clap::ValueEnum;
use serde::Deserialize;
use sqlx::PgPool;
use std::path::Path;

#[derive(Copy, Clone, ValueEnum, Deserialize)]
#[clap(rename_all = "lower")]
#[serde(rename_all = "lowercase")]
pub enum ScrapeSite {
  Hentag,
}

const HENTAG_API: &str = "https://hentag.com/api/v1/search/vault";

async fn scrape_hentag(id: i64, pool: &PgPool) -> anyhow::Result<()> {
  let sources = sqlx::query!(
    "SELECT name, url FROM archive_sources WHERE archive_id = $1",
    id
  )
  .fetch_all(pool)
  .await?;

  let res = if let Some((_, url)) = sources
    .iter()
    .filter_map(|rec| rec.url.as_ref().map(|url| (rec.name.clone(), url)))
    .find(|(name, _)| ["FAKKU", "Irodori Comics", "E-Hentai", "ExHentai"].contains(&name.as_str()))
  {
    ureq::post(&format!("{HENTAG_API}/url")).send_json(ureq::json!({"urls": [url]}))?
  } else {
    let path = sqlx::query_scalar!("SELECT path FROM archives WHERE id = $1", id)
      .fetch_one(pool)
      .await?;

    let filename = Path::new(&path).file_stem().unwrap().to_string();

    ureq::post(&format!("{HENTAG_API}/title")).send_json(ureq::json!({"title": filename}))?
  };

  let data: Vec<metadata::hentag::Metadata> = res.into_json()?;

  if let Some(metadata) = data.first() {
    let data = metadata::hentag::add_metadata(metadata.clone());

    let mut transaction = pool.begin().await?;
    archives::update_metadata(id, data, &mut transaction).await?;
    transaction.commit().await?;
  }

  Ok(())
}

pub async fn scrape(id: i64, site: ScrapeSite, pool: &PgPool) -> anyhow::Result<()> {
  match site {
    ScrapeSite::Hentag => scrape_hentag(id, pool).await?,
  };

  Ok(())
}
