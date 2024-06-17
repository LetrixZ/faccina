import { env } from '$env/dynamic/public';
import type { Archive } from '$lib/models';
import { error, isHttpError } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	try {
		const res = await fetch(`${env.SERVER_URL}/archive/${params.id}`);

		if (res.status === 404) {
			return error(404, {
				status: 404,
				message: `The requested gallery wasn't found`,
			});
		}

		const archive: Archive = await res.json();

		return { archive };
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
