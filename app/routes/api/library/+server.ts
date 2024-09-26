import { search } from '$lib/server/db/queries';
import { cleanNested } from '$lib/utils';
import { json } from '@sveltejs/kit';
import db from '~shared/db';
import { jsonAgg } from '~shared/db/helpers';
import { sql } from 'kysely';

export const GET = async ({ url, locals }) => {
	const searchParams = new URLSearchParams(url.searchParams);

	const { ids, total } = await search(searchParams, !!locals.user);

	if (!ids.length) {
		return json({
			archives: [],
			page: 1,
			limit: 24,
			total,
		});
	}

	let archives = await db
		.selectFrom('archives')
		.select((eb) => [
			'archives.id',
			'archives.slug',
			'archives.hash',
			'archives.title',
			'archives.pages',
			'archives.thumbnail',
			eb
				.selectFrom('archive_artists')
				.innerJoin('artists', 'artists.id', 'archive_artists.artist_id')
				.select((eb) => sql`${sql.raw(jsonAgg())}(${eb.ref('name')})`.as('artist'))
				.whereRef('archives.id', '=', 'archive_artists.archive_id')
				.as('artists'),
			eb
				.selectFrom('archive_circles')
				.innerJoin('circles', 'circle_id', 'archive_circles.circle_id')
				.select((eb) => sql`${sql.raw(jsonAgg())}(${eb.ref('name')})`.as('circle'))
				.whereRef('archives.id', '=', 'archive_circles.archive_id')
				.as('circles'),
			eb
				.selectFrom('archive_magazines')
				.innerJoin('magazines', 'magazines.id', 'archive_magazines.magazine_id')
				.select((eb) => sql`${sql.raw(jsonAgg())}(${eb.ref('name')})`.as('magazine'))
				.whereRef('archives.id', '=', 'archive_magazines.archive_id')
				.as('magazines'),
			eb
				.selectFrom('archive_publishers')
				.innerJoin('publishers', 'publishers.id', 'archive_publishers.publisher_id')
				.select((eb) => sql`${sql.raw(jsonAgg())}(${eb.ref('name')})`.as('publisher'))
				.whereRef('archives.id', '=', 'archive_publishers.archive_id')
				.as('publishers'),
			eb
				.selectFrom('archive_events')
				.innerJoin('events', 'events.id', 'archive_events.event_id')
				.select((eb) => sql`${sql.raw(jsonAgg())}(${eb.ref('name')})`.as('event'))
				.whereRef('archives.id', '=', 'archive_events.archive_id')
				.as('events'),
			eb
				.selectFrom('archive_parodies')
				.innerJoin('parodies', 'parodies.id', 'archive_parodies.parody_id')
				.select((eb) => sql`${sql.raw(jsonAgg())}(${eb.ref('name')})`.as('parody'))
				.whereRef('archives.id', '=', 'archive_parodies.archive_id')
				.as('parodies'),
			eb
				.selectFrom('archive_tags')
				.innerJoin('tags', 'tags.id', 'archive_tags.tag_id')
				.select((eb) =>
					sql`${sql.raw(jsonAgg())}(${eb
						.case()
						.when(sql<number>`length(namespace)`, '>', 0)
						.then(sql`${eb.ref('namespace')} || ':' || ${eb.ref('name')}`)
						.else(eb.ref('name'))
						.end()})`.as('tag')
				)
				.whereRef('archives.id', '=', 'archive_tags.archive_id')
				.as('tags'),
		])
		.where('archives.id', 'in', ids)
		.execute();

	archives = cleanNested(archives).toSorted((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));

	return json({
		archives,
		page: 1,
		limit: 24,
		total,
	});
};
