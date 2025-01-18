import { libraryItems, searchSeries } from '$lib/server/db/queries';
import { handleTags } from '$lib/server/utils';
import { parseSearchParams } from '$lib/server/utils.js';
import type { SeriesListItem } from '$lib/types.js';
import { randomString } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';
import { sql } from 'kysely';
import { jsonArrayFrom } from '~shared/db/helpers';
import db from '~shared/db/index.js';

export const load = async ({ url }) => {
	const searchParams = parseSearchParams(url.searchParams, {
		sort: 'updated_at',
		order: 'desc',
	});

	if (searchParams.sort === 'random' && !searchParams.seed) {
		url.searchParams.set('seed', randomString());
		redirect(302, url.pathname + `?${url.searchParams.toString()}`);
	}

	const { ids, total } = await searchSeries(searchParams, {});

	const rows = await db
		.selectFrom('series')
		.leftJoin('seriesArchive', (join) =>
			join.onRef('seriesArchive.seriesId', '=', 'series.id').on('seriesArchive.order', '=', 0)
		)
		.leftJoin('archives as _archives', '_archives.id', 'seriesArchive.archiveId')
		.select((eb) => [
			'series.id',
			'series.title',
			'_archives.hash',
			'_archives.thumbnail',
			jsonArrayFrom(
				eb
					.selectFrom('archives')
					.innerJoin('seriesArchive', 'seriesArchive.archiveId', 'archives.id')
					.select((eb) => [
						'archives.id',
						'archives.hash',
						'archives.title',
						sql<number>`${eb.ref('seriesArchive.order')} + 1`.as('number'),
						'archives.pages',
						'archives.releasedAt',
					])
					.orderBy('seriesArchive.order asc')
					.whereRef('seriesArchive.seriesId', '=', 'series.id')
			).as('chapters'),
		])
		.groupBy('series.id')
		.where('series.id', 'in', ids)
		.execute();

	rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));

	const seriesList: SeriesListItem[] = [];

	for (const series of rows) {
		if (!series.chapters) {
			seriesList.push({
				id: series.id,
				title: series.title,
				hash: series.hash,
				thumbnail: series.thumbnail,
				chapterCount: 0,
				tags: [],
			});
			continue;
		}

		const galleries = await libraryItems(series.chapters.map((chapter) => chapter.id));
		const uniqueTags = new Map();

		for (const gallery of galleries) {
			for (const tag of gallery.tags) {
				uniqueTags.set(tag.id, tag);
			}
		}

		seriesList.push({
			id: series.id,
			title: series.title,
			hash: series.hash,
			thumbnail: series.thumbnail,
			chapterCount: series.chapters.length,
			tags: handleTags(Array.from(uniqueTags.values())),
		});
	}

	return {
		libraryPage: {
			data: seriesList,
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		},
	};
};
