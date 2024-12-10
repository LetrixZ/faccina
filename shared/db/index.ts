import { Database } from 'bun:sqlite';
import {
	CamelCasePlugin,
	type Dialect,
	Kysely,
	ParseJSONResultsPlugin,
	PostgresDialect,
} from 'kysely';
import { BunSqliteDialect } from 'kysely-bun-sqlite';
import { Pool } from 'pg';
import config from '../config';
import type { DB } from '../types';
import connection from './connection';
import migrations from './migrations';

export const databaseType = config.database.vendor;

let dialect: Dialect | undefined = undefined;

if (connection instanceof Pool) {
	dialect = new PostgresDialect({ pool: connection });
} else if (connection instanceof Database) {
	dialect = new BunSqliteDialect({ database: connection });
}

if (!dialect) {
	throw new Error('Failed to configure a database connection');
}

const db = new Kysely<DB>({
	dialect,
	plugins: [new CamelCasePlugin(), new ParseJSONResultsPlugin()],
});

await migrations(db);

export default db;
