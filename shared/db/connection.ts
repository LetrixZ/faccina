import { Database } from 'bun:sqlite';
import pg from 'pg';
import { match } from 'ts-pattern';

import config from '../config';

const connection = match(config.database)
	.with({ vendor: 'postgresql' }, (data) => {
		pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value));

		return new pg.Pool(data);
	})
	.with({ vendor: 'sqlite' }, (data) => {
		const db = new Database(data.path);
		db.run('PRAGMA case_sensitive_like = off');

		if (data.applyOptimizations) {
			db.run('PRAGMA journal_mode = wal');
			db.run('PRAGMA synchronous = normal');
			db.run('PRAGMA busy_timeout = 5000');
			db.run('PRAGMA foreign_keys = true');
		}

		return db;
	})
	.exhaustive();

export default connection;
