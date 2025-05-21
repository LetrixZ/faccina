import chalk from 'chalk';
import { type Kysely, sql } from 'kysely';
import config from '../../config';
import { taxonomyTables } from '../../taxonomy';
import { id, now } from '../helpers';

export async function up(db: Kysely<any>): Promise<void> {
	if (config.database.vendor === 'postgresql') {
		const tableExists = Boolean(
			await db
				.selectFrom('information_schema.tables')
				.where('table_schema', '=', 'public')
				.where('table_name', '=', '_sqlx_migrations')
				.executeTakeFirst()
		);

		if (tableExists) {
			const existingMigrations = await db
				.selectFrom('_sqlx_migrations')
				.select(['version', 'description'])
				.orderBy('version', 'asc')
				.execute();

			if (existingMigrations?.length) {
				const lastMigration = existingMigrations.at(-1);

				if (lastMigration?.version === 20240622180546) {
					await db.schema
						.alterTable('archives')
						.addUniqueConstraint('archive_path_key', ['path'])
						.execute();
					await db.schema
						.alterTable('archive_sources')
						.dropConstraint('archive_sources_pkey')
						.execute();
					await db.schema
						.alterTable('archive_sources')
						.addPrimaryKeyConstraint('archive_sources_pkey', ['archive_id', 'url'])
						.execute();

					return;
				} else {
					console.error(
						`Expected the last migration to be ${chalk.bold(20240622180546)}, but the latest migration found was ${chalk.bold(lastMigration?.version)}. It is not safe to continue. Please migrate it manually to the latest version using the old Rust server.`
					);

					throw new Error('Migration failed');
				}
			}
		}
	}

	await id(db.schema, 'archives')
		.addColumn('slug', 'varchar(1024)', (col) => col.notNull())
		.addColumn('title', 'varchar(1024)', (col) => col.notNull())
		.addColumn('description', 'text')
		.addColumn('path', 'text', (col) => col.unique().notNull())
		.addColumn('hash', 'text', (col) => col.unique().notNull())
		.addColumn('pages', 'integer', (col) => col.notNull())
		.addColumn('size', 'integer', (col) => col.notNull())
		.addColumn('thumbnail', 'integer', (col) => col.notNull().defaultTo(1))
		.addColumn('language', 'varchar')
		.addColumn('released_at', 'timestamp')
		.addColumn('has_metadata', 'boolean', (col) => col.defaultTo(false))
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('deleted_at', 'timestamp')
		.execute();

	await db.schema.createIndex('archive_slug').on('archives').column('slug').execute();
	await db.schema.createIndex('archive_title').on('archives').column('title').execute();
	await db.schema.createIndex('archive_path').on('archives').column('path').execute();
	await db.schema.createIndex('archive_pages').on('archives').column('pages').execute();
	await db.schema.createIndex('archive_deleted_at').on('archives').column('deleted_at').execute();

	for (const { relationId, relationTable, referenceTable } of taxonomyTables) {
		await id(db.schema, referenceTable)
			.addColumn('slug', 'varchar(500)', (col) => col.unique().notNull())
			.addColumn('name', 'varchar(500)', (col) => col.unique().notNull())
			.execute();

		const relation = db.schema
			.createTable(relationTable)
			.addColumn(relationId, 'integer', (col) =>
				col.references(`${referenceTable}.id`).onDelete('cascade').notNull()
			)
			.addColumn('archive_id', 'integer', (col) =>
				col.references('archives.id').onDelete('cascade').notNull()
			);

		if (referenceTable === 'tags') {
			await relation
				.addColumn('namespace', 'varchar(500)', (col) => col.notNull())
				.addPrimaryKeyConstraint(`archive_tags_pkey`, ['tag_id', 'archive_id', 'namespace'])
				.execute();

			await db.schema
				.createIndex(`archive_tags_tag_id`)
				.on('archive_tags')
				.column('tag_id')
				.execute();
			await db.schema
				.createIndex(`archive_tags_namespace`)
				.on('archive_tags')
				.column('namespace')
				.execute();
		} else {
			await relation
				.addPrimaryKeyConstraint(`${relationTable}_pkey`, [relationId, 'archive_id'])
				.execute();
			await db.schema
				.createIndex(`${relationTable}_${relationId}`)
				.on(relationTable)
				.column(relationId)
				.execute();
		}

		await db.schema
			.createIndex(`${relationTable}_archive_id`)
			.on(relationTable)
			.column('archive_id')
			.execute();
	}

	await db.schema
		.createTable('archive_sources')
		.addColumn('archive_id', 'integer', (col) =>
			col.references('archives.id').onDelete('cascade').notNull()
		)
		.addColumn('name', 'varchar(500)', (col) => col.notNull())
		.addColumn('url', 'text')
		.addUniqueConstraint('archive_sources_pkey', ['archive_id', 'url'])
		.execute();

	await db.schema
		.createTable('archive_images')
		.addColumn('archive_id', 'integer', (col) =>
			col.references('archives.id').onDelete('cascade').notNull()
		)
		.addColumn('filename', 'text', (col) => col.notNull())
		.addColumn('page_number', 'integer', (col) => col.notNull())
		.addColumn('width', 'integer')
		.addColumn('height', 'integer')
		.addPrimaryKeyConstraint('archive_images_pkey', ['archive_id', 'page_number'])
		.execute();

	if (config.database.vendor === 'postgresql') {
		await sql`
			CREATE EXTENSION IF NOT EXISTS pg_trgm;
			SET pg_trgm.similarity_threshold = 0.075;

			CREATE TABLE archive_fts (
				archive_id INT PRIMARY KEY REFERENCES archives(id) ON DELETE CASCADE,
				title TEXT NOT NULL,
				title_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', title), 'A')) STORED,
				artists TEXT NOT NULL,
				artists_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', artists), 'B')) STORED,
				circles TEXT NOT NULL,
				circles_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', circles), 'C')) STORED,
				magazines TEXT NOT NULL,
				magazines_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', magazines), 'D')) STORED,
				events TEXT NOT NULL,
				events_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', events), 'D')) STORED,
				publishers TEXT NOT NULL,
				publishers_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', publishers), 'D')) STORED,
				parodies TEXT NOT NULL,
				parodies_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', parodies), 'D')) STORED,
				tags TEXT NOT NULL,
				tags_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', tags), 'D')) STORED
			);

			CREATE INDEX title_tsv_archive_fts_idx ON archive_fts USING GIN(title_tsv);

			CREATE INDEX artists_archive_fts_idx ON archive_fts USING GIST(artists GIST_TRGM_OPS);
			CREATE INDEX artists_tsv_archive_fts_idx ON archive_fts USING GIN(artists_tsv);

			CREATE INDEX circles_archive_fts_idx ON archive_fts USING GIST(circles GIST_TRGM_OPS);
			CREATE INDEX circles_tsv_archive_fts_idx ON archive_fts USING GIN(circles_tsv);

			CREATE INDEX magazines_archive_fts_idx ON archive_fts USING GIST(magazines GIST_TRGM_OPS);
			CREATE INDEX magazines_tsv_archive_fts_idx ON archive_fts USING GIN(magazines_tsv);

			CREATE INDEX events_archive_fts_idx ON archive_fts USING GIST(events GIST_TRGM_OPS);
			CREATE INDEX events_tsv_archive_fts_idx ON archive_fts USING GIN(events_tsv);

			CREATE INDEX publishers_archive_fts_idx ON archive_fts USING GIST(publishers GIST_TRGM_OPS);
			CREATE INDEX publishers_tsv_archive_fts_idx ON archive_fts USING GIN(publishers_tsv);

			CREATE INDEX parodies_archive_fts_idx ON archive_fts USING GIST(parodies GIST_TRGM_OPS);
			CREATE INDEX parodies_tsv_archive_fts_idx ON archive_fts USING GIN(parodies_tsv);

			CREATE INDEX tags_archive_fts_idx ON archive_fts USING GIST(tags GIST_TRGM_OPS);
			CREATE INDEX tags_tsv_archive_fts_idx ON archive_fts USING GIN(tags_tsv);

			CREATE OR REPLACE FUNCTION update_archive_fts()
			RETURNS TRIGGER AS $$
			BEGIN
				INSERT INTO archive_fts (
					archive_id,
					title,
					artists,
					circles,
					magazines,
					events,
					publishers,
					parodies,
					tags
				)
				VALUES (
					NEW.id,
					(SELECT archives.title FROM archives WHERE id = NEW.id),
					(COALESCE((SELECT string_agg(artists.name, ' ') FROM artists INNER JOIN archive_artists r ON r.artist_id = artists.id  WHERE r.archive_id = NEW.id), '')),
					(COALESCE((SELECT string_agg(circles.name, ' ') FROM circles INNER JOIN archive_circles r ON r.circle_id = circles.id  WHERE r.archive_id = NEW.id), '')),
					(COALESCE((SELECT string_agg(magazines.name, ' ') FROM magazines INNER JOIN archive_magazines r ON r.magazine_id = magazines.id  WHERE r.archive_id = NEW.id), '')),
					(COALESCE((SELECT string_agg(events.name, ' ') FROM events INNER JOIN archive_events r ON r.event_id = events.id  WHERE r.archive_id = NEW.id), '')),
					(COALESCE((SELECT string_agg(publishers.name, ' ') FROM publishers INNER JOIN archive_publishers r ON r.publisher_id = publishers.id  WHERE r.archive_id = NEW.id), '')),
					(COALESCE((SELECT string_agg(parodies.name, ' ') FROM parodies INNER JOIN archive_parodies r ON r.parody_id = parodies.id  WHERE r.archive_id = NEW.id), '')),
					(COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.id), ''))
				)
				ON CONFLICT (archive_id) DO UPDATE SET
					title = EXCLUDED.title,
					artists = EXCLUDED.artists,
					magazines = EXCLUDED.magazines,
					events = EXCLUDED.events,
					circles = EXCLUDED.circles,
					publishers = EXCLUDED.publishers,
					parodies = EXCLUDED.parodies,
					tags = EXCLUDED.tags;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;

			CREATE OR REPLACE FUNCTION update_archive_fts_rela()
			RETURNS TRIGGER AS $$
			BEGIN
				INSERT INTO archive_fts (
					archive_id,
					title,
					artists,
					circles,
					magazines,
					events,
					publishers,
					parodies,
					tags
				)
				VALUES (
					NEW.archive_id,
					(SELECT archives.title FROM archives WHERE id = NEW.archive_id),
					(COALESCE((SELECT string_agg(artists.name, ' ') FROM artists INNER JOIN archive_artists r ON r.artist_id = artists.id  WHERE r.archive_id = NEW.archive_id), '')),
					(COALESCE((SELECT string_agg(circles.name, ' ') FROM circles INNER JOIN archive_circles r ON r.circle_id = circles.id  WHERE r.archive_id = NEW.archive_id), '')),
					(COALESCE((SELECT string_agg(magazines.name, ' ') FROM magazines INNER JOIN archive_magazines r ON r.magazine_id = magazines.id  WHERE r.archive_id = NEW.archive_id), '')),
					(COALESCE((SELECT string_agg(events.name, ' ') FROM events INNER JOIN archive_events r ON r.event_id = events.id  WHERE r.archive_id = NEW.archive_id), '')),
					(COALESCE((SELECT string_agg(publishers.name, ' ') FROM publishers INNER JOIN archive_publishers r ON r.publisher_id = publishers.id  WHERE r.archive_id = NEW.archive_id), '')),
					(COALESCE((SELECT string_agg(parodies.name, ' ') FROM parodies INNER JOIN archive_parodies r ON r.parody_id = parodies.id  WHERE r.archive_id = NEW.archive_id), '')),
					(COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.archive_id), ''))
				)
				ON CONFLICT (archive_id) DO UPDATE SET
					title = EXCLUDED.title,
					artists = EXCLUDED.artists,
					magazines = EXCLUDED.magazines,
					events = EXCLUDED.events,
					circles = EXCLUDED.circles,
					publishers = EXCLUDED.publishers,
					parodies = EXCLUDED.parodies,
					tags = EXCLUDED.tags;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;

			CREATE TRIGGER trigger_update_archive_fts_on_archives
			AFTER INSERT OR UPDATE ON archives
			FOR EACH ROW
			EXECUTE FUNCTION update_archive_fts();

			CREATE TRIGGER trigger_update_archive_fts_on_archive_artists
			AFTER INSERT OR UPDATE ON archive_artists
			FOR EACH ROW
			EXECUTE FUNCTION update_archive_fts_rela();

			CREATE TRIGGER trigger_update_archive_fts_on_archive_circles
			AFTER INSERT OR UPDATE ON archive_circles
			FOR EACH ROW
			EXECUTE FUNCTION update_archive_fts_rela();

			CREATE TRIGGER trigger_update_archive_fts_on_archive_magazines
			AFTER INSERT OR UPDATE ON archive_magazines
			FOR EACH ROW
			EXECUTE FUNCTION update_archive_fts_rela();

			CREATE TRIGGER trigger_update_archive_fts_on_archive_events
			AFTER INSERT OR UPDATE ON archive_events
			FOR EACH ROW
			EXECUTE FUNCTION update_archive_fts_rela();

			CREATE TRIGGER trigger_update_archive_fts_on_archive_publishers
			AFTER INSERT OR UPDATE ON archive_publishers
			FOR EACH ROW
			EXECUTE FUNCTION update_archive_fts_rela();

			CREATE TRIGGER trigger_update_archive_fts_on_archive_parodies
			AFTER INSERT OR UPDATE ON archive_parodies
			FOR EACH ROW
			EXECUTE FUNCTION update_archive_fts_rela();
			
			CREATE TRIGGER trigger_update_archive_fts_on_archive_tags
			AFTER INSERT OR UPDATE ON archive_tags
			FOR EACH ROW
			EXECUTE FUNCTION update_archive_fts_rela();`.execute(db);
	}
}

