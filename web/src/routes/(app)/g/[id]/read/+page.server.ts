import { env } from '$env/dynamic/private';
import type { Archive } from '$lib/models';
import { handleFetchError } from '$lib/utils';
import { error, isHttpError, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	try {
		const archive = (await fetch(`${env.SERVER_URL}/archive/${params.id}`).then(
			handleFetchError
		)) as Archive;

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
