import { lucia } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { fail } from 'sveltekit-superforms';

export const actions = {
	default: async (event) => {
		if (!event.locals.session) {
			return fail(401);
		}

		await lucia().invalidateSession(event.locals.session.id);
		const sessionCookie = lucia().createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes,
		});

		redirect(302, event.url.searchParams.get('to')?.toString() ?? '/');
	},
};
