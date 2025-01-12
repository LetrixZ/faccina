import { json } from '@sveltejs/kit';
import { sql } from 'kysely';
import type { RequestHandler } from './$types';
import { search, searchSeries } from '$lib/server/db/queries';
import { parseSearchParams } from '$lib/server/utils';
import db from '~shared/db';
import { jsonArrayFrom } from '~shared/db/helpers';

export const GET: RequestHandler = async ({ url, locals }) => {
	const searchParams = parseSearchParams(url.searchParams);

	if (searchParams.series) {
		const { ids, total } = await searchSeries(searchParams, {});

		if (!ids.length) {
			return json({
				series: [],
				page: searchParams.page,
				limit: searchParams.limit,
				total,
			});
		}

		const series = await db
			.selectFrom('series')
			.innerJoin('seriesArchive', (join) =>
				join
					.onRef('seriesArchive.seriesId', '=', 'series.id')
					.onRef('seriesArchive.archiveId', '=', 'series.mainArchiveId')
			)
			.innerJoin('archives', 'archives.id', 'seriesArchive.archiveId')
			.select((eb) => [
				'series.id',
				'archives.hash',
				'series.title',
				'series.description',
				'mainArchiveCoverPage as thumbnail',
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
							'archives.createdAt',
						])
						.orderBy('seriesArchive.order asc')
						.whereRef('seriesArchive.seriesId', '=', 'series.id')
				).as('chapters'),
			])
			.groupBy('series.id')
			.execute();

		return json({
			data: series,
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		});
	} else {
		const { ids, total } = await search(searchParams, { showHidden: !!locals.user?.admin });

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
						.select(['id', 'namespace', 'name'])
						.whereRef('archives.id', '=', 'archiveId')
						.orderBy('archiveTags.createdAt asc')
				).as('tags'),
			])
			.where('archives.id', 'in', ids)
			.execute();

		return json({
			data: archives,
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		});
	}
};
