import config from '../config';
import type { DB } from './types';
import {
	type Expression,
	ExpressionWrapper,
	type RawBuilder,
	type SchemaModule,
	type SelectQueryBuilderExpression,
	type Simplify,
	sql,
} from 'kysely';
import {
	jsonArrayFrom as postgresJsonArrayFrom,
	jsonBuildObject as postgresJsonBuildObject,
	jsonObjectFrom as postgresJsonObjectFrom,
} from 'kysely/helpers/postgres';
import {
	jsonArrayFrom as sqliteJsonArrayFrom,
	jsonBuildObject as sqliteJsonBuildObject,
	jsonObjectFrom as sqliteJsonObjectFrom,
} from 'kysely/helpers/sqlite';

/**
 * Create a new table with a primary key ID
 * @param schema DB scheme
 * @param name New table name
 * @param type Database type
 * @returns DB scheme with new table
 */
export const id = <TB extends string>(schema: SchemaModule, name: TB) => {
	switch (config.database.vendor) {
		case 'sqlite':
			return schema
				.createTable(name)
				.addColumn('id', 'integer', (col) => col.autoIncrement().notNull().primaryKey());
		case 'postgresql':
			return schema.createTable(name).addColumn('id', 'serial', (col) => col.primaryKey());
	}
};

/**
 * Obtains the current time SQL function for the database type
 * @param type Database type
 * @returns Equivalent current time SQL functon
 */
export const now = () => {
	switch (config.database.vendor) {
		case 'sqlite':
			return sql<string>`current_timestamp`;
		case 'postgresql':
			return sql<string>`now()`;
	}
};

export const max = (
	newValue: number,
	reference: ExpressionWrapper<DB, 'userReadHistory', number>
) => {
	switch (config.database.vendor) {
		case 'sqlite':
			return sql<number>`max(${newValue}, ${reference})`;
		case 'postgresql':
			return sql<number>`cast(greatest(${newValue}, ${reference}) as integer)`;
	}
};

export const jsonObjectFrom = <O>(
	expr: SelectQueryBuilderExpression<O>
): RawBuilder<Simplify<O> | null> => {
	switch (config.database.vendor) {
		case 'sqlite':
			return sqliteJsonObjectFrom(expr);
		case 'postgresql':
			return postgresJsonObjectFrom(expr);
	}
};

export const jsonArrayFrom = <O>(
	expr: SelectQueryBuilderExpression<O>
): RawBuilder<Simplify<O>[]> => {
	switch (config.database.vendor) {
		case 'sqlite':
			return sqliteJsonArrayFrom(expr);
		case 'postgresql':
			return postgresJsonArrayFrom(expr);
	}
};

export const jsonBuildObject = <O extends Record<string, Expression<unknown>>>(
	obj: O
): RawBuilder<
	Simplify<{
		[K in keyof O]: O[K] extends Expression<infer V> ? V : never;
	}>
> => {
	switch (config.database.vendor) {
		case 'sqlite':
			return sqliteJsonBuildObject(obj);
		case 'postgresql':
			return postgresJsonBuildObject(obj);
	}
};

export const like = () => {
	switch (config.database.vendor) {
		case 'sqlite':
			return 'like';
		case 'postgresql':
			return 'ilike';
	}
};

export const notLike = () => {
	switch (config.database.vendor) {
		case 'sqlite':
			return 'not like';
		case 'postgresql':
			return 'not ilike';
	}
};
export const jsonAgg = () => {
	switch (config.database.vendor) {
		case 'sqlite':
			return 'json_group_array';
		case 'postgresql':
			return 'json_agg';
	}
};
