import {
	CamelCasePlugin,
	type Dialect,
	Kysely,
	ParseJSONResultsPlugin,
	PostgresDialect,
} from 'kysely';
import { defineConfig } from 'kysely-ctl';
import pg from 'pg';
import connection from '../shared/db/connection';
import { LibsqlDialect } from '../shared/db/kysely-libsql';
import type { DB } from '../shared/types';

let dialect: Dialect | undefined = undefined;

if (connection instanceof pg.Pool) {
	dialect = new PostgresDialect({ pool: connection });
} else {
	dialect = new LibsqlDialect({ client: connection });
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
