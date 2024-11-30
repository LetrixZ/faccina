import type { Client } from '@libsql/client';
import {
	CamelCasePlugin,
	type Dialect,
	Kysely,
	ParseJSONResultsPlugin,
	PostgresDialect,
} from 'kysely';
import pg from 'pg';
import config from '../config';
import type { DB } from '../types';
import { LibsqlDialect } from './kysely-libsql';
import connection from './connection';
import migrations from './migrations';

export const databaseType = config.database.vendor;

let dialect: Dialect | undefined = undefined;

if (connection instanceof pg.Pool) {
	dialect = new PostgresDialect({ pool: connection });
} else {
	dialect = new LibsqlDialect({ client: connection as Client });
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
