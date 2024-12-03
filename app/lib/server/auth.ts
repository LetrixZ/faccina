import { NodePostgresAdapter } from '@lucia-auth/adapter-postgresql';
import { BetterSqlite3Adapter, BunSQLiteAdapter } from '@lucia-auth/adapter-sqlite';
import { Lucia } from 'lucia';
import pg from 'pg';
import { dev } from '$app/environment';
import config from '~shared/config';
import { databaseType } from '~shared/db';
import connection from '~shared/db/connection';
import { isBun } from '~shared/utils';

export default await (async () => {
	let adapter: NodePostgresAdapter | BunSQLiteAdapter | BetterSqlite3Adapter;

	switch (databaseType) {
		case 'postgresql': {
			adapter = new NodePostgresAdapter(connection as pg.Pool, {
				user: 'users',
				session: 'user_sessions',
			});
			break;
		}
		case 'sqlite': {
			if (isBun) {
				// @ts-expect-error Bun
				adapter = new BunSQLiteAdapter(connection as import('bun:sqlite'), {
					user: 'users',
					session: 'user_sessions',
				});
			} else {
				adapter = new BetterSqlite3Adapter(connection as import('better-sqlite3').Database, {
					user: 'users',
					session: 'user_sessions',
				});
			}
			break;
		}
	}

	return new Lucia<
		Record<never, never>,
		{
			username: string;
			admin: boolean;
		}
	>(adapter, {
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
})();

declare module 'lucia' {
	interface Register {
		Lucia: Lucia<Record<never, never>, { username: string; admin: boolean }>;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	username: string;
	admin: boolean;
}
