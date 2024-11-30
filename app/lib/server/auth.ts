import type { Client } from '@libsql/client';
import { NodePostgresAdapter } from '@lucia-auth/adapter-postgresql';
import { LibSQLAdapter } from '@lucia-auth/adapter-sqlite';
import { Lucia } from 'lucia';
import pg from 'pg';
import { match } from 'ts-pattern';
import { dev } from '$app/environment';
import config from '~shared/config';
import { databaseType } from '~shared/db';
import connection from '~shared/db/connection';

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
					new LibSQLAdapter(connection as Client, {
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
