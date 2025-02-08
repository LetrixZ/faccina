import { Database } from 'bun:sqlite';
import { getArchive } from '../app/lib/server/db/queries';
import { Archive } from '../app/lib/types';
import db from '../shared/db';

const database = new Database('./db.prod.sqlite');

// database.exec(`
// CREATE TABLE IF NOT EXISTS "kysely_migration" ("name" varchar(255) not null primary key, "timestamp" varchar(255) not null);
// CREATE TABLE IF NOT EXISTS "kysely_migration_lock" ("id" varchar(255) not null primary key, "is_locked" integer default 0 not null);
// CREATE TABLE IF NOT EXISTS "archives" ("id" integer not null primary key autoincrement, "title" varchar(1024) not null, "description" text, "path" text not null unique, "hash" text not null unique, "pages" integer not null, "size" integer not null, "thumbnail" integer default 1 not null, "language" varchar, "released_at" timestamp, "created_at" timestamp default current_timestamp not null, "updated_at" timestamp default current_timestamp not null, "deleted_at" timestamp, "protected" boolean default false not null);
// CREATE INDEX "archive_title" on "archives" ("title");
// CREATE INDEX "archive_path" on "archives" ("path");
// CREATE INDEX "archive_pages" on "archives" ("pages");
// CREATE INDEX "archive_deleted_at" on "archives" ("deleted_at");
// CREATE TABLE IF NOT EXISTS "archive_sources" ("archive_id" integer not null references "archives" ("id") on delete cascade, "name" varchar(500) not null, "url" text, "created_at" timestamp, constraint "archive_sources_pkey" unique ("archive_id", "url"));
// CREATE TABLE IF NOT EXISTS "archive_images" ("archive_id" integer not null references "archives" ("id") on delete cascade, "filename" text not null, "page_number" integer not null, "width" integer, "height" integer, constraint "archive_images_pkey" primary key ("archive_id", "page_number"));
// CREATE INDEX "archive_description" on "archives" ("description");
// CREATE INDEX "archive_released_at" on "archives" ("released_at");
// CREATE INDEX "archive_created_at" on "archives" ("created_at");
// CREATE INDEX "archive_sources_archive_id" on "archive_sources" ("archive_id");
// CREATE INDEX "archive_sources_url" on "archive_sources" ("url");
// CREATE INDEX "archive_sources_name" on "archive_sources" ("name");
// CREATE INDEX "archive_images_archive_id" on "archive_images" ("archive_id");
// CREATE INDEX "archive_images_page_number" on "archive_images" ("page_number");
// CREATE INDEX "archive_images_filename" on "archive_images" ("filename");
// CREATE TABLE IF NOT EXISTS "users" ("id" text not null primary key, "username" varchar not null unique, "password_hash" text not null, "email" text, "created_at" timestamp default current_timestamp not null, "updated_at" timestamp default current_timestamp not null);
// CREATE TABLE IF NOT EXISTS "user_sessions" ("id" text primary key, "expires_at" timestamp not null, "user_id" text not null references "users" ("id") on delete cascade);
// CREATE TABLE IF NOT EXISTS "user_favorites" ("user_id" text not null references "users" ("id") on delete cascade, "archive_id" integer not null references "archives" ("id") on delete cascade, "created_at" timestamp default current_timestamp not null);
// CREATE TABLE IF NOT EXISTS "user_codes" ("user_id" text not null references "users" ("id") on delete cascade, "code" text not null unique, "type" varchar not null, "created_at" timestamp default current_timestamp not null, "consumed_at" timestamp);
// CREATE INDEX "user_codes_code_type" on "user_codes" ("code", "type");
// CREATE TABLE IF NOT EXISTS "tags" ("id" integer not null primary key autoincrement, "namespace" text not null, "name" text not null, "display_name" text, "hidden" boolean default false not null, "created_at" timestamp default current_timestamp not null, "updated_at" timestamp default current_timestamp not null, constraint "tags_namespace_name" unique ("namespace", "name"));
// CREATE TABLE IF NOT EXISTS "archive_tags" ("archive_id" integer not null references "archives" ("id") on delete cascade, "tag_id" integer not null references "tags" ("id") on delete cascade, "created_at" timestamp default current_timestamp not null);
// CREATE INDEX "archive_tags_archive_tag" on "archive_tags" ("archive_id", "tag_id");
// CREATE INDEX "tags_namespace" on "tags" (namespace collate nocase);
// CREATE INDEX "tags_name" on "tags" (name collate nocase);
// CREATE INDEX "archive_tags_archive_id" on "archive_tags" ("archive_id");
// CREATE INDEX "archive_tags_tag_id" on "archive_tags" ("tag_id");
// CREATE TABLE IF NOT EXISTS "user_blacklist" ("user_id" text not null unique references "users" ("id") on delete cascade, "blacklist" text not null, "created_at" timestamp default current_timestamp not null, "updated_at" timestamp default current_timestamp not null);
// CREATE TABLE IF NOT EXISTS "collection" ("id" integer not null primary key autoincrement, "name" text not null, "slug" text not null, "user_id" text not null references "users" ("id") on delete cascade, "public" boolean default false not null, "anonymous" boolean default false not null, "protected" boolean default false not null, "created_at" timestamp default current_timestamp not null, "updated_at" timestamp default current_timestamp not null);
// CREATE INDEX "collection_name" on "collection" (name collate nocase);
// CREATE INDEX "collection_slug" on "collection" ("slug");
// CREATE TABLE IF NOT EXISTS "collection_archive" ("collection_id" integer not null references "collection" ("id") on delete cascade, "archive_id" integer not null references "archives" ("id") on delete cascade, "order" integer not null, "created_at" timestamp default current_timestamp not null, "updated_at" timestamp default current_timestamp not null, constraint "collection_archive_pkey" primary key ("collection_id", "archive_id"));
// CREATE TABLE IF NOT EXISTS "user_read_history" ("user_id" text not null references "users" ("id") on delete cascade, "archive_id" integer not null references "archives" ("id") on delete cascade, "last_page" integer not null, "start_page" integer not null, "max_page" integer not null, "started_at" timestamp default current_timestamp not null, "last_read_at" timestamp default current_timestamp not null, "finished_at" timestamp, constraint "user_read_history_pkey" primary key ("user_id", "archive_id"));
// CREATE INDEX "user_read_history_user" on "user_read_history" ("user_id");
// CREATE INDEX "user_read_history_archive" on "user_read_history" ("archive_id");
// `);

