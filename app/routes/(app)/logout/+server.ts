import { error, redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';
import config from '~shared/config';

export const POST = async ({ locals, cookies, url }) => {
	const user = locals.user;

	if (!locals.session || !user) {
		error(401);
	}

	await lucia().invalidateSession(locals.session.id);

	const sessionCookie = lucia().createBlankSessionCookie();

	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes,
		secure: config.site.secureSessionCookie,
	});

	locals.analytics?.postMessage({
		action: 'user_logout',
		payload: {
			userId: user.id,
		},
	});

	const to = url.searchParams.get('to');

	if (to) {
		redirect(301, to);
	}

	redirect(301, '/');
};
