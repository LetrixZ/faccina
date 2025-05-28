CREATE TABLE IF NOT EXISTS "archives" (
	"id" integer not null primary key autoincrement,
	"title" varchar(1024) not null,
	"description" text,
	"path" text not null unique,
	"hash" text not null unique,
	"pages" integer not null,
	"size" integer not null,
	"thumbnail" integer default 1 not null,
	"language" varchar,
	"released_at" timestamp,
	"created_at" timestamp default current_timestamp not null,
	"updated_at" timestamp default current_timestamp not null,
	"deleted_at" timestamp,
	"protected" boolean default false not null
);
CREATE INDEX IF NOT EXISTS "archive_title" on "archives" ("title");
CREATE INDEX IF NOT EXISTS "archive_description" on "archives" ("description");
CREATE INDEX IF NOT EXISTS "archive_pages" on "archives" ("pages");
CREATE INDEX IF NOT EXISTS "archive_path" on "archives" ("path");
CREATE INDEX IF NOT EXISTS "archive_created_at" on "archives" ("created_at");
CREATE INDEX IF NOT EXISTS "archive_released_at" on "archives" ("released_at");
CREATE INDEX IF NOT EXISTS "archive_deleted_at" on "archives" ("deleted_at");

CREATE TABLE IF NOT EXISTS "archive_sources" (
  "archive_id" integer not null references "archives" ("id") on delete cascade,
	"name" varchar(500) not null,
	"url" text,
	"created_at" timestamp,
	constraint "archive_sources_pkey" unique ("archive_id", "url")
);

CREATE INDEX IF NOT EXISTS "archive_sources_archive_id" on "archive_sources" ("archive_id");
CREATE INDEX IF NOT EXISTS "archive_sources_url" on "archive_sources" ("url");
CREATE INDEX IF NOT EXISTS "archive_sources_name" on "archive_sources" ("name");

CREATE TABLE IF NOT EXISTS "archive_images" (
  "archive_id" integer not null references "archives" ("id") on delete cascade,
	"filename" text not null,
	"page_number" integer not null,
	"width" integer,
	"height" integer,
	constraint "archive_images_pkey" primary key ("archive_id", "page_number")
);

CREATE INDEX IF NOT EXISTS "archive_images_archive_id" on "archive_images" ("archive_id");
CREATE INDEX IF NOT EXISTS "archive_images_page_number" on "archive_images" ("page_number");
CREATE INDEX IF NOT EXISTS "archive_images_filename" on "archive_images" ("filename");

CREATE TABLE IF NOT EXISTS "users" (
  "id" text not null primary key,
  "username" varchar not null unique,
  "password_hash" text not null,
  "email" text,
  "created_at" timestamp default current_timestamp not null,
  "updated_at" timestamp default current_timestamp not null
);

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" text primary key,
  "expires_at" timestamp not null,
  "user_id" text not null references "users" ("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "user_favorites" (
  "user_id" text not null references "users" ("id") on delete cascade,
	"archive_id" integer not null references "archives" ("id") on delete cascade,
  "created_at" timestamp default current_timestamp not null
);

