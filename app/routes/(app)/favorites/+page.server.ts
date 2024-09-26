import type { DB } from '~shared/types';
import type { OrderByExpression } from 'kysely';

import { Ordering, Sorting } from '$lib/models';
import { libraryItems, search } from '$lib/server/db/queries';
import { error, redirect } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import { match } from 'ts-pattern';

export const load = async ({ locals, url, cookies }) => {
	if (!config.site.enableUsers) {
		error(404, { message: 'Not Found' });
	}

	if (!locals.user) {
		redirect(302, `/login?to=/favorites`);
	}

	const searchParams = new URLSearchParams(url.searchParams);
	const sorting = searchParams.get('sort') ?? Sorting.SAVED_AT;
	const ordering = searchParams.get('order') ?? Ordering.DESC;
	const blacklist = cookies.get('blacklist');

	if (blacklist) {
		searchParams.set('blacklist', blacklist);
	}

	const orderBy = match(ordering)
		.with(
			Ordering.ASC,
			() => 'created_at asc' as OrderByExpression<DB, 'user_favorites', undefined>
		)
		.otherwise(() => 'created_at desc' as OrderByExpression<DB, 'user_favorites', undefined>);

	const favorites = (
		await db
			.selectFrom('user_favorites')
			.select('archive_id')
			.where('user_id', '=', locals.user.id)
			.orderBy([orderBy])
			.execute()
	).map(({ archive_id }) => archive_id);

	if (!favorites.length) {
		return {
			libraryPage: {
				archives: [],
				page: 1,
				limit: 24,
				total: 0,
			},
		};
	}

	const { ids, total } = await search(searchParams, !!locals.user?.admin, favorites);

	return {
		libraryPage: {
			archives: await libraryItems(ids, sorting === Sorting.SAVED_AT ? favorites : undefined),
			page: 1,
			limit: 24,
			total,
		},
	};
};
