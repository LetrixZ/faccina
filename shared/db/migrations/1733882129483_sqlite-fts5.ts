import { sql, type Kysely } from 'kysely';
import config from '~shared/config';

export async function up(db: Kysely<any>): Promise<void> {
	if (config.database.vendor === 'sqlite') {
		await sql`CREATE VIRTUAL TABLE archives_fts USING fts5 (title, tags)`.execute(db);
		await sql`
		CREATE TRIGGER trigger_insert_fts_archives AFTER INSERT ON archives
		BEGIN
			INSERT INTO archives_fts (rowid, title)
			VALUES (new.rowid, new.title);
		END;`.execute(db);
		await sql`
		CREATE TRIGGER trigger_update_fts_archives AFTER UPDATE ON archives
		BEGIN
			UPDATE archives_fts SET title = new.title
			WHERE rowid = new.rowid;
		END;`.execute(db);
		await sql`
		CREATE TRIGGER trigger_delete_fts_archives AFTER DELETE ON archives
		BEGIN
			DELETE FROM archives_fts WHERE rowid = old.rowid;
		END;`.execute(db);
		await sql`
		CREATE TRIGGER trigger_insert_fts_archives_tags AFTER INSERT ON archive_tags
		BEGIN
			UPDATE archives_fts SET
				tags = (coalesce((SELECT group_concat(tags.name, ' ') FROM archive_tags INNER JOIN tags ON tags.id = archive_tags.tag_id WHERE archive_tags.archive_id = new.archive_id), ''))
			WHERE rowid = new.archive_id;
		END;`.execute(db);
		await sql`
		CREATE TRIGGER trigger_delete_fts_archives_tags AFTER DELETE ON archive_tags
		BEGIN
			UPDATE archives_fts SET
				tags = (coalesce((SELECT group_concat(tags.name, ' ') FROM archive_tags INNER JOIN tags ON tags.id = archive_tags.tag_id WHERE archive_tags.archive_id = old.archive_id), ''))
			WHERE rowid = old.archive_id;
		END;`.execute(db);
		await sql`
		INSERT INTO archives_fts (rowid, title, tags)
		SELECT
			archives.id,
			archives.title,
			(coalesce((SELECT group_concat(tags.name, ' ') FROM archive_tags INNER JOIN tags ON tags.id = archive_tags.tag_id WHERE archive_tags.archive_id = archives.id), ''))
		FROM ARCHIVES
		`.execute(db);
	}
}

export async function down(db: Kysely<any>): Promise<void> {
	if (config.database.vendor === 'sqlite') {
		await sql`DROP TABLE archives_fts`.execute(db);
		await sql`DROP TRIGGER trigger_insert_fts_archives;`.execute(db);
		await sql`DROP TRIGGER trigger_update_fts_archives;`.execute(db);
		await sql`DROP TRIGGER trigger_delete_fts_archives;`.execute(db);
		await sql`DROP TRIGGER trigger_insert_fts_archives_tags;`.execute(db);
		await sql`DROP TRIGGER trigger_delete_fts_archives_tags;`.execute(db);
	}
}
