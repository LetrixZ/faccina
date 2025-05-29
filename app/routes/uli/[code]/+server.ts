import { lucia } from '$lib/server/auth';
import { error, redirect } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const code = params.code;

	const user = await db
		.selectFrom('userCodes')
		.select('userId')
		.where('code', '=', code)
		.where('type', '=', 'login')
		.where('consumedAt', 'is', null)
		.executeTakeFirst();

	if (!user) {
		error(400, {
			message: 'Invalid code',
		});
	}

	const session = await lucia().createSession(user.userId, {});
	const sessionCookie = lucia().createSessionCookie(session.id);

	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes,
		secure: config.site.secureSessionCookie,
	});

	await db
		.updateTable('userCodes')
		.set({ consumedAt: new Date().toISOString() })
		.where('code', '=', code)
		.execute();

	redirect(302, '/');
};
