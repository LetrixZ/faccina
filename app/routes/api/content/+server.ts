import { json } from '@sveltejs/kit';
import { parseSearchParams } from '$lib/server/utils.js';
import { searchArchives, searchContent, searchSeries } from '$lib/server/db/queries.js';

export const GET = async ({ url, locals }) => {
	// const searchParams = parseSearchParams(url.searchParams);

	const results = await searchContent(url.searchParams);

	return json(results);
};
