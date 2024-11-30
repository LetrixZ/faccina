import type { Handle } from '@sveltejs/kit';
import chalk from 'chalk';
import { lucia } from '$lib/server/auth';
import config from '~shared/config';

if (config.site.enableAnalytics) {
	console.warn(chalk.yellow('Analytics worker is not supported in Node.js'));
}

export const handle: Handle = async ({ event, resolve }) => {
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
			secure: config.site.secureSessionCookie,
		});
	}

	if (!session) {
		const sessionCookie = lucia().createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes,
			secure: config.site.secureSessionCookie,
		});
	}

	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};
