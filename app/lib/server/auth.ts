import { NodePostgresAdapter } from '@lucia-auth/adapter-postgresql';
import { Lucia } from 'lucia';
import type { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { match } from 'ts-pattern';
import { dev } from '$app/environment';
import config from '~shared/config';
import { databaseType } from '~shared/db';
import connection from '~shared/db/connection';
import { NodeSQLiteAdapter } from '~shared/db/node-adapter';

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
					new NodePostgresAdapter(connection as pg.Pool, {
						user: 'users',
						session: 'user_sessions',
					})
			)
			.with(
				'sqlite',
				() =>
					new NodeSQLiteAdapter(connection as DatabaseSync, {
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
