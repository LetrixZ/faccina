import { libraryItems, searchArchives } from '$lib/server/db/queries';
import { parseSearchParams } from '$lib/server/utils';
import { randomString } from '$lib/utils';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import db from '~shared/db';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, `/login?to=/favorites`);
	}

	const searchParams = parseSearchParams(url.searchParams, {
		sort: 'saved_at',
	});

	if (searchParams.sort === 'random' && !searchParams.seed) {
		url.searchParams.set('seed', randomString());
		throw redirect(302, url.pathname + `?${url.searchParams.toString()}`);
	}

	const sort = searchParams.sort ?? 'saved_at';
	const order = searchParams.order ?? 'desc';

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
				data: [],
				page: searchParams.page,
				limit: searchParams.limit,
				total: 0,
			},
		};
	}

	const { ids, total } = await searchArchives(searchParams, {
		showHidden: !!locals.user?.admin,
		matchIds: favorites,
	});

	return {
		libraryPage: {
			data: await libraryItems(ids, {
				sortingIds: sort === 'saved_at' ? favorites : undefined,
			}),
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		},
	};
};
