import type { Kysely } from 'kysely';
import { id } from '../helpers';

const weights = [
	['illustration', 20],
	['non-h', 20],
	['ecchi', 20],
	['color', 15],
	['loli', 10],
	['shota', 10],
	['petite', 10],
	['milf', 10],
	['dilf', 10],
	['ugly bastard', 10],
	['teacher', 8],
	['futanari', 8],
	['netorare', 8],
	['rape', 8],
	['forced', 8],
	['cheating', 8],
	['cg set', 10],
	['incest', 8],
	['anal', 6],
	['kogal', 7],
	['vanilla', 7],
	['love hotel', 5],
	['schoolgirl outfit', 5],
	['western', 5],
	['group', 6],
	['dark skin', 4],
	['mating press', 3],
	['tomboy', 4],
	['busty', 4],
	['catgirl', 4],
	['monster girl', 4],
	['booty', 1],
	['pubic hair', 2],
	['blowjob', 2],
	['handjob', 2],
	['footjob', 2],
	['paizuru', 2],
	['story arc', 2],
	['creampie', 3],
];

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('tag_weights').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await id(db.schema, 'tag_weights')
		.addColumn('slug', 'varchar(500)', (col) => col.notNull())
		.addColumn('weight', 'integer', (col) => col.notNull())
		.execute();

	await db
		.insertInto('tag_weights')
		.values(weights.map(([slug, weight]) => ({ slug, weight })))
		.execute();
}
