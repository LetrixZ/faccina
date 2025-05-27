import {
	CamelCasePlugin,
	type Dialect,
	Kysely,
	ParseJSONResultsPlugin,
	PostgresDialect,
} from 'kysely';
import { defineConfig } from 'kysely-ctl';
import type { IGenericSqlite } from 'kysely-generic-sqlite';
import { buildQueryFn, GenericSqliteDialect, parseBigInt } from 'kysely-generic-sqlite';
import { DatabaseSync } from 'node:sqlite';
import connection from '../shared/db/connection';
import type { DB } from '../shared/db/types';

let dialect: Dialect | undefined = undefined;

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

export default defineConfig({
	kysely: db,
	migrations: { migrationFolder: 'shared/db/migrations' },
});
