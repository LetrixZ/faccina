import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.createIndex('archive_description').on('archives').column('description').execute();
	await db.schema.createIndex('archive_released_at').on('archives').column('released_at').execute();
	await db.schema.createIndex('archive_created_at').on('archives').column('created_at').execute();

	await db.schema
		.createIndex('archive_sources_archive_id')
		.on('archive_sources')
		.column('archive_id')
		.execute();
	await db.schema.createIndex('archive_sources_url').on('archive_sources').column('url').execute();
	await db.schema
		.createIndex('archive_sources_name')
		.on('archive_sources')
		.column('name')
		.execute();

	await db.schema
		.createIndex('archive_images_archive_id')
		.on('archive_images')
		.column('archive_id')
		.execute();
	await db.schema
		.createIndex('archive_images_page_number')
		.on('archive_images')
		.column('page_number')
		.execute();
	await db.schema
		.createIndex('archive_images_filename')
		.on('archive_images')
		.column('filename')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('archive_description').execute();
	await db.schema.dropIndex('archive_released_at').execute();
	await db.schema.dropIndex('archive_created_at').execute();
	await db.schema.dropIndex('archive_sources_archive_id').execute();
	await db.schema.dropIndex('archive_sources_url').execute();
	await db.schema.dropIndex('archive_sources_name').execute();
	await db.schema.dropIndex('archive_images_archive_id').execute();
	await db.schema.dropIndex('archive_images_page_number').execute();
	await db.schema.dropIndex('archive_images_filename').execute();
}
