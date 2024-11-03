import type { Handle } from '@sveltejs/kit';
import analyticsWorker from '$lib/analytics?raw';
import { lucia } from '$lib/server/auth';
import config from '~shared/config';

const url = URL.createObjectURL(new Blob([analyticsWorker], { type: 'application/typescript' }));
const worker = new Worker(url);

export const handle: Handle = async ({ event, resolve }) => {
	if (config.site.enableAnalytics) {
		event.locals.analytics = worker;
	}

	const sessionId = event.cookies.get(lucia().sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;

		return resolve(event);
	}

	const { session, user } = await lucia().validateSession(sessionId);

	if (session && session.fresh) {
		const sessionCookie = lucia().createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes,
		});
	}

	if (!session) {
		const sessionCookie = lucia().createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes,
		});
	}

	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};
