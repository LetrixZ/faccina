import { now } from '../helpers';
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('user_read_history')
		.addColumn('user_id', 'text', (col) => col.notNull().references('users.id').onDelete('cascade'))
		.addColumn('archive_id', 'integer', (col) =>
			col.notNull().references('archives.id').onDelete('cascade')
		)
		.addColumn('last_page', 'integer', (col) => col.notNull())
		.addColumn('start_page', 'integer', (col) => col.notNull())
		.addColumn('max_page', 'integer', (col) => col.notNull())
		.addColumn('started_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('last_read_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('finished_at', 'timestamp')
		.addPrimaryKeyConstraint('user_read_history_pkey', ['user_id', 'archive_id'])
		.execute();

	await db.schema
		.createIndex('user_read_history_user')
		.on('user_read_history')
		.column('user_id')
		.execute();
	await db.schema
		.createIndex('user_read_history_archive')
		.on('user_read_history')
		.columns(['archive_id'])
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('user_read_history_archive').execute();
	await db.schema.dropIndex('user_read_history_user').execute();
	await db.schema.dropTable('user_read_history').execute();
}
