import { json } from '@sveltejs/kit';
import { sql } from 'kysely';
import type { RequestHandler } from './$types';
import { libraryItems, searchArchives, searchSeries } from '$lib/server/db/queries';
import { handleTags, parseSearchParams } from '$lib/server/utils';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom } from '~shared/db/helpers';

export const GET: RequestHandler = async ({ url, locals }) => {
	const searchParams = parseSearchParams(url.searchParams);

	if (searchParams.series) {
		if (!locals.user && !config.site.guestAccess) {
			return json({
				series: [],
				page: searchParams.page,
				limit: searchParams.limit,
				total: 0,
			});
		}

		const { ids, total } = await searchSeries(searchParams, {});

		if (!ids.length) {
			return json({
				series: [],
				page: searchParams.page,
				limit: searchParams.limit,
				total,
			});
		}

		const rows = await db
			.selectFrom('series')
			.innerJoin('seriesArchive', (join) =>
				join.onRef('seriesArchive.seriesId', '=', 'series.id').on('seriesArchive.order', '=', 0)
			)
			.innerJoin('archives', 'archives.id', 'seriesArchive.archiveId')
			.select((eb) => [
				'series.id',
				'series.title',
				'archives.hash',
				'archives.thumbnail',
				'series.createdAt',
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

		const seriesList = [];

		for (const series of rows) {
			const galleries = await libraryItems(
				series.chapters.map((chapter) => chapter.id),
				{ skipHandlingTags: true }
			);
			const uniqueTags = new Map();

			for (const gallery of galleries) {
				for (const tag of gallery.tags) {
					uniqueTags.set(`${tag.namespace}:${tag.name}`, tag);
				}
			}

			seriesList.push({
				...series,
				pages: series.chapters.reduce((acc, chapter) => acc + chapter.pages, 0),
				tags: handleTags(Array.from(uniqueTags.values())),
			});
		}

		return json({
			series: seriesList,
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		});
	} else {
		if (!locals.user && !config.site.guestAccess) {
			return json({
				archives: [],
				page: searchParams.page,
				limit: searchParams.limit,
				total: 0,
			});
		}

		const { ids, total } = await searchArchives(searchParams, {
			showHidden: !!locals.user?.admin,
		});

		if (!ids.length) {
			return json({
				archives: [],
				page: searchParams.page,
				limit: searchParams.limit,
				total,
			});
		}

		const archives = await db
			.selectFrom('archives')
			.select((eb) => [
				'id',
				'hash',
				'title',
				'description',
				'pages',
				'thumbnail',
				'language',
				'size',
				'createdAt',
				'releasedAt',
				jsonArrayFrom(
					eb
						.selectFrom('archiveTags')
						.innerJoin('tags', 'id', 'tagId')
						.select(['namespace', 'name'])
						.whereRef('archives.id', '=', 'archiveId')
						.orderBy('archiveTags.createdAt asc')
				).as('tags'),
			])
			.where('archives.id', 'in', ids)
			.execute();

		return json({
			archives,
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		});
	}
};