export async function down(db: Kysely<any>): Promise<void> {
	if (config.database.vendor === 'postgresql') {
		await db.schema.dropTable('archive_fts').ifExists().execute();
		await sql`
		DROP TRIGGER IF EXISTS trigger_update_archive_fts_on_archives ON archives;
		DROP TRIGGER trigger_update_archive_fts_on_archive_artists ON archive_artists;
		DROP TRIGGER trigger_update_archive_fts_on_archive_circles ON archive_circles;
		DROP TRIGGER trigger_update_archive_fts_on_archive_magazines ON archive_magazines;
		DROP TRIGGER trigger_update_archive_fts_on_archive_events ON archive_events;
		DROP TRIGGER trigger_update_archive_fts_on_archive_publishers ON archive_publishers;
		DROP TRIGGER trigger_update_archive_fts_on_archive_parodies ON archive_parodies;
		DROP TRIGGER trigger_update_archive_fts_on_archive_tags ON archive_tags;
		DROP FUNCTION update_archive_fts();
		DROP FUNCTION update_archive_fts_rela();
		`.execute(db);
	}

	await db.schema.dropTable('archive_images').ifExists().execute();
	await db.schema.dropTable('archive_sources').ifExists().execute();

	for (const { relationTable, referenceTable } of taxonomyTables) {
		await db.schema.dropTable(relationTable).ifExists().execute();
		await db.schema.dropTable(referenceTable).ifExists().execute();
	}

	await db.schema.dropTable('archives').ifExists().execute();
}