CREATE TABLE IF NOT EXISTS "user_codes" (
  "user_id" text not null references "users" ("id") on delete cascade,
	"code" text not null unique,
	"type" varchar not null,
	"created_at" timestamp default current_timestamp not null,
	"consumed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "user_codes_code_type" on "user_codes" ("code", "type");

CREATE TABLE IF NOT EXISTS "tags" (
  "id" integer not null primary key autoincrement,
  "namespace" text not null,
  "name" text not null,
  "display_name" text,
  "hidden" boolean default false not null,
  "created_at" timestamp default current_timestamp not null,
  "updated_at" timestamp default current_timestamp not null,
  constraint "tags_namespace_name" unique ("namespace", "name")
);

CREATE INDEX IF NOT EXISTS "tags_namespace" on "tags" (namespace collate nocase);
CREATE INDEX IF NOT EXISTS "tags_name" on "tags" (name collate nocase);

CREATE TABLE IF NOT EXISTS "archive_tags" (
  "archive_id" integer not null references "archives" ("id") on delete cascade,
	"tag_id" integer not null references "tags" ("id") on delete cascade,
  "created_at" timestamp default current_timestamp not null
);

CREATE INDEX IF NOT EXISTS "archive_tags_archive_tag" on "archive_tags" ("archive_id", "tag_id");
CREATE INDEX IF NOT EXISTS "archive_tags_archive_id" on "archive_tags" ("archive_id");
CREATE INDEX IF NOT EXISTS "archive_tags_tag_id" on "archive_tags" ("tag_id");

CREATE TABLE IF NOT EXISTS "user_blacklist" (
  "user_id" text not null unique references "users" ("id") on delete cascade,
	"blacklist" text not null,
	"created_at" timestamp default current_timestamp not null,
	"updated_at" timestamp default current_timestamp not null
);

CREATE TABLE IF NOT EXISTS "collection" (
  "id" integer not null primary key autoincrement,
  "name" text not null,
  "slug" text not null,
  "user_id" text not null references "users" ("id") on delete cascade,
	"public" boolean default false not null,
	"anonymous" boolean default false not null,
	"protected" boolean default false not null,
	"created_at" timestamp default current_timestamp not null,
	"updated_at" timestamp default current_timestamp not null
);

CREATE INDEX IF NOT EXISTS "collection_name" on "collection" (name collate nocase);
CREATE INDEX IF NOT EXISTS "collection_slug" on "collection" ("slug");

CREATE TABLE IF NOT EXISTS "collection_archive" (
  "collection_id" integer not null references "collection" ("id") on delete cascade,
	"archive_id" integer not null references "archives" ("id") on delete cascade,
  "order" integer not null,
  "created_at" timestamp default current_timestamp not null,
  "updated_at" timestamp default current_timestamp not null,
  constraint "collection_archive_pkey" primary key ("collection_id", "archive_id")
);

CREATE TABLE IF NOT EXISTS "user_read_history" (
  "user_id" text not null references "users" ("id") on delete cascade,
	"archive_id" integer not null references "archives" ("id") on delete cascade,
  "last_page" integer not null,
  "start_page" integer not null,
  "max_page" integer not null,
  "started_at" timestamp default current_timestamp not null,
  "last_read_at" timestamp default current_timestamp not null,
  "finished_at" timestamp,
  constraint "user_read_history_pkey" primary key ("user_id", "archive_id")
);

CREATE INDEX IF NOT EXISTS "user_read_history_user" on "user_read_history" ("user_id");
CREATE INDEX IF NOT EXISTS "user_read_history_archive" on "user_read_history" ("archive_id");

CREATE VIRTUAL TABLE IF NOT EXISTS archives_fts USING fts5 (title, tags);

CREATE TRIGGER IF NOT EXISTS trigger_insert_fts_archives AFTER INSERT ON archives
		BEGIN
			INSERT INTO archives_fts (rowid, title)
			VALUES (new.rowid, new.title);
		END;
CREATE TRIGGER IF NOT EXISTS trigger_update_fts_archives AFTER UPDATE ON archives
		BEGIN
			UPDATE archives_fts SET title = new.title
			WHERE rowid = new.rowid;
		END;
CREATE TRIGGER IF NOT EXISTS trigger_delete_fts_archives AFTER DELETE ON archives
		BEGIN
			DELETE FROM archives_fts WHERE rowid = old.rowid;
		END;
CREATE TRIGGER IF NOT EXISTS trigger_insert_fts_archives_tags AFTER INSERT ON archive_tags
		BEGIN
			UPDATE archives_fts SET
				tags = (coalesce((SELECT group_concat(tags.name, ' ') FROM archive_tags INNER JOIN tags ON tags.id = archive_tags.tag_id WHERE archive_tags.archive_id = new.archive_id), ''))
			WHERE rowid = new.archive_id;
		END;
CREATE TRIGGER IF NOT EXISTS trigger_delete_fts_archives_tags AFTER DELETE ON archive_tags
		BEGIN
			UPDATE archives_fts SET
				tags = (coalesce((SELECT group_concat(tags.name, ' ') FROM archive_tags INNER JOIN tags ON tags.id = archive_tags.tag_id WHERE archive_tags.archive_id = old.archive_id), ''))
			WHERE rowid = old.archive_id;
		END;

CREATE TABLE IF NOT EXISTS "series" (
  "id" integer not null primary key autoincrement,
  "title" varchar(1024) not null,
  "created_at" timestamp default current_timestamp not null,
  "updated_at" timestamp default current_timestamp not null
);

CREATE TABLE IF NOT EXISTS "series_archive" (
  "series_id" integer not null references "series" ("id") on delete cascade,
  "archive_id" integer not null references "archives" ("id") on delete cascade,
  "order" integer not null,
  "created_at" timestamp default current_timestamp not null,
  "updated_at" timestamp default current_timestamp not null,
  constraint "series_archive_pkey" primary key ("series_id", "archive_id")
);

CREATE VIRTUAL TABLE IF NOT EXISTS series_fts USING fts5 (title);

CREATE TRIGGER IF NOT EXISTS trigger_insert_fts_series AFTER INSERT ON series
		BEGIN
			INSERT INTO series_fts (rowid, title)
			VALUES (new.rowid, new.title);
		END;
CREATE TRIGGER IF NOT EXISTS trigger_update_fts_series AFTER UPDATE ON series
		BEGIN
			UPDATE series_fts SET title = new.title
			WHERE rowid = new.rowid;
		END;
CREATE TRIGGER IF NOT EXISTS trigger_delete_fts_series AFTER DELETE ON series
		BEGIN
			DELETE FROM series_fts WHERE rowid = old.rowid;
		END;
