import { env } from '$env/dynamic/public';
import type { Archive } from '$lib/models';
import { handleFetchError } from '$lib/utils';
import { error, isHttpError, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, fetch, setHeaders }) => {
	try {
		const archive = (await fetch(`${env.SERVER_URL}/archive/${params.id}`).then(
			handleFetchError
		)) as Archive;

		setHeaders({ 'cache-control': 'public, max-age=300' });

		redirect(301, `/g/${archive.id}/read/1${url.search}`);
	} catch (e) {
		console.error(e);

		if (isHttpError(e)) {
			throw e;
		}

		return error(500, {
			status: 500,
			message: 'Failed to communicate with the server',
		});
	}
};
