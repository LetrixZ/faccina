import { Database } from 'bun:sqlite';
import {
	CamelCasePlugin,
	type Dialect,
	Kysely,
	ParseJSONResultsPlugin,
	PostgresDialect,
} from 'kysely';
import { BunSqliteDialect } from 'kysely-bun-sqlite';
import { defineConfig } from 'kysely-ctl';
import { Pool } from 'pg';
import type { DB } from '../shared/types';
import connection from '../shared/db/connection';

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

export default defineConfig({
	kysely: db,
	migrations: {
		migrationFolder: 'migrations',
	},
});
