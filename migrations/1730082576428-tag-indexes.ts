import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.createIndex('tags_namespace').on('tags').column('namespace').execute();
	await db.schema.createIndex('tags_name').on('tags').column('name').execute();
	await db.schema
		.createIndex('archive_tags_archive_tag')
		.on('archive_tags')
		.columns(['archive_id', 'tags_id'])
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('tags_namespace').execute();
	await db.schema.dropIndex('tags_name').execute();
	await db.schema.dropIndex('archive_tags_archive_tag').execute();
}
