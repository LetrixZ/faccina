import pg from 'pg';
import config from '../config';
import { isBun } from '~shared/utils';

export default await (async () => {
	const data = config.database;
	switch (data.vendor) {
		case 'postgresql': {
			pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value));

			const { host, port, user, password, database } = data;

			return new pg.Pool({
				host,
				port,
				user,
				password,
				database,
			});
		}
		case 'sqlite': {
			if (isBun) {
				// @ts-expect-error Bun
				const Database = (await import('bun:sqlite')).default;
				const db = new Database(data.path);
				db.run('PRAGMA case_sensitive_like = off');

				if (data.applyOptimizations) {
					db.run('PRAGMA journal_mode = wal');
					db.run('PRAGMA synchronous = normal');
					db.run('PRAGMA busy_timeout = 5000');
					db.run('PRAGMA foreign_keys = true');
				}

				return db;
			} else {
				const Database = (await import('better-sqlite3')).default;
				const db = new Database(data.path);
				db.pragma('case_sensitive_like = off');

				if (data.applyOptimizations) {
					db.pragma('journal_mode = wal');
					db.pragma('synchronous = normal');
					db.pragma('busy_timeout = 5000');
					db.pragma('foreign_keys = true');
				}

				return db;
			}
		}
	}
})();
