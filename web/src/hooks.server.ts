import { env } from '$env/dynamic/private';
import { json, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/')) {
		const key = event.request.headers.get('X-Api-Key');

		if (env.API_KEY?.length && key !== env.API_KEY) {
			return json({ message: 'Invalid API key' }, { status: 401 });
		}

		return await resolve(event);
	}

	return await resolve(event);
};
