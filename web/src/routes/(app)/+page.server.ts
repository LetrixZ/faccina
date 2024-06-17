import { env } from '$env/dynamic/private';
import type { LibraryPage } from '$lib/models';
import { error, isHttpError } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	try {
		const res = await fetch(`${env.SERVER_URL}/library${url.search}`);
		const libraryPage: LibraryPage = await res.json();

		if (!res.ok) {
			return error(res.status, {
				status: res.status,
				statusText: res.statusText,
				message: 'Failed to get galleries',
			});
		}

		return { libraryPage };
	} catch (e) {
		console.error(e);

		if (isHttpError(e)) {
			throw e;
		}

		return error(500, {
			status: 500,
			statusText: 'Internal error',
			message: 'Failed to communicate with the server',
		});
	}
};
