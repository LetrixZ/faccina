import { DatabaseSync, type SupportedValueType } from 'node:sqlite';
import { type Controller, SQLiteAdapter, type TableNames } from './sqlite-base';

export class NodeSQLiteAdapter extends SQLiteAdapter {
	constructor(db: DatabaseSync, tableNames: TableNames) {
		super(new NodeSQLiteController(db), tableNames);
	}
}

class NodeSQLiteController implements Controller {
	#db: DatabaseSync;

	constructor(db: DatabaseSync) {
		this.#db = db;
	}

	public async get<T>(sql: string, args: SupportedValueType[]): Promise<T | null> {
		return this.#db.prepare(sql).get(...args) as T | null;
	}

	public async getAll<T>(sql: string, args: SupportedValueType[]): Promise<T[]> {
		return this.#db.prepare(sql).all(...args) as T[];
	}

	public async execute(sql: string, args: SupportedValueType[]): Promise<void> {
		this.#db.prepare(sql).run(...args);
	}
}
