import type { Kysely } from 'kysely';
import { id, now } from '../helpers';

export async function up(db: Kysely<any>): Promise<void> {
	await id(db.schema, 'series')
		.addColumn('title', 'varchar(1024)', (col) => col.notNull())
		.addColumn('description', 'text')
		.addColumn('main_archive_id', 'integer', (col) => col.references('archives.id'))
		.addColumn('main_archive_cover_page', 'integer')
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.execute();

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

	await db.schema
		.createIndex('series_archive_serie')
		.on('series_archive')
		.column('series_id')
		.execute();
	await db.schema
		.createIndex('series_archive_archive')
		.on('series_archive')
		.column('archive_id')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('series_archive').execute();
	await db.schema.dropTable('series').execute();
}
