import config from '../../config';
import { id, now } from '../helpers';
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('user_blacklist')
		.addColumn('user_id', 'text', (col) =>
			col.notNull().unique().references('users.id').onDelete('cascade')
		)
		.addColumn('blacklist', 'text', (col) => col.notNull())
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.execute();

	await id(db.schema, 'collection')
		.addColumn('name', 'text', (col) => col.notNull())
		.addColumn('slug', 'text', (col) => col.notNull())
		.addColumn('user_id', 'text', (col) => col.notNull().references('users.id').onDelete('cascade'))
		.addColumn('public', 'boolean', (col) => col.notNull().defaultTo(false))
		.addColumn('anonymous', 'boolean', (col) => col.notNull().defaultTo(false))
		.addColumn('protected', 'boolean', (col) => col.notNull().defaultTo(false))
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.execute();

	await db.schema
		.createIndex('collection_name')
		.on('collection')
		.expression(config.database.vendor === 'sqlite' ? sql`name collate nocase` : sql`name`)
		.execute();

	await db.schema.createIndex('collection_slug').on('collection').column('slug').execute();

	await db.schema
		.createTable('collection_archive')
		.addColumn('collection_id', 'integer', (col) =>
			col.notNull().references('collection.id').onDelete('cascade')
		)
		.addColumn('archive_id', 'integer', (col) =>
			col.notNull().references('archives.id').onDelete('cascade')
		)
		.addColumn('order', 'integer', (col) => col.notNull())
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addPrimaryKeyConstraint('collection_archive_pkey', ['collection_id', 'archive_id'])
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('collection_slug').execute();
	await db.schema.dropIndex('collection_name').execute();
	await db.schema.dropTable('collection_archive').execute();
	await db.schema.dropTable('collection').execute();
	await db.schema.dropTable('user_blacklist').execute();
}
