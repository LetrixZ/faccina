import { env } from '$env/dynamic/private';
import { handleFetchError } from '$lib/utils';
import { error, isHttpError } from '@sveltejs/kit';
import type { ArchiveListItem, LibraryPage } from '$lib/models';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch, isDataRequest, setHeaders }) => {
	try {
		const promise = fetch(`${env.SERVER_URL}/library${url.search}`).then(
			handleFetchError
		) as Promise<LibraryPage<ArchiveListItem>>;

		setHeaders({ 'cache-control': 'public, max-age=300' });

		return { libraryPage: isDataRequest ? promise : await promise };
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
