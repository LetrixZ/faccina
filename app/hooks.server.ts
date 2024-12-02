import type { Handle } from '@sveltejs/kit';
import chalk from 'chalk';
import analyticsWorker from '$lib/analytics?raw';
import { lucia } from '$lib/server/auth';
import config from '~shared/config';
import { log } from '$lib/server/utils';

const url = URL.createObjectURL(new Blob([analyticsWorker], { type: 'application/typescript' }));
const worker = new Worker(url);

export const handle: Handle = async ({ event, resolve }) => {
	const start = performance.now();

	if (config.site.enableAnalytics) {
		event.locals.analytics = worker;
	}

	const sessionId = event.cookies.get(lucia().sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
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
	}

	const response = await resolve(event);

	const color = (() => {
		const status = response.status;

		if (status >= 200 && status <= 299) {
			return chalk.green;
		} else if (status >= 300 && status <= 499) {
			return chalk.yellow;
		} else if (status >= 500 && status <= 599) {
			return chalk.red;
		} else {
			return chalk.reset;
		}
	})();

	log(
		`${color.bold(event.request.method)} ${color(`(${response.status})`)} - ${chalk.blue(chalk.bold(event.url.pathname) + event.url.search)} - ${chalk.bold(`${(performance.now() - start).toFixed(2)}ms`)}`
	);

	return response;
};
