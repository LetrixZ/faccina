import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { Archive } from '$lib/models';
import { handleFetchError } from '$lib/utils';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const data = await fetch(`${env.SERVER_URL}/archive/${params.id}`)
		.then(handleFetchError<Archive>)
		.then((archive) => ({
			...archive,
			thumbnail_url: `${publicEnv.PUBLIC_CDN_URL}/image/${archive.hash}/${archive.thumbnail}/c`,
		}));

	return json(data);
};
