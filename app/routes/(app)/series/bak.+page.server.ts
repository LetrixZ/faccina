import { libraryItems, searchSeries } from '$lib/server/db/queries';
import { handleTags } from '$lib/server/utils';
import { parseSearchParams } from '$lib/server/utils.js';
import { randomString } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';
import config from '~shared/config';
import { jsonArrayFrom, jsonObjectFrom } from '~shared/db/helpers';
import db from '~shared/db/index.js';
import type { SeriesListItem } from '$lib/types.js';

export const load = async ({ url, locals }) => {
	const searchParams = parseSearchParams(url.searchParams, {
		sort: 'updated_at',
		order: 'desc',
	});

	if (!locals.user && !config.site.guestAccess) {
		return {
			libraryPage: {
				data: [],
				page: searchParams.page,
				limit: searchParams.limit,
				total: 0,
			},
		};
	}

	if (searchParams.sort === 'random' && !searchParams.seed) {
		url.searchParams.set('seed', randomString());
		redirect(302, url.pathname + `?${url.searchParams.toString()}`);
	}

	const { ids, total } = await searchSeries(searchParams, {});

	const rows = await db
		.selectFrom('series')
		.select((eb) => [
			'series.id',
			'series.title',
			jsonObjectFrom(
				eb
					.selectFrom('archives')
					.innerJoin('seriesArchive', (join) =>
						join
							.onRef('seriesArchive.seriesId', '=', 'series.id')
							.onRef('seriesArchive.archiveId', '=', 'archives.id')
					)
					.select(['hash', 'thumbnail'])
					.whereRef('archives.id', '=', 'seriesArchive.archiveId')
					.orderBy('seriesArchive.order asc')
					.limit(1)
			).as('main'),
			jsonArrayFrom(
				eb
					.selectFrom('archives')
					.innerJoin('seriesArchive', 'seriesArchive.archiveId', 'archives.id')
					.select([
						'archives.id',
						'archives.hash',
						'archives.title',
						'archives.pages',
						'archives.releasedAt',
					])
					.orderBy('seriesArchive.order asc')
					.whereRef('seriesArchive.seriesId', '=', 'series.id')
			).as('chapters'),
		])
		.groupBy('series.id')
		.where('series.id', 'in', ids)
		.execute()
		.then((rows) =>
			rows.map((row) => ({
				id: row.id,
				title: row.title,
				hash: row.main!.hash,
				thumbnail: row.main!.thumbnail,
				chapters: row.chapters,
			}))
		);

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
				uniqueTags.set(`${tag.namespace}:${tag.name}`, tag);
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
