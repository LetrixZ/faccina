import { json } from '@sveltejs/kit';
import config from '~shared/config';
import { searchSchema } from '$lib/schemas';
import { getUserBlacklist, libraryItems, search } from '$lib/server/db/queries';
import { decompressBlacklist } from '$lib/utils';

export const GET = async ({ url, cookies, locals }) => {
	const searchParams = searchSchema
		.transform((val) => {
			if (!config.site.galleryListing.pageLimits.includes(val.limit)) {
				val.limit = config.site.galleryListing.pageLimits[0];
			}

			return val;
		})
		.parse(Object.fromEntries(url.searchParams));

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
		archives: await libraryItems(ids),
		page: searchParams.page,
		limit: searchParams.limit,
		total,
	});
};
