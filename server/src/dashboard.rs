mod images;

use crate::{
  archives::{self, query},
  config::CONFIG,
};
use clap::Args;
use poem::{
  endpoint::StaticFilesEndpoint,
  error::InternalServerError,
  listener::TcpListener,
  middleware::Cors,
  web::{Data, Path},
  Endpoint, EndpointExt, Request, Result, Route, Server,
};
use poem_openapi::{
  payload::{self, Attachment, Binary, Json, PlainText, Response},
  ApiResponse, Object, OpenApi, OpenApiService, OperationId, ResponseContent,
};
use sqlx::PgPool;

#[derive(Args, Clone)]
pub struct DashboardArgs {
  #[arg(long, help = "Server host [default: 127.0.0.1]")]
  pub server_host: Option<String>,
  #[arg(long, help = "Server port [default: 3000]")]
  pub server_port: Option<u16>,
  #[arg(short = 'H', help = "Dashboard host [default: 127.0.0.1]")]
  pub host: Option<String>,
  #[arg(short = 'P', help = "Dashboard port [default: 3001]")]
  pub port: Option<u16>,
  #[arg(long, default_value = "false", help = "Don't open the browser")]
  pub no_open: bool,
}

#[derive(Object)]
struct LibraryPage {
  pub archives: Vec<archives::ArchiveLibrary>,
  pub page: usize,
  pub limit: usize,
  pub total: i64,
}

#[derive(ApiResponse)]
enum GetResponse {
  #[oai(status = 200)]
  Library(Json<LibraryPage>),
  #[oai(status = 200)]
  Archive(Json<archives::ArchiveWithMetadata>),
  #[oai(status = 404)]
  NotFound(PlainText<String>),
}

struct DashboardApi;

#[OpenApi]
impl DashboardApi {
  #[oai(path = "/library", method = "get", operation_id = "get_library")]
  async fn library(&self, pool: Data<&PgPool>, req: &Request) -> Result<GetResponse> {
    let search = req.params::<query::SearchQuery>()?;

    let (ids, count) = query::search(&search, search.deleted, &pool)
      .await
      .map_err(InternalServerError)?;

    let archives = archives::get_library_archives(ids, &pool)
      .await
      .map_err(InternalServerError)?;

    Ok(GetResponse::Library(Json(LibraryPage {
      archives,
      page: search.page,
      limit: search.limit,
      total: count,
    })))
  }

  #[oai(path = "/g/:id", method = "get", operation_id = "get_archive")]
  async fn archive(&self, pool: Data<&PgPool>, id: Path<i64>) -> Result<GetResponse> {
    let archive = archives::get(id.0, &pool)
      .await
      .map_err(InternalServerError)?;

    match archive {
      Some(archive) => Ok(GetResponse::Archive(Json(archive))),
      None => Ok(GetResponse::NotFound(PlainText(format!(
        "Archive `{}` not found",
        id.0
      )))),
    }
  }
}

pub async fn init_server(args: &DashboardArgs, pool: PgPool) -> anyhow::Result<()> {
  let api_service: OpenApiService<DashboardApi, ()> =
    OpenApiService::new(DashboardApi, "Dashboard", "1.0.0").server("http://localhost:3000");

  let app = Route::new()
    .nest(
      "/",
      StaticFilesEndpoint::new(format!("{}/../dashboard/dist", env!("CARGO_MANIFEST_DIR")))
        .index_file("index.html"),
    )
    .nest("/api", api_service)
    .with(Cors::new())
    .data(pool)
    .around(|ep, req| async move {
      let uri = req.uri().clone();
      let resp = ep.get_response(req).await;

      if let Some(operation_id) = resp.data::<OperationId>() {
        tracing::trace!("[{}]{} {}", operation_id, uri, resp.status());
      } else {
        tracing::trace!("{} {}", uri, resp.status());
      }

      Ok(resp)
    });

  let host = args.host.as_deref().unwrap_or(&CONFIG.dashboard.host);
  let port = args.port.unwrap_or(CONFIG.dashboard.port);

  let listener = TcpListener::bind(format!("{host}:{port}"));

  if !args.no_open {
    let _ = open::that_detached(format!("http://{host}:{port}"));
  }

  Server::new(listener).run(app).await?;

  Ok(())
}
