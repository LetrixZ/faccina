import { redirect } from '@sveltejs/kit';
import { getUserBlacklist, libraryItems, searchArchives } from '$lib/server/db/queries';
import { parseSearchParams } from '$lib/server/utils';
import { decompressBlacklist, randomString } from '$lib/utils';
import config from '~shared/config.js';

export const load = async ({ locals, cookies, url }) => {
	const searchParams = parseSearchParams(url.searchParams);

	if (!locals.user && !config.site.guestAccess) {
		return {
			library: {
				data: [],
				page: searchParams.page,
				limit: searchParams.limit,
				total: 0,
			},
		};
	}

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

	const { ids, total } = await searchArchives(searchParams, {
		showHidden: !!locals.user?.admin,
		tagBlacklist: blacklist,
		matchIds: searchParams.ids,
	});

	return {
		library: {
			data: await libraryItems(ids),
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		},
	};
};
