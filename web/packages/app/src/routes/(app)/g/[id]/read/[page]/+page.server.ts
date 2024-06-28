import { env } from '$env/dynamic/private';
import { handleFetchError } from '$lib/utils';
import { error, isHttpError } from '@sveltejs/kit';
import type { Archive } from 'shared/models';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, isDataRequest }) => {
	try {
		const promise = fetch(`${env.SERVER_URL}/archive/${params.id}`).then(
			handleFetchError
		) as Promise<Archive>;

		return { archive: isDataRequest ? promise : await promise };
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
