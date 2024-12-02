import {
	CompiledQuery,
	type DatabaseConnection,
	type DatabaseIntrospector,
	type DatabaseMetadata,
	type DatabaseMetadataOptions,
	DefaultQueryCompiler,
	type Dialect,
	type DialectAdapter,
	DialectAdapterBase,
	type Driver,
	Kysely,
	type QueryCompiler,
	type QueryResult,
	type SchemaMetadata,
	sql,
	type TableMetadata,
	type TransactionSettings,
} from 'kysely';
import { DatabaseSync, type SupportedValueType } from 'node:sqlite';

export class NodeSQLiteDialect implements Dialect {
	#db: DatabaseSync;

	constructor(db: DatabaseSync) {
		this.#db = db;
	}

	createDriver(): Driver {
		return new NodeSQLiteDriver(this.#db);
	}

	createQueryCompiler(): QueryCompiler {
		return new NodeSQLiteQueryCompiler();
	}

	createAdapter(): DialectAdapter {
		return new NodeSQLiteAdapter();
	}

	createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
		return new NodeSQLiteIntrospector(db);
	}
}

export class NodeSQLiteDriver implements Driver {
	#db?: DatabaseSync;
	#connection?: DatabaseConnection;

	constructor(db: DatabaseSync) {
		this.#db = db;
		this.#connection = new NodeSQLiteConnection(this.#db);
	}

	async init(): Promise<void> {}

	async acquireConnection(): Promise<DatabaseConnection> {
		return this.#connection!;
	}

	async beginTransaction(
		connection: DatabaseConnection,
		_settings: TransactionSettings
	): Promise<void> {
		await connection.executeQuery(CompiledQuery.raw('begin'));
	}

	async commitTransaction(connection: DatabaseConnection): Promise<void> {
		await connection.executeQuery(CompiledQuery.raw('commit'));
	}

	async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
		await connection.executeQuery(CompiledQuery.raw('rollback'));
	}

	async releaseConnection(_connection: DatabaseConnection): Promise<void> {
		// not implemented
	}

	async destroy(): Promise<void> {
		this.#db?.close();
	}
}

export class NodeSQLiteConnection implements DatabaseConnection {
	readonly #db: DatabaseSync;

	constructor(db: DatabaseSync) {
		this.#db = db;
	}

	async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
		const { sql, parameters } = compiledQuery;
		const stmt = this.#db.prepare(sql);

		return { rows: stmt.all(...(parameters as SupportedValueType[])) as R[] };
	}

	streamQuery<R>(
		_compiledQuery: CompiledQuery<unknown>,
		_compiledQuerychunkSize?: number | undefined
	): AsyncIterableIterator<QueryResult<R>> {
		throw new Error('Streaming is not supported with SQLite3');
	}
}

class NodeSQLiteQueryCompiler extends DefaultQueryCompiler {
	protected override getCurrentParameterPlaceholder() {
		return '?';
	}

	protected override getLeftIdentifierWrapper(): string {
		return '"';
	}

	protected override getRightIdentifierWrapper(): string {
		return '"';
	}

	protected override getAutoIncrement() {
		return 'autoincrement';
	}
}

class NodeSQLiteAdapter implements DialectAdapterBase {
	get supportsOutput(): boolean {
		return false;
	}

	get supportsCreateIfNotExists(): boolean {
		return true;
	}

	get supportsTransactionalDdl(): boolean {
		return false;
	}

	get supportsReturning(): boolean {
		return true;
	}

	async acquireMigrationLock(): Promise<void> {
		// SQLite only has one connection that's reserved by the migration system
		// for the whole time between acquireMigrationLock and releaseMigrationLock.
		// We don't need to do anything here.
	}

	async releaseMigrationLock(): Promise<void> {
		// SQLite only has one connection that's reserved by the migration system
		// for the whole time between acquireMigrationLock and releaseMigrationLock.
		// We don't need to do anything here.
	}
}

class NodeSQLiteIntrospector implements DatabaseIntrospector {
	readonly #db: Kysely<unknown>;

	constructor(db: Kysely<unknown>) {
		this.#db = db;
	}

	async getSchemas(): Promise<SchemaMetadata[]> {
		// Sqlite doesn't support schemas.
		return [];
	}

	async getTables(
		options: DatabaseMetadataOptions = { withInternalKyselyTables: false }
	): Promise<TableMetadata[]> {
		let query = this.#db
			// @ts-expect-error works
			.selectFrom('sqlite_schema')
			// @ts-expect-error works
			.where('type', '=', 'table')
			// @ts-expect-error works
			.where('name', 'not like', 'sqlite_%')
			// @ts-expect-error works
			.select('name')
			.$castTo<{ name: string }>();

		if (!options.withInternalKyselyTables) {
			query = query
				// @ts-expect-error works
				.where('name', '!=', DEFAULT_MIGRATION_TABLE)
				// @ts-expect-error works
				.where('name', '!=', DEFAULT_MIGRATION_LOCK_TABLE);
		}

		const tables = await query.execute();
		return Promise.all(tables.map(({ name }) => this.#getTableMetadata(name)));
	}

	async getMetadata(options?: DatabaseMetadataOptions): Promise<DatabaseMetadata> {
		return {
			tables: await this.getTables(options),
		};
	}

	async #getTableMetadata(table: string): Promise<TableMetadata> {
		const db = this.#db;

		// Get the SQL that was used to create the table.
		const createSql = await db
			// @ts-expect-error works
			.selectFrom('sqlite_master')
			// @ts-expect-error works
			.where('name', '=', table)
			// @ts-expect-error works
			.select('sql')
			.$castTo<{ sql: string | undefined }>()
			.execute();

		// Try to find the name of the column that has `autoincrement` 🤦
		const autoIncrementCol = createSql[0]?.sql
			// eslint-disable-next-line no-useless-escape
			?.split(/[\(\),]/)
			?.find((it) => it.toLowerCase().includes('autoincrement'))
			?.split(/\s+/)?.[0]
			?.replace(/["`]/g, '');

		const columns = await db
			.selectFrom(
				sql<{
					name: string;
					type: string;
					notnull: 0 | 1;
					dflt_value: unknown;
				}>`pragma_table_info(${table})`.as('table_info')
			)
			.select(['name', 'type', 'notnull', 'dflt_value'])
			.execute();

		return {
			name: table,
			columns: columns.map((col) => ({
				name: col.name,
				dataType: col.type,
				isNullable: !col.notnull,
				isAutoIncrementing: col.name === autoIncrementCol,
				hasDefaultValue: col.dflt_value != null,
			})),
			isView: true,
		};
	}
}
