import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { handleFetchError } from '$lib/utils';
import { error, json } from '@sveltejs/kit';
import type { Archive } from '$lib/models';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request, setHeaders }) => {
	const key = request.headers.get('X-Api-Key');

	if (env.API_KEY?.length && key !== env.API_KEY) {
		return error(401, {
			status: 401,
			message: 'Invalid API key',
		});
	}

	const data = await fetch(`${env.SERVER_URL}/archive/${params.id}`)
		.then(handleFetchError<Archive>)
		.then((archive) => ({
			...archive,
			thumbnail_url: `${publicEnv.PUBLIC_CDN_URL}/image/${archive.key}/cover`,
		}));

	setHeaders({ 'cache-control': 'public, max-age=300' });

	return json(data);
};
