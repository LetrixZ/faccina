import { env } from '$env/dynamic/private';
import type { TaxonomyTypes } from '~/lib/models';
import { handleFetchError } from '~/lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const taxonomies = (await fetch(`${env.SERVER_URL}/taxonomy`).then(
		handleFetchError
	)) as TaxonomyTypes;

	return { taxonomies };
};
