import pg from 'pg';
import { createClient, type Client } from '@libsql/client';
import config from '../config';

type PostgreSQLConnection = {
	type: 'pg';
	connection: pg.Pool;
};

type BunSQLiteConnection = {
	type: 'bun:sqlite';
	connection: import('bun:sqlite').Database;
};

type LibSQLConnection = {
	type: 'libsql';
	connection: Client;
};

type Connection = PostgreSQLConnection | BunSQLiteConnection | LibSQLConnection;

const connection: Connection = await (async () => {
	switch (config.database.vendor) {
		case 'sqlite': {
			if (typeof Bun !== 'undefined') {
				const { Database } = await import('bun:sqlite');
				const db = new Database(config.database.path);
				db.run('PRAGMA case_sensitive_like = off');
				db.run('PRAGMA journal_mode = wal');
				db.run('PRAGMA synchronous = normal');
				db.run('PRAGMA busy_timeout = 5000');
				db.run('PRAGMA foreign_keys = true');

				return {
					type: 'bun:sqlite',
					connection: db,
				};
			} else {
				const db = createClient({
					url: `file:${config.database.path}`,
				});
				db.execute('PRAGMA case_sensitive_like = off');
				db.execute('PRAGMA journal_mode = wal');
				db.execute('PRAGMA synchronous = normal');
				db.execute('PRAGMA busy_timeout = 5000');
				db.execute('PRAGMA foreign_keys = true');

				return {
					type: 'libsql',
					connection: db,
				};
			}
		}
		case 'postgresql': {
			pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value));

			return {
				type: 'pg',
				connection: new pg.Pool(config.database),
			};
		}
	}
})();

export default connection;
