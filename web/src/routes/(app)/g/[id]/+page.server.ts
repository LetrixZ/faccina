import { env } from '$env/dynamic/private';
import type { ArchiveId } from '$lib/models';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	let archive: ArchiveId;

	try {
		const res = await fetch(`${env.SERVER_URL}/archive/${params.id}`);

		if (res.status === 404) {
			return error(404, {
				status: 404,
				statusText: 'Not found',
				message: `The requested gallery wasn't found`,
			});
		}

		archive = await res.json();
	} catch (e) {
		console.error(e);

		return error(500, {
			status: 500,
			statusText: 'Internal error',
			message: 'Failed to communicate with the server',
		});
	}

	redirect(301, `/g/${archive.id}/${archive.slug}${url.search}`);
};
