import { now } from '../helpers';
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('users')
		.addColumn('id', 'text', (col) => col.notNull().primaryKey())
		.addColumn('username', 'varchar', (col) => col.unique().notNull())
		.addColumn('password_hash', 'text', (col) => col.notNull())
		.addColumn('email', 'text')
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.execute();

	await db.schema
		.createTable('user_sessions')
		.addColumn('id', 'text', (col) => col.primaryKey())
		.addColumn('expires_at', 'timestamp', (col) => col.notNull())
		.addColumn('user_id', 'text', (col) => col.references('users.id').onDelete('cascade').notNull())
		.execute();

	await db.schema
		.createTable('user_favorites')
		.addColumn('user_id', 'text', (col) => col.references('users.id').onDelete('cascade').notNull())
		.addColumn('archive_id', 'integer', (col) =>
			col.references('archives.id').onDelete('cascade').notNull()
		)
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('user_favorites').execute();
	await db.schema.dropTable('user_sessions').execute();
	await db.schema.dropTable('users').execute();
}
