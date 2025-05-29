import config from '~shared/config';
import { sql, type Kysely } from 'kysely';
import { id, now } from '../helpers';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('series').renameTo('series_old').execute();
	await db.schema.alterTable('series_archive').renameTo('series_archive_old').execute();

	if (config.database.vendor === 'postgresql') {
		await db.schema
			.alterTable('series_archive_old')
			.dropConstraint('series_archive_pkey')
			.execute();
	}

	await id(db.schema, 'series')
		.addColumn('title', 'varchar(1024)', (col) => col.notNull())
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.execute();

	const oldSeries = await db
		.selectFrom('series_old')
		.select(['id', 'title', 'createdAt', 'updatedAt'])
		.execute();

	if (oldSeries.length) {
		await db
			.insertInto('series')
			.values(
				oldSeries.map((series) => ({
					id: series.id,
					title: series.title,
					createdAt: series.createdAt,
					updatedAt: series.updatedAt,
				}))
			)
			.execute();
	}

	await db.schema
		.createTable('series_archive')
		.addColumn('series_id', 'integer', (col) =>
			col.notNull().references('series.id').onDelete('cascade')
		)
		.addColumn('archive_id', 'integer', (col) =>
			col.notNull().references('archives.id').onDelete('cascade')
		)
		.addColumn('order', 'integer', (col) => col.notNull())
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addPrimaryKeyConstraint('series_archive_pkey', ['series_id', 'archive_id'])
		.execute();

	const oldSeriesArchives = await db
		.selectFrom('series_archive_old')
		.select(['seriesId', 'archiveId', 'order', 'createdAt', 'updatedAt'])
		.execute();

	for (const seriesArchive of oldSeriesArchives) {
		await db
			.insertInto('series_archive')
			.values({
				seriesId: seriesArchive.seriesId,
				archiveId: seriesArchive.archiveId,
				order: seriesArchive.order,
				createdAt: seriesArchive.createdAt,
				updatedAt: seriesArchive.updatedAt,
			})
			.execute();
	}

	await db.schema.dropTable('series_archive_old').execute();
	await db.schema.dropTable('series_old').execute();

	if (config.database.vendor === 'postgresql') {
		await sql`ALTER TABLE series ADD COLUMN fts TSVECTOR;`.execute(db);
		await sql`
    CREATE OR REPLACE
    FUNCTION series_fts_update()
    RETURNS TRIGGER AS $$
      BEGIN
        UPDATE series
        SET fts = to_tsvector('simple', NEW.title)
        WHERE id = NEW.id;
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    `.execute(db);
		await sql`
    CREATE OR REPLACE TRIGGER trigger_update_fts_series
    AFTER INSERT OR UPDATE ON series
    FOR EACH ROW
    WHEN (pg_trigger_depth() <= 1)
    EXECUTE FUNCTION series_fts_update();
    `.execute(db);
		await sql`UPDATE series SET id = id`.execute(db);
	} else {
		await sql`CREATE VIRTUAL TABLE series_fts USING fts5 (title)`.execute(db);
		await sql`
		CREATE TRIGGER trigger_insert_fts_series AFTER INSERT ON series
		BEGIN
			INSERT INTO series_fts (rowid, title)
			VALUES (new.rowid, new.title);
		END;`.execute(db);
		await sql`
		CREATE TRIGGER trigger_update_fts_series AFTER UPDATE ON series
		BEGIN
			UPDATE series_fts SET title = new.title
			WHERE rowid = new.rowid;
		END;`.execute(db);
		await sql`
		CREATE TRIGGER trigger_delete_fts_series AFTER DELETE ON series
		BEGIN
			DELETE FROM series_fts WHERE rowid = old.rowid;
		END;`.execute(db);
		await sql`
		INSERT INTO series_fts (rowid, title)
		SELECT series.id, series.title FROM series
		`.execute(db);
	}
}
