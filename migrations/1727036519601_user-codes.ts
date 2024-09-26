import type { Kysely } from 'kysely';

import { now } from '../shared/db/helpers';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('user_codes')
		.addColumn('user_id', 'text', (col) => col.references('users.id').onDelete('cascade').notNull())
		.addColumn('code', 'text', (col) => col.unique().notNull())
		.addColumn('type', 'varchar', (col) => col.notNull())
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('consumed_at', 'timestamp')
		.execute();

	await db.schema
		.createIndex('user_codes_code_type')
		.on('user_codes')
		.columns(['code', 'type'])
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('user_codes_code_type').execute();
	await db.schema.dropTable('user_codes').execute();
}
