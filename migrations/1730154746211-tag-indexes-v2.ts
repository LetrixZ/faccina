import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('tags_namespace').execute();
	await db.schema.dropIndex('tags_name').execute();

	await db.schema
		.createIndex('tags_namespace')
		.on('tags')
		.expression(sql`namespace collate nocase`)
		.execute();
	await db.schema
		.createIndex('tags_name')
		.on('tags')
		.expression(sql`name collate nocase`)
		.execute();

	await db.schema
		.createIndex('archive_tags_archive_id')
		.on('archive_tags')
		.column('archive_id')
		.execute();
	await db.schema.createIndex('archive_tags_tag_id').on('archive_tags').column('tag_id').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('archive_tags_tag_id').execute();
	await db.schema.dropIndex('archive_tags_archive_id').execute();
	await db.schema.dropIndex('tags_namespace').execute();
	await db.schema.dropIndex('tags_name').execute();

	await db.schema.createIndex('tags_namespace').on('tags').column('namespace').execute();
	await db.schema.createIndex('tags_name').on('tags').column('name').execute();
}
