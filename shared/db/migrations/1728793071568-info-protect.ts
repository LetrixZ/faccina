import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('archives')
		.addColumn('protected', 'boolean', (col) => col.notNull().defaultTo(false))
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('archives').dropColumn('protected').execute();
}
