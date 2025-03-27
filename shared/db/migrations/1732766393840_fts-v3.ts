import config from '../../config';
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	if (config.database.vendor === 'postgresql') {
		await sql`DROP TABLE archive_fts;`.execute(db);
		await sql`DROP FUNCTION update_archive_fts CASCADE;`.execute(db);
		await sql`DROP FUNCTION update_archive_fts_rela CASCADE;`.execute(db);

		await sql`ALTER TABLE archives ADD COLUMN fts TSVECTOR;`.execute(db);

		await sql`
    CREATE OR REPLACE
    FUNCTION archive_fts_update()
    RETURNS TRIGGER AS $$
      BEGIN
        UPDATE archives
        SET fts = (
          to_tsvector('simple', NEW.title) ||
          to_tsvector('simple', COALESCE(NEW.description, '')) ||
          to_tsvector('simple', (COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.id), '')))
        )
        WHERE id = NEW.id;
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    `.execute(db);

		await sql`
    CREATE OR REPLACE TRIGGER trigger_update_fts_archives
    AFTER INSERT OR UPDATE ON archives
    FOR EACH ROW
    WHEN (pg_trigger_depth() <= 1)
    EXECUTE FUNCTION archive_fts_update();
    `.execute(db);

		await sql`
    CREATE OR REPLACE FUNCTION archive_fts_tags_update()
    RETURNS TRIGGER AS $$
      BEGIN
        UPDATE archives
        SET fts = (
          to_tsvector('simple', (SELECT title FROM archives WHERE id = NEW.archive_id)) ||
          to_tsvector('simple', COALESCE((SELECT description FROM archives WHERE id = NEW.archive_id), '')) ||
          to_tsvector('simple', (COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.archive_id), '')))
        )
        WHERE id = NEW.archive_id;
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    `.execute(db);

		await sql`
    CREATE OR REPLACE TRIGGER trigger_update_fts_archives_tags
    AFTER INSERT OR UPDATE ON archive_tags
    FOR EACH ROW
    EXECUTE FUNCTION archive_fts_tags_update();
    `.execute(db);

		await sql`UPDATE archives SET id = id`.execute(db);
	}
}

export async function down(db: Kysely<any>): Promise<void> {
	if (config.database.vendor === 'postgresql') {
		await sql`ALTER TABLE archives DROP COLUMN fts;`.execute(db);
	}
}
