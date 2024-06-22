use crate::config::CONFIG;
use crate::utils::ToStringExt;
use crate::{cmd, utils};
use anyhow::anyhow;
use data_encoding::HEXUPPER;
use indicatif::MultiProgress;
use itertools::Itertools;
use lava_torrent::torrent::v1::Torrent;
use sqlx::{PgPool, QueryBuilder};
use std::os;
use std::{
  fs,
  io::Cursor,
  path::{Path, PathBuf},
};
use tracing::info;

pub struct IndexTorrentArgs {
  pub path: PathBuf,
  pub reindex: bool,
  pub id: Option<String>,
}

impl IndexTorrentArgs {
  pub fn with_args(args: &cmd::IndexTorrentArsgs, path: &Path) -> Self {
    Self {
      path: path.to_path_buf(),
      reindex: args.reindex,
      id: args.id.clone(),
    }
  }
}

pub async fn index(
  pool: &PgPool,
  multi: &MultiProgress,
  args: IndexTorrentArgs,
) -> anyhow::Result<()> {
  if !args.reindex {
    let rec = sqlx::query_scalar!(
      "SELECT COUNT(*) AS count FROM torrents WHERE path = $1",
      args.path.to_string()
    )
    .fetch_one(pool)
    .await?;

    let count = rec.unwrap();

    if count > 0 {
      return Ok(());
    }
  }

  let file = fs::read(&args.path)?;
  let mut reader = Cursor::new(&file);
  let digest = utils::sha256_digest(&mut reader)?;
  let hash = HEXUPPER.encode(digest.as_ref()).to_lowercase();

  let torrent = Torrent::read_from_bytes(file)?;

  let mut transaction = pool.begin().await?;

  let mut new = true;

  let id = if let Some(rec) = sqlx::query!(r#"SELECT id, path FROM torrents WHERE hash = $1"#, hash)
    .fetch_optional(&mut *transaction)
    .await?
  {
    if rec.path != args.path.to_string() {
      sqlx::query!(
        "UPDATE torrents SET path = $2 WHERE id = $1",
        rec.id,
        args.path.to_string()
      )
      .execute(&mut *transaction)
      .await?;
    }

    new = false;

    rec.id
  } else {
    sqlx::query_scalar!(
      r#"INSERT INTO torrents (name, hash, path) VALUES ($1, $2, $3) RETURNING id"#,
      torrent.name,
      hash,
      args.path.to_string()
    )
    .fetch_one(&mut *transaction)
    .await?
  };

  if let Some(files) = torrent.files {
    let paths = files
      .iter()
      .map(|file| format!("{}/{}", torrent.name, file.path.to_string()))
      .collect_vec();

    let mut qb = QueryBuilder::new(r#"SELECT id, path FROM archives WHERE path LIKE ANY("#);

    qb.push_bind(paths.iter().map(|path| format!("%{path}")).collect_vec())
      .push(")");

    if let Some(id_ranges) = args.id {
      qb.push(" AND");
      cmd::add_id_ranges(&mut qb, &id_ranges);
    }

    #[derive(sqlx::FromRow, Debug)]
    struct ArchivePath {
      id: i64,
      path: String,
    }

    let archives = qb.build_query_as::<ArchivePath>().fetch_all(pool).await?;

    let files = files
      .iter()
      .filter(|file| {
        archives.iter().any(|archive| {
          archive
            .path
            .ends_with(&format!("{}/{}", torrent.name, file.path.to_string()))
        })
      })
      .collect_vec();

    sqlx::query!(
      r#"INSERT INTO archive_torrents (archive_id, torrent_id, path, size)
      SELECT * FROM UNNEST($1::bigint[], $2::bigint[], $3::text[], $4::bigint[])
      ON CONFLICT (archive_id, torrent_id) DO NOTHING"#,
      &archives.iter().map(|archive| archive.id).collect_vec(),
      &vec![id; archives.len()],
      &files.iter().map(|file| file.path.to_string()).collect_vec(),
      &files.iter().map(|file| file.length).collect_vec(),
    )
    .execute(&mut *transaction)
    .await?;
  } else if let Some(archive_id) = sqlx::query_scalar!(
    "SELECT id FROM archives WHERE path LIKE $1",
    format!("%{}", torrent.name)
  )
  .fetch_optional(&mut *transaction)
  .await?
  {
    sqlx::query!(
      r#"INSERT INTO archive_torrents (archive_id, torrent_id, path, size)
      VALUES ($1, $2, $3, $4) ON CONFLICT (archive_id, torrent_id) DO NOTHING"#,
      archive_id,
      id,
      "",
      torrent.length
    )
    .execute(&mut *transaction)
    .await?;
  }

  transaction.commit().await?;

  #[cfg(unix)]
  if let Err(err) =
    os::unix::fs::symlink(&args.path, CONFIG.directories.torrents.join(id.to_string()))
  {
    match err.kind() {
      std::io::ErrorKind::AlreadyExists => {
        if fs::remove_file(CONFIG.directories.torrents.join(id.to_string())).is_ok() {
          if let Err(err) =
            os::unix::fs::symlink(&args.path, CONFIG.directories.torrents.join(id.to_string()))
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
    os::windows::fs::symlink_file(&args.path, CONFIG.directories.torrents.join(id.to_string()))
  {
    match err.kind() {
      std::io::ErrorKind::AlreadyExists => {
        if fs::remove_file(CONFIG.directories.torrents.join(id.to_string())).is_ok() {
          if let Err(err) =
            os::unix::fs::symlink(&args.path, CONFIG.directories.torrents.join(id.to_string()))
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

  if new {
    multi.suspend(|| {
      info!(
        target: "torrent::index",
        "New torrent saved in the database with ID {}: '{}'",
        id,
        args.path.display()
      )
    });
  }

  Ok(())
}
