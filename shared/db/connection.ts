import { createClient } from '@libsql/client';
import pg from 'pg';
import { match } from 'ts-pattern';
import config from '../config';

const connection = match(config.database)
	.with({ vendor: 'postgresql' }, (data) => {
		pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value));

		return new pg.Pool(data);
	})
	.with({ vendor: 'sqlite' }, (data) => {
		const db = createClient({ url: `file:${data.path}` });
		db.execute('PRAGMA case_sensitive_like = off');

		if (data.applyOptimizations) {
			db.executeMultiple(`
				PRAGMA journal_mode = wal;
				PRAGMA synchronous = normal;
				PRAGMA busy_timeout = 5000;
				PRAGMA foreign_keys = true;
			`);
		}

		return db;
	})
	.exhaustive();

export default connection;
