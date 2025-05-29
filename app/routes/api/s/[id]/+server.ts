import { libraryItems } from '$lib/server/db/queries.js';
import { handleTags } from '$lib/server/utils.js';
import { json } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom } from '~shared/db/helpers';
import { sql } from 'kysely';

export const GET = async ({ params, locals }) => {
	if (!locals.user && !config.site.guestAccess) {
		return new Response(null, { status: 404 });
	}

	const id = parseInt(params.id);

	if (isNaN(id)) {
		return json({ error: 'Invalid ID' }, { status: 404 });
	}

	const series = await db
		.selectFrom('series')
		.innerJoin('seriesArchive', (join) =>
			join.onRef('seriesArchive.seriesId', '=', 'series.id').on('seriesArchive.order', '=', 0)
		)
		.innerJoin('archives', 'archives.id', 'seriesArchive.archiveId')
		.select((eb) => [
			'series.id',
			'archives.hash',
			'series.title',
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
		.where('series.id', '=', id)
		.groupBy('series.id')
		.executeTakeFirst();

	if (!series) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const galleries = await libraryItems(series.chapters.map((chapter) => chapter.id));
	const uniqueTags = new Map();

	for (const gallery of galleries) {
		for (const tag of gallery.tags) {
			uniqueTags.set(`${tag.namespace}:${tag.name}`, tag);
		}
	}

	return json({
		...series,
		pages: series.chapters.reduce((acc, chapter) => acc + chapter.pages, 0),
		tags: handleTags(Array.from(uniqueTags.values())),
	});
};
