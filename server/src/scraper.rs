use crate::{db, metadata::hentag, utils::ToStringExt};
use clap::ValueEnum;
use serde::Deserialize;
use sqlx::PgPool;
use std::path::Path;

#[derive(Copy, Clone, ValueEnum, Deserialize)]
#[clap(rename_all = "lower")]
#[serde(rename_all = "lowercase")]
pub enum ScrapeSite {
  HenTag,
}

const HENTAG_API: &str = "https://hentag.com/api/v1/search/vault";

async fn scrape_hentag(info: &db::ArchiveId, pool: &PgPool) -> anyhow::Result<()> {
  let sources = sqlx::query!(
    "SELECT name, url FROM archive_sources WHERE archive_id = $1",
    info.id
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
    let path = sqlx::query_scalar!("SELECT path FROM archives WHERE id = $1", info.id)
      .fetch_one(pool)
      .await?;

    let filename = Path::new(&path).file_stem().unwrap().to_string();

    ureq::post(&format!("{HENTAG_API}/title")).send_json(ureq::json!({"title": filename}))?
  };

  let data: Vec<hentag::Metadata> = res.into_json()?;

  if let Some(metadata) = data.first() {
    let mut data = db::UpsertArchiveData {
      id: Some(info.id),
      ..Default::default()
    };

    data.has_metadata = Some(true);

    hentag::add_metadata(metadata.clone(), &mut data)?;
    db::update_archive(data, &info, true, pool).await?;
  }

  Ok(())
}

pub async fn scrape(info: &db::ArchiveId, site: ScrapeSite, pool: &PgPool) -> anyhow::Result<()> {
  match site {
    ScrapeSite::HenTag => scrape_hentag(info, pool).await?,
  };

  Ok(())
}