const ids = await db.selectFrom('archives').select('id').execute();

const createArchive = database.prepare(`
  INSERT INTO archives (id, hash, path, title, description, pages, thumbnail, language, size, created_at, released_at, protected)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING id
`);

const createTag = database.prepare(`
  INSERT INTO tags (id, namespace, name, display_name)
  VALUES (?, ?, ?, ?)
  ON CONFLICT (id) DO NOTHING
`);

const createArchiveTag = database.prepare(`
  INSERT INTO archive_tags (archive_id, tag_id)
  VALUES (?, ?)
`);

const createArchiveImage = database.prepare(`
  INSERT INTO archive_images (archive_id, filename, page_number, width, height)
  VALUES (?, ?, ?, ?, ?)
`);

const createArchiveSource = database.prepare(`
  INSERT INTO archive_sources (archive_id, url, name)
  VALUES (?, ?, ?)
  `);

for (const { id: _id } of ids) {
	try {
		const {
			id,
			hash,
			path,
			title,
			description,
			pages,
			thumbnail,
			language,
			size,
			createdAt,
			releasedAt,
			protected: isProtected,
			tags,
			images,
			sources,
		}: Archive = await getArchive(_id);

		const { id: newId } = createArchive.get(
			id,
			hash,
			path,
			title,
			description,
			pages,
			thumbnail,
			language,
			size,
			new Date(createdAt).toISOString(),
			releasedAt ? new Date(releasedAt).toISOString() : null,
			isProtected ? 1 : 0
		);

		for (const tag of tags) {
			createTag.run(tag.id, tag.namespace, tag.name, tag.displayName);
			createArchiveTag.run(newId, tag.id);
		}

		for (const image of images) {
			createArchiveImage.run(newId, image.filename, image.pageNumber, image.width, image.height);
		}

		for (const source of sources) {
			createArchiveSource.run(newId, source.url, source.name);
		}
	} catch (err) {
		if (err.message === 'UNIQUE constraint failed: archives.id') {
			continue;
		}
		console.error(err);
	}
}
