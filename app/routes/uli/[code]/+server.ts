import { error, redirect } from '@sveltejs/kit';
import db from '~shared/db';

import { lucia } from '~/lib/server/auth';

export const GET = async ({ params, cookies }) => {
	const code = params.code;

	const user = await db
		.selectFrom('user_codes')
		.select('user_id')
		.where('code', '=', code)
		.where('type', '=', 'login')
		.where('consumed_at', 'is', null)
		.executeTakeFirst();

	if (!user) {
		error(400, {
			message: 'Invalid code',
		});
	}

	const session = await lucia().createSession(user.user_id, {});
	const sessionCookie = lucia().createSessionCookie(session.id);

	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes,
	});

	await db
		.updateTable('user_codes')
		.set({ consumed_at: new Date().toISOString() })
		.where('code', '=', code)
		.execute();

	redirect(302, '/');
};
