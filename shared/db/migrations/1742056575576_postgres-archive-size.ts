import config from '~shared/config';
import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	if (config.database.vendor === 'postgresql') {
		await db.schema
			.alterTable('archives')
			.alterColumn('size', (ac) => ac.setDataType('bigint'))
			.execute();
	}
}

export async function down(db: Kysely<any>): Promise<void> {
	if (config.database.vendor === 'postgresql') {
		await db.schema
			.alterTable('archives')
			.alterColumn('size', (ac) => ac.setDataType('integer'))
			.execute();
	}
}
