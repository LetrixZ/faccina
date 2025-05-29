import { id } from '../helpers';
import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await id(db.schema, 'tag_weights')
		.addColumn('slug', 'varchar(500)', (col) => col.notNull())
		.addColumn('weight', 'integer', (col) => col.notNull())
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('tag_weights').execute();
}
