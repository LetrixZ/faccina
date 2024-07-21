import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleFetchError } from '~/lib/utils';

export const GET: RequestHandler = async ({ fetch }) => {
	const taxnomy = await fetch(`${env.SERVER_URL}/taxonomy`).then(handleFetchError);

	return json(taxnomy);
};
