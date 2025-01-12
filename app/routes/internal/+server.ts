import { json, redirect } from '@sveltejs/kit';
import { getUserBlacklist, libraryItems, search } from '$lib/server/db/queries';
import { parseSearchParams } from '$lib/server/utils';
import type { GalleryLibraryResponse } from '$lib/types';
import { decompressBlacklist, randomString } from '$lib/utils';

export const GET = async ({ url, cookies, locals }) => {
	const searchParams = parseSearchParams(url.searchParams);

	if (searchParams.sort === 'random' && !searchParams.seed) {
		url.searchParams.set('seed', randomString());
		throw redirect(302, url.pathname + `?${url.searchParams.toString()}`);
	}

	const blacklist = await (async () => {
		if (locals.user) {
			return getUserBlacklist(locals.user.id);
		} else {
			return decompressBlacklist(cookies.get('blacklist'));
		}
	})();

	const { ids, total } = await search(searchParams, {
		showHidden: !!locals.user?.admin,
		tagBlacklist: blacklist,
		matchIds: searchParams.ids,
	});

	locals.analytics?.postMessage({
		action: 'search_main',
		payload: {
			data: searchParams,
			userId: locals.user?.id,
		},
	});

	return json({
		data: await libraryItems(ids),
		page: searchParams.page,
		limit: searchParams.limit,
		total,
		seed: searchParams.seed,
	} as GalleryLibraryResponse);
};
