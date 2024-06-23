import { env } from '$env/dynamic/private';
import type { Archive } from '$lib/models';
import { handleFetchError } from '$lib/utils';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const data = (await fetch(`${env.SERVER_URL}/archive/${params.id}`).then(
		handleFetchError
	)) as Promise<Archive>;

	setHeaders({ 'cache-control': 'public, max-age=300' });

	return json(data);
};
