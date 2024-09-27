import { libraryItems, search } from '$lib/server/db/queries';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, cookies, locals }) => {
	const searchParams = new URLSearchParams(url.searchParams);
	const blacklist = cookies.get('blacklist');

	if (blacklist) {
		searchParams.set('blacklist', blacklist);
	}

	const { ids, total } = await search(searchParams, !!locals.user?.admin);

	return {
		library: {
			archives: await libraryItems(ids),
			page: 1,
			limit: 24,
			total,
		},
	};
};
