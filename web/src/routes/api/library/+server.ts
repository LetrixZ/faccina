import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleFetchError } from '$lib/utils';
import type { LibraryPage } from '$lib/models';

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const data = (await fetch(`${env.SERVER_URL}/library${url.search}`).then(
		handleFetchError
	)) as Promise<LibraryPage>;

	setHeaders({ 'cache-control': 'public, max-age=300' });

	return json(data);
};
