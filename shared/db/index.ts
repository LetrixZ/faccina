import {
	CamelCasePlugin,
	type Dialect,
	Kysely,
	ParseJSONResultsPlugin,
	PostgresDialect,
	SqliteDialect,
} from 'kysely';
import pg from 'pg';
import config from '../config';
import type { DB } from '../types';
import connection from './connection';
import migrations from './migrations';
import { SqliteBooleanPlugin } from './sqlite-bool';
import { isBun } from '~shared/utils';

export const databaseType = config.database.vendor;

let dialect: Dialect | undefined = undefined;

if (connection instanceof pg.Pool) {
	dialect = new PostgresDialect({ pool: connection });
} else {
	if (isBun) {
		const { BunSqliteDialect } = await import('kysely-bun-sqlite');
		dialect = new BunSqliteDialect({ database: connection });
	} else {
		dialect = new SqliteDialect({ database: connection });
	}
}

if (!dialect) {
	throw new Error('Failed to configure a database connection');
}

const db = new Kysely<DB>({
	dialect,
	plugins: [new CamelCasePlugin(), new ParseJSONResultsPlugin(), new SqliteBooleanPlugin()],
});

await migrations(db);

export default db;
