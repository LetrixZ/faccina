import {
	CamelCasePlugin,
	type Dialect,
	Kysely,
	ParseJSONResultsPlugin,
	PostgresDialect,
} from 'kysely';
import { buildQueryFn, GenericSqliteDialect, parseBigInt } from 'kysely-generic-sqlite';
import { DatabaseSync } from 'node:sqlite';
import type { DB } from './types';
import config from '../config';
import connection from './connection';
import { migrateToLatest } from './migrations';
import type { IGenericSqlite } from 'kysely-generic-sqlite';

export const databaseType = config.database.vendor;

/** https://github.com/kysely-org/kysely/issues/1292#issuecomment-2670341588 */
function createSqliteExecutor(db: DatabaseSync): IGenericSqlite<DatabaseSync> {
	const getStmt = (sql: string) => {
		const stmt = db.prepare(sql);
		stmt.setReadBigInts(true);
		return stmt;
	};

	return {
		db,
		query: buildQueryFn({
			all: (sql, parameters = []) => getStmt(sql).all(...parameters),
			run: (sql, parameters = []) => {
				const { changes, lastInsertRowid } = getStmt(sql).run(...parameters);
				return {
					insertId: parseBigInt(lastInsertRowid),
					numAffectedRows: parseBigInt(changes),
				};
			},
		}),
		close: () => db.close(),
		iterator: (isSelect, sql, parameters = []) => {
			if (!isSelect) {
				throw new Error('Only support select in stream()');
			}
			return getStmt(sql).iterate(...parameters) as any;
		},
	};
}

let dialect: Dialect | undefined = undefined;

if (connection instanceof DatabaseSync) {
	const nodeConnection = connection;
	dialect = new GenericSqliteDialect(() => createSqliteExecutor(nodeConnection));
} else {
	dialect = new PostgresDialect({ pool: connection });
}

if (!dialect) {
	throw new Error('Failed to configure a database connection');
}

const db = new Kysely<DB>({
	dialect,
	plugins: [new CamelCasePlugin(), new ParseJSONResultsPlugin()],
});

await migrateToLatest(db);

export default db;
