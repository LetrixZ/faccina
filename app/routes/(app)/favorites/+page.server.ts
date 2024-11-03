import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { libraryItems, search } from '$lib/server/db/queries';
import config from '~shared/config';
import db from '~shared/db';
import { searchSchema } from '$lib/schemas';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!config.site.enableUsers) {
		error(404, { message: 'Not Found' });
	}

	if (!locals.user) {
		redirect(302, `/login?to=/favorites`);
	}

	const searchParams = searchSchema
		.transform((val) => {
			if (!config.site.galleryListing.pageLimits.includes(val.limit)) {
				val.limit = config.site.galleryListing.pageLimits[0];
			}

			return val;
		})
		.parse(Object.fromEntries(url.searchParams));

	const sort = searchParams.sort ?? 'saved_at';
	const order = searchParams.order ?? config.site.defaultOrder;

	const favorites = (
		await db
			.selectFrom('userFavorites')
			.select('archiveId')
			.where('userId', '=', locals.user.id)
			.orderBy(order === 'asc' ? 'createdAt asc' : 'createdAt desc')
			.execute()
	).map(({ archiveId }) => archiveId);

	if (!favorites.length) {
		return {
			libraryPage: {
				archives: [],
				page: searchParams.page,
				limit: searchParams.limit,
				total: 0,
			},
		};
	}

	const { ids, total } = await search(searchParams, {
		showHidden: !!locals.user?.admin,
		matchIds: favorites,
	});

	locals.analytics?.postMessage({
		action: 'search_favorites',
		payload: {
			data: searchParams,
			userId: locals.user?.id,
		},
	});

	return {
		libraryPage: {
			archives: await libraryItems(ids, {
				sortingIds: sort === 'saved_at' ? favorites : undefined,
			}),
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		},
	};
};
