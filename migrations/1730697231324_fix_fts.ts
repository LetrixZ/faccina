import { Kysely, sql } from 'kysely';
import config from '../shared/config';

export async function up(db: Kysely<any>): Promise<void> {
	if (config.database.vendor === 'postgresql') {
		await db.schema
			.alterTable('archive_fts')
			.dropColumn('artists')
			.dropColumn('circles')
			.dropColumn('magazines')
			.dropColumn('events')
			.dropColumn('publishers')
			.dropColumn('parodies')
			.execute();

		await sql`
    ALTER TABLE archive_fts ADD COLUMN description TEXT;
    ALTER TABLE archive_fts ADD COLUMN description_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', description), 'D')) STORED;
		`.execute(db);

		await sql`
    CREATE OR REPLACE FUNCTION update_archive_fts()
			RETURNS TRIGGER AS $$
			BEGIN
				INSERT INTO archive_fts (
					archive_id,
					title,
          description,
					tags
				)
				VALUES (
					NEW.id,
					(SELECT archives.title FROM archives WHERE id = NEW.id),
					(SELECT archives.description FROM archives WHERE id = NEW.id),
					(COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.id), ''))
				)
				ON CONFLICT (archive_id) DO UPDATE SET
					title = EXCLUDED.title,
					description = EXCLUDED.description,
					tags = EXCLUDED.tags;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
    `.execute(db);

		await sql`
    CREATE OR REPLACE FUNCTION update_archive_fts_rela()
			RETURNS TRIGGER AS $$
			BEGIN
				INSERT INTO archive_fts (
					archive_id,
					title,
					description,
					tags
				)
				VALUES (
					NEW.archive_id,
					(SELECT archives.title FROM archives WHERE id = NEW.archive_id),
					(SELECT archives.description FROM archives WHERE id = NEW.archive_id),
					(COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.archive_id), ''))
				)
				ON CONFLICT (archive_id) DO UPDATE SET
					title = EXCLUDED.title,
					description = EXCLUDED.description,
					tags = EXCLUDED.tags;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
      `.execute(db);

		await sql`
    CREATE TRIGGER trigger_update_archive_fts_on_archive_tags
    AFTER INSERT OR UPDATE ON archive_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_archive_fts_rela();
    `.execute(db);
	}
}

export async function down(_db: Kysely<any>): Promise<void> {}
