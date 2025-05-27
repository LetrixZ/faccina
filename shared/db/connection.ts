import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { match } from 'ts-pattern';
import config from '../config';

const connection = match(config.database)
	.with({ vendor: 'postgresql' }, (data) => {
		pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value));

		return new pg.Pool(data);
	})
	.with({ vendor: 'sqlite' }, (data) => {
		const db = new DatabaseSync(data.path);
		db.exec('PRAGMA case_sensitive_like = off');
		db.exec('PRAGMA journal_mode = wal');
		db.exec('PRAGMA synchronous = normal');
		db.exec('PRAGMA busy_timeout = 5000');
		db.exec('PRAGMA foreign_keys = true');
		return db;
	})
	.exhaustive();

export default connection;
