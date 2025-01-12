import { error, redirect } from '@sveltejs/kit';
import { sql, type OrderByExpression } from 'kysely';
import naturalCompare from 'natural-compare-lite';
import { parseSearchParams } from '$lib/server/utils.js';
import db from '~shared/db/index.js';
import { randomString, shuffle } from '$lib/utils.js';
import config from '~shared/config.js';
import type { DB } from '~shared/types.js';

export const load = async ({ locals, url }) => {
	if (!locals.user?.admin) {
		error(403, { message: 'Not allowed', status: 403 });
	}

	const searchParams = parseSearchParams(url.searchParams, {
		sort: 'updated_at',
		order: 'desc',
	});

	if (searchParams.sort === 'random' && !searchParams.seed) {
		url.searchParams.set('seed', randomString());
		redirect(302, url.pathname + `?${url.searchParams.toString()}`);
	}

	const sort = searchParams.sort ?? 'updated_at';
	const order = searchParams.order ?? 'desc';

	const sortQuery = () => {
		switch (sort) {
			case 'title':
				return config.database.vendor === 'postgresql'
					? `series.title ${order}`
					: sql`series.title collate nocase ${sql.raw(order)}`;
			case 'created_at':
				return `series.createdAt ${order}`;
			default:
				return `series.updatedAt ${order}`;
		}
	};

	let filteredResults = await db
		.selectFrom('series')
		.select(['series.id', 'series.title'])
		.orderBy([sortQuery() as OrderByExpression<DB, 'series', undefined>])
		.execute();

	if (config.database.vendor === 'sqlite' && sort === 'title') {
		filteredResults = (filteredResults as { id: number; title: string }[]).toSorted((a, b) =>
			naturalCompare(a.title.toLowerCase(), b.title.toLowerCase())
		);

		if (order === 'desc') {
			filteredResults = filteredResults.toReversed();
		}
	}

	let allIds = filteredResults.map(({ id }) => id);

	if (!allIds.length) {
		return {
			libraryPage: {
				data: [],
				page: searchParams.page,
				limit: searchParams.limit,
				total: 0,
			},
		};
	}

	if (sort === 'random' && searchParams.seed) {
		allIds = shuffle(allIds, searchParams.seed);
	}

	const slice = allIds.slice(
		(searchParams.page - 1) * searchParams.limit,
		searchParams.page * searchParams.limit
	);

	const series = await db
		.selectFrom('series')
		.leftJoin('seriesArchive as seriesArchiveCount', (join) =>
			join.onRef('seriesArchiveCount.seriesId', '=', 'series.id')
		)
		.leftJoin('seriesArchive', (join) =>
			join
				.onRef('seriesArchive.seriesId', '=', 'series.id')
				.onRef('seriesArchive.archiveId', '=', 'series.mainArchiveId')
		)
		.leftJoin('archives', 'archives.id', 'seriesArchive.archiveId')
		.select((eb) => [
			'series.id',
			'series.title',
			'archives.hash',
			'mainArchiveCoverPage as thumbnail',
			eb.fn.count<number>('seriesArchiveCount.archiveId').as('chapterCount'),
		])
		.groupBy('series.id')
		.where('series.id', 'in', slice)
		.execute();

	series.sort((a, b) => allIds.indexOf(a.id) - allIds.indexOf(b.id));

	return {
		libraryPage: {
			data: series,
			page: searchParams.page,
			limit: searchParams.limit,
			total: allIds.length,
		},
	};
};
