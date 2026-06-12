import type { Kysely } from 'kysely';
import config from '~shared/config.js';

export async function up(db: Kysely<unknown>): Promise<void> {
	if (config.database.vendor === 'postgresql') {
		await db.schema
			.alterTable('archives')
			.alterColumn('size', (ac) => ac.setDataType('bigint'))
			.execute();
	}
}

export async function down(db: Kysely<unknown>): Promise<void> {
	if (config.database.vendor === 'postgresql') {
		await db.schema
			.alterTable('archives')
			.alterColumn('size', (ac) => ac.setDataType('integer'))
			.execute();
	}
}
