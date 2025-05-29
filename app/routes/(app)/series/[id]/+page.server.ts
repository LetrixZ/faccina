import { libraryItems, searchArchives } from '$lib/server/db/queries.js';
import { parseSearchParams } from '$lib/server/utils.js';
import { randomString } from '$lib/utils';
import { error, fail, redirect } from '@sveltejs/kit';
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

			return ['id', 'title', jsonArrayFrom(archiveQuery).as('chapters')];
		})
		.where('id', '=', id)
		.executeTakeFirst();

	if (!series) {
		error(404, { message: 'Series not found' });
	}

	const { ids, total } = await searchArchives(searchParams, {
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
			data: archives,
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		},
	};
};

export const actions = {
	remove: async ({ params, locals }) => {
		if (!locals.user?.admin) {
			return fail(403, { message: 'You are not allowed to perform this action', type: 'error' });
		}

		const series = await db
			.selectFrom('series')
			.select('id')
			.where('id', '=', parseInt(params.id))
			.executeTakeFirst();

		if (!series) {
			return fail(404, {
				message: 'This series does not exists',
				type: 'error',
			});
		}

		await db.deleteFrom('series').where('id', '=', series.id).execute();

		redirect(301, '/series');
	},
};
