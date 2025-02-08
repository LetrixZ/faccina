import {
	CamelCasePlugin,
	type Dialect,
	Kysely,
	ParseJSONResultsPlugin,
	PostgresDialect,
} from 'kysely';
import { BunSqliteDialect } from 'kysely-bun-sqlite';
import { LibsqlDialect } from 'kysely-libsql';
import config from '../config';
import connection from './connection';
import migrations from './migrations';
import type { DB } from './types';

export const databaseType = config.database.vendor;

let dialect: Dialect | undefined = undefined;

switch (connection.type) {
	case 'bun:sqlite':
		dialect = new BunSqliteDialect({ database: connection.connection });
		break;
	case 'libsql':
		dialect = new LibsqlDialect({ client: connection.connection });
		break;
	case 'pg':
		dialect = new PostgresDialect({ pool: connection.connection });
		break;
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
