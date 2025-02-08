import { NodePostgresAdapter } from '@lucia-auth/adapter-postgresql';
import { BunSQLiteAdapter, LibSQLAdapter } from '@lucia-auth/adapter-sqlite';
import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import config from '~shared/config';
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
		const adapter = (() => {
			switch (connection.type) {
				case 'bun:sqlite':
					return new BunSQLiteAdapter(connection.connection, {
						user: 'users',
						session: 'user_sessions',
					});
				case 'libsql':
					return new LibSQLAdapter(connection.connection, {
						user: 'users',
						session: 'user_sessions',
					});
				case 'pg':
					return new NodePostgresAdapter(connection.connection, {
						user: 'users',
						session: 'user_sessions',
					});
			}
		})();

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
