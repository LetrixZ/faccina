import { json } from '@sveltejs/kit';
import { sql } from 'kysely';
import { jsonArrayFrom } from '~shared/db/helpers';
import db from '~shared/db/index.js';

export const GET = async ({ params }) => {
	const id = parseInt(params.id);

	if (isNaN(id)) {
		return json({ error: 'Invalid ID' }, { status: 404004 });
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
		.where('series.id', '=', id)
		.groupBy('series.id')
		.executeTakeFirst();

	if (!series) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	return json(series);
};
