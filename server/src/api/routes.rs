use super::{
  images::DimensionArgs,
  models::{ArchiveListItem, LibraryPage},
  ApiError, ApiJson, AppState,
};
use anyhow::anyhow;
use axum::extract::{Path, Query, State};
use std::{collections::HashMap, fmt::Display, str::FromStr};
use tokio::sync::oneshot;

pub async fn library(
  Query(params): Query<HashMap<String, String>>,
  State(state): State<AppState>,
) -> Result<ApiJson<LibraryPage<ArchiveListItem>>, ApiError> {
  let query = SearchQuery::from_params(params);
  let (ids, total) = query::search(&query, query.deleted, &state.pool).await?;
  let archives = query::get_list_items(ids, &state.pool).await?;

  Ok(ApiJson(LibraryPage {
    archives,
    page: query.page,
    limit: 24,
    total,
  }))
}

pub async fn archive_data(
  Path(id): Path<i64>,
  State(state): State<AppState>,
) -> Result<ApiJson<query::ArchiveData>, ApiError> {
  let mut archive = query::get_data(id, &state.pool)
    .await?
    .ok_or(ApiError::NotFound)?;

  if archive.images.is_empty()
    || archive
      .images
      .iter()
      .any(|image| image.width.is_none() || image.height.is_none())
  {
    let mut in_progress = state.dimensions.in_progress.lock().await;

    if let Some(waiters) = in_progress.get_mut(&id) {
      let (responder_tx, responder_rx) = oneshot::channel();
      waiters.push(responder_tx);

      drop(in_progress);

      if let Ok(images) = responder_rx.await? {
        archive.images = images;
      }
    } else {
      let (responder_tx, responder_rx) = oneshot::channel();
      in_progress.insert(id, vec![responder_tx]);
      drop(in_progress);
      state
        .dimensions
        .queue_tx
        .send(DimensionArgs {
          id,
          pool: state.pool,
        })
        .unwrap();

      if let Ok(images) = responder_rx.await? {
        archive.images = images;
      }
    }
  }

  Ok(ApiJson(archive))
}
