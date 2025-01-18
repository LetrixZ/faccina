import { sql, type Kysely } from 'kysely';
import config from '~shared/config';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('series').dropColumn('description').execute();
	await db.schema.alterTable('series').dropColumn('main_archive_id').execute();
	await db.schema.alterTable('series').dropColumn('main_archive_cover_page').execute();

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
