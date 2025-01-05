import { error, redirect } from '@sveltejs/kit';
import { libraryItems, search } from '$lib/server/db/queries.js';
import { parseSearchParams } from '$lib/server/utils.js';
import { randomString } from '$lib/utils';
import { jsonArrayFrom } from '~shared/db/helpers.js';
import db from '~shared/db/index.js';

export const load = async ({ params, url, locals }) => {
	const id = parseInt(params.id);

	if (isNaN(id)) {
		throw error(400, { message: 'Invalid ID', status: 400 });
	}

	const searchParams = parseSearchParams(url.searchParams, {
		sort: 'series_order',
		order: 'asc',
	});

	if (searchParams.sort === 'random' && !searchParams.seed) {
		url.searchParams.set('seed', randomString());
		redirect(302, url.pathname + `?${url.searchParams.toString()}`);
	}

	const sort = searchParams.sort ?? 'series_order';
	const order = searchParams.order ?? 'asc';

	const series = await db
		.selectFrom('series')
		.select((eb) => {
			let archiveQuery = eb
				.selectFrom('seriesArchive')
				.select('archiveId')
				.whereRef('seriesId', '=', 'series.id');

			if (sort === 'series_order') {
				archiveQuery = archiveQuery.orderBy(order === 'asc' ? 'order asc' : 'order desc');
			}

			return [
				'id',
				'title',
				'description',
				'mainArchiveId',
				'mainArchiveCoverPage',
				jsonArrayFrom(archiveQuery).as('chapters'),
			];
		})
		.where('id', '=', id)
		.executeTakeFirst();

	if (!series) {
		error(404, { message: 'Series not found' });
	}

	const { ids, total } = await search(searchParams, {
		showHidden: !!locals.user?.admin,
		matchIds: series.chapters.map((archive) => archive.archiveId),
	});

	const archives = await libraryItems(ids, {
		sortingIds:
			sort === 'series_order' ? series.chapters.map((archive) => archive.archiveId) : undefined,
	});

	return {
		series,
		libraryPage: {
			archives,
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		},
	};
};
