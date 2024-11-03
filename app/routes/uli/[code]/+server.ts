import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lucia } from '$lib/server/auth';
import db from '~shared/db';

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
	});

	await db
		.updateTable('userCodes')
		.set({ consumedAt: new Date().toISOString() })
		.where('code', '=', code)
		.execute();

	redirect(302, '/');
};
