import { error } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';

export const POST = async ({ locals, cookies }) => {
	const user = locals.user;

	if (!locals.session || !user) {
		error(401);
	}

	await lucia().invalidateSession(locals.session.id);

	const sessionCookie = lucia().createBlankSessionCookie();

	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes,
	});

	locals.analytics?.postMessage({
		action: 'user_logout',
		payload: {
			userId: user.id,
		},
	});

	return new Response();
};
