import { dev } from '$app/environment';
import { NodePostgresAdapter } from '@lucia-auth/adapter-postgresql';
import { BunSQLiteAdapter } from '@lucia-auth/adapter-sqlite';
import { Database } from 'bun:sqlite';
import { Lucia } from 'lucia';
import { match } from 'ts-pattern';
import config from '~shared/config';
import { databaseType } from '~shared/db';
import connection from '~shared/db/connection';
import type { Pool } from 'pg';

let _lucia: Lucia<
	Record<never, never>,
	{
		username: string;
		admin: boolean;
	}
>;

export const lucia = (): Lucia => {
	if (!_lucia) {
		const adapter = match(databaseType)
			.with(
				'postgresql',
				() =>
					new NodePostgresAdapter(connection as Pool, {
						user: 'users',
						session: 'user_sessions',
					})
			)
			.with(
				'sqlite',
				() =>
					new BunSQLiteAdapter(connection as Database, {
						user: 'users',
						session: 'user_sessions',
					})
			)
			.exhaustive();

		_lucia = new Lucia(adapter, {
			sessionCookie: {
				attributes: {
					secure: !dev,
				},
			},
			getUserAttributes: (attributes) => {
				return {
					username: attributes.username,
					admin: config.site.adminUsers.includes(attributes.username),
				};
			},
		});
	}

	return _lucia;
};

declare module 'lucia' {
	interface Register {
		Lucia: typeof _lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	username: string;
	admin: boolean;
}
