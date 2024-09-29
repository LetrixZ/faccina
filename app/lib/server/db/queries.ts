import type { Archive, ArchiveListItem } from '$lib/models';
import type { DB } from '~shared/types';

import { shuffle } from '$lib/utils';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom, jsonObjectFrom, like } from '~shared/db/helpers';
import {
	referenceTable,
	type ReferenceTable,
	relationId,
	type RelationshipId,
	type RelationshipTable,
	relationTable,
	taxonomyTables,
} from '~shared/taxonomy';
import { ExpressionWrapper, type OrderByExpression, sql, type SqlBool } from 'kysely';
import naturalCompare from 'natural-compare-lite';
import { z } from 'zod';

export enum Sorting {
	RELEVANCE = 'relevance',
	RELEASED_AT = 'released_at',
	CREATED_AT = 'created_at',
	TITLE = 'title',
	PAGES = 'pages',
	RANDOM = 'random',
}

export enum Ordering {
	ASC = 'asc',
	DESC = 'desc',
}

export const get = (id: number, hidden: boolean): Promise<Archive | undefined> => {
	let query = db
		.selectFrom('archives')
		.select((eb) => [
			'id',
			'slug',
			'hash',
			'title',
			'description',
			'path',
			'pages',
			'thumbnail',
			'language',
			'size',
			'created_at',
			'released_at',
			'deleted_at',
			'has_metadata',
			jsonObjectFrom(
				eb
					.selectFrom('archive_images')
					.select('archive_images.width')
					.select('archive_images.height')
					.whereRef('archives.id', '=', 'archive_images.archive_id')
					.whereRef('archives.thumbnail', '=', 'archive_images.page_number')
					.limit(1)
			).as('cover'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_artists')
					.innerJoin('artists', 'artists.id', 'archive_artists.artist_id')
					.select(['artists.slug', 'artists.name'])
					.whereRef('archives.id', '=', 'archive_artists.archive_id')
			).as('artists'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_circles')
					.innerJoin('circles', 'circles.id', 'archive_circles.circle_id')
					.select(['circles.slug', 'circles.name'])
					.whereRef('archives.id', '=', 'archive_circles.archive_id')
			).as('circles'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_magazines')
					.innerJoin('magazines', 'magazines.id', 'archive_magazines.magazine_id')
					.select(['magazines.slug', 'magazines.name'])
					.whereRef('archives.id', '=', 'archive_magazines.archive_id')
			).as('magazines'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_publishers')
					.innerJoin('publishers', 'publishers.id', 'archive_publishers.publisher_id')
					.select(['publishers.slug', 'publishers.name'])
					.whereRef('archives.id', '=', 'archive_publishers.archive_id')
			).as('publishers'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_events')
					.innerJoin('events', 'events.id', 'archive_events.event_id')
					.select(['events.slug', 'events.name'])
					.whereRef('archives.id', '=', 'archive_events.archive_id')
			).as('events'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_parodies')
					.innerJoin('parodies', 'parodies.id', 'archive_parodies.parody_id')
					.select(['parodies.slug', 'parodies.name'])
					.whereRef('archives.id', '=', 'archive_parodies.archive_id')
			).as('parodies'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_tags')
					.innerJoin('tags', 'tags.id', 'archive_tags.tag_id')
					.select(['tags.slug', 'tags.name', 'archive_tags.namespace'])
					.whereRef('archives.id', '=', 'archive_tags.archive_id')
			).as('tags'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_images')
					.select([
						'archive_images.filename',
						'archive_images.page_number',
						'archive_images.width',
						'archive_images.height',
					])
					.whereRef('archives.id', '=', 'archive_images.archive_id')
			).as('images'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_sources')
					.select(['name', 'url'])
					.whereRef('archives.id', '=', 'archive_sources.archive_id')
					.orderBy('name asc')
			).as('sources'),
		])
		.where('id', '=', id);

	if (!hidden) {
		query = query.where('deleted_at', 'is', null);
	}

	return query.executeTakeFirst();
};

export const parseQuery = (query: string) => {
	const queryMatch = query.match(
		/-?(artist|circle|magazine|event|publisher|parody|tag|\w+):(".*?"|'.*?'|[^\s]+)/g
	);

	const titleMatch = query
		.replaceAll(
			/-?(artist|circle|magazine|event|publisher|parody|tag|\w+):(".*?"|'.*?'|[^\s]+)|\bpages(>|<|=|>=|<=)(\d+)\b/g,
			''
		)
		.trim();

	const pagesMatch = Array.from(query.matchAll(/\bpages(>|<|=|>=|<=)(\d+)\b/g)).at(-1);

	let pagesNumber: number | undefined = undefined;
	let pagesExpression: string | undefined = undefined;

	if (pagesMatch) {
		pagesNumber = parseInt(pagesMatch[2]);
		pagesExpression = pagesMatch[1];
	}

	if (!queryMatch) {
		return {
			tagMatches: [],
			titleMatch,
			pagesMatch: {
				number: pagesNumber,
				expression: pagesExpression,
			},
		};
	}

	const matches: {
		table: ReferenceTable;
		relationId: RelationshipId;
		relationTable: RelationshipTable;
		value: string;
		negate: boolean;
		namespace?: string;
	}[] = [];

	for (const match of queryMatch) {
		let [type, value] = match.split(':');

		const negate = type.startsWith('-');

		type = negate ? type.slice(1) : type;
		value = value.replaceAll(/"/g, '').replaceAll(/'/g, '');

		switch (type) {
			case 'artist':
				matches.push({
					table: 'artists',
					relationId: 'artist_id',
					relationTable: 'archive_artists',
					value,
					negate,
				});
				break;
			case 'circle':
				matches.push({
					table: 'circles',
					relationId: 'circle_id',
					relationTable: 'archive_circles',
					value,
					negate,
				});
				break;
			case 'magazine':
				matches.push({
					table: 'magazines',
					relationId: 'magazine_id',
					relationTable: 'archive_magazines',
					value,
					negate,
				});
				break;
			case 'event':
				matches.push({
					table: 'events',
					relationId: 'event_id',
					relationTable: 'archive_events',
					value,
					negate,
				});
				break;
			case 'publisher':
				matches.push({
					table: 'publishers',
					relationId: 'publisher_id',
					relationTable: 'archive_publishers',
					value,
					negate,
				});
				break;
			case 'parody':
				matches.push({
					table: 'parodies',
					relationId: 'parody_id',
					relationTable: 'archive_parodies',
					value,
					negate,
				});
				break;
			case 'tag':
				matches.push({
					table: 'tags',
					relationId: 'tag_id',
					relationTable: 'archive_tags',
					value,
					namespace: '',
					negate,
				});
				break;
			default:
				matches.push({
					table: 'tags',
					relationId: 'tag_id',
					relationTable: 'archive_tags',
					value,
					namespace: type,
					negate,
				});

				break;
		}
	}

	return {
		tagMatches: matches,
		titleMatch,
		pagesMatch: {
			number: pagesNumber,
			expression: pagesExpression,
		},
	};
};

export const search = async (
	searchParams: URLSearchParams,
	hidden: boolean,
	ids?: number[]
): Promise<{ ids: number[]; total: number }> => {
	const { tagMatches, titleMatch, pagesMatch } = parseQuery(searchParams.get('q') ?? '');

	const sorting = searchParams.get('sort') ?? Sorting.RELEASED_AT;
	const ordering = searchParams.get('order') ?? Ordering.DESC;

	const orderBy: OrderByExpression<DB, 'archives', undefined> = (() => {
		if (ordering === Ordering.DESC) {
			switch (sorting) {
				case Sorting.RELEASED_AT:
					return 'archives.released_at desc';
				case Sorting.CREATED_AT:
					return 'archives.created_at desc';
				case Sorting.TITLE:
					return config.database.vendor === 'postgresql'
						? 'archives.title desc'
						: sql`archives.title collate nocase desc`;
				case Sorting.PAGES:
					return 'archives.pages desc';
			}
		} else if (ordering === Ordering.ASC) {
			switch (sorting) {
				case Sorting.RELEASED_AT:
					return 'archives.released_at asc';
				case Sorting.CREATED_AT:
					return 'archives.created_at asc';
				case Sorting.TITLE:
					return config.database.vendor === 'postgresql'
						? 'archives.title asc'
						: sql`archives.title collate nocase asc`;
				case Sorting.PAGES:
					return 'archives.pages asc';
			}
		}

		return 'archives.released_at desc';
	})();

	const blacklist = searchParams.get('blacklist')?.split(',');

	let query = db.selectFrom('archives').select(['archives.id', 'archives.title']);

	if (blacklist?.length) {
		for (const tag of blacklist) {
			const [type, id, namespace] = tag.split(':');

			query = query.where(({ and, not, exists, selectFrom }) =>
				and([
					not(
						exists(
							selectFrom(relationTable(type))
								.select('id')
								.whereRef('archive_id', '=', 'archives.id')
								.where((eb) => {
									const expression = eb(relationId(type), '=', parseInt(id));

									if (referenceTable(type) === 'tags') {
										return expression.and('archive_tags.namespace', '=', namespace ?? '');
									}

									return expression;
								})
						)
					),
				])
			);
		}
	}

	if (tagMatches.length) {
		for (const match of tagMatches) {
			query = query.where(({ and, not, exists, selectFrom }) => {
				const buildTagQuery = () => {
					return exists(
						selectFrom(match.relationTable)
							.select('id')
							.whereRef('archive_id', '=', 'archives.id')
							.innerJoin(match.table, match.relationId, 'id')
							// @ts-expect-error works
							.where((eb) => {
								const expression = eb('name', like(), `%${match.value}%`);

								if (match.table === 'tags' && match.namespace?.length) {
									return expression.and('archive_tags.namespace', '=', match.namespace);
								}

								return expression;
							})
					);
				};

				return and([match.negate ? not(buildTagQuery()) : buildTagQuery()]);
			});
		}
	}

	if (titleMatch.length) {
		for (let split of titleMatch.split(' ')) {
			split = split.trim();

			if (!split.length) {
				continue;
			}

			const negate = split.startsWith('-');

			split = negate ? split.slice(1) : split;

			query = query.where(({ eb, and, or, not, exists, selectFrom }) => {
				const conditions: ExpressionWrapper<DB, 'archives', SqlBool>[] = [];

				if (negate) {
					conditions.push(
						or([
							not(eb('title', like(), `%${split}%`)),
							not(eb('description', like(), `%${split}%`)),
						])
					);
				} else {
					conditions.push(
						eb('title', like(), `%${split}%`),
						eb('description', like(), `%${split}%`)
					);
				}

				for (const { relationTable, relationId, referenceTable } of taxonomyTables) {
					const buildTagQuery = () => {
						return exists(
							selectFrom(relationTable)
								.select('id')
								.whereRef('archive_id', '=', 'archives.id')
								.innerJoin(referenceTable, relationId, 'id')
								// @ts-expect-error works
								.where(
									'name',
									config.database.vendor === 'postgresql' ? 'ilike' : 'like',
									`%${split}%`
								)
						);
					};

					conditions.push(negate ? not(buildTagQuery()) : buildTagQuery());
				}

				return negate ? and(conditions) : or(conditions);
			});
		}
	}

	if (pagesMatch.expression && pagesMatch.number) {
		const { data } = z.enum(['>', '<', '=', '>=', '<=']).safeParse(pagesMatch.expression);

		if (data) {
			query = query.where('pages', data, pagesMatch.number);
		}
	}

	if (ids) {
		query = query.where('archives.id', 'in', ids);
	}

	if (!hidden) {
		query = query.where('deleted_at', 'is', null);
	}

	query = query
		.orderBy([orderBy])
		.orderBy(ordering === Ordering.ASC ? 'archives.created_at asc' : 'archives.created_at desc')
		.orderBy(ordering === Ordering.ASC ? 'archives.id asc' : 'archives.id desc');

	let filteredResults = await query.execute();

	if (sorting === Sorting.TITLE) {
		filteredResults = filteredResults.toSorted((a, b) => naturalCompare(a.title, b.title));

		if (ordering === Ordering.DESC) {
			filteredResults = filteredResults.toReversed();
		}
	}

	let allIds = filteredResults.map(({ id }) => id);

	if (!allIds.length) {
		return {
			ids: [],
			total: allIds.length,
		};
	}

	const seed = searchParams.get('seed');

	if (sorting === Sorting.RANDOM && seed) {
		allIds = shuffle(allIds, seed);
	}

	const offset = (parseInt(searchParams.get('page') ?? '1') - 1) * 24;

	const resultsIds = (
		await (async () => {
			switch (config.database.vendor) {
				case 'postgresql': {
					return db
						.selectFrom('archives')
						.select(['id', sql`ARRAY_POSITION(${allIds}, archives.id)`.as('ord')])
						.where('id', 'in', allIds)
						.orderBy('ord')
						.limit(24)
						.offset(offset)
						.execute()
						.then((rows) => rows.map(({ id }) => id));
				}
				case 'sqlite': {
					const values = sql.join(allIds.map((id, i) => sql`(${sql.join([i, id])})`));

					return sql<{ id: number }>`
						WITH cte(i, id) AS (VALUES ${values})
						SELECT archives.id FROM archives
						INNER JOIN cte ON cte.id = archives.id
						ORDER BY cte.i LIMIT 24
						OFFSET ${sql.val(offset)}
					`
						.execute(db)
						.then(({ rows }) => rows.map(({ id }) => id));
				}
			}
		})()
	).toSorted((a, b) => allIds.indexOf(a) - allIds.indexOf(b));

	return {
		ids: resultsIds,
		total: allIds.length,
	};
};

export const libraryItems = async (
	ids: number[],
	sortingIds?: number[]
): Promise<ArchiveListItem[]> => {
	const archives = await db
		.selectFrom('archives')
		.select((eb) => [
			'archives.id',
			'archives.slug',
			'archives.hash',
			'archives.title',
			'archives.pages',
			'archives.thumbnail',
			jsonObjectFrom(
				eb
					.selectFrom('archive_images')
					.select('archive_images.width')
					.select('archive_images.height')
					.whereRef('archives.id', '=', 'archive_images.archive_id')
					.whereRef('archives.thumbnail', '=', 'archive_images.page_number')
					.limit(1)
			).as('cover'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_artists')
					.innerJoin('artists', 'artists.id', 'archive_artists.artist_id')
					.select(['artists.slug', 'artists.name'])
					.whereRef('archives.id', '=', 'archive_artists.archive_id')
			).as('artists'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_circles')
					.innerJoin('circles', 'circles.id', 'archive_circles.circle_id')
					.select(['circles.slug', 'circles.name'])
					.whereRef('archives.id', '=', 'archive_circles.archive_id')
			).as('circles'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_magazines')
					.innerJoin('magazines', 'magazines.id', 'archive_magazines.magazine_id')
					.select(['magazines.slug', 'magazines.name'])
					.whereRef('archives.id', '=', 'archive_magazines.archive_id')
			).as('magazines'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_publishers')
					.innerJoin('publishers', 'publishers.id', 'archive_publishers.publisher_id')
					.select(['publishers.slug', 'publishers.name'])
					.whereRef('archives.id', '=', 'archive_publishers.archive_id')
			).as('publishers'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_events')
					.innerJoin('events', 'events.id', 'archive_events.event_id')
					.select(['events.slug', 'events.name'])
					.whereRef('archives.id', '=', 'archive_events.archive_id')
			).as('events'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_parodies')
					.innerJoin('parodies', 'parodies.id', 'archive_parodies.parody_id')
					.select(['parodies.slug', 'parodies.name'])
					.whereRef('archives.id', '=', 'archive_parodies.archive_id')
			).as('parodies'),
			jsonArrayFrom(
				eb
					.selectFrom('archive_tags')
					.innerJoin('tags', 'tags.id', 'archive_tags.tag_id')
					.select(['tags.slug', 'tags.name', 'archive_tags.namespace'])
					.whereRef('archives.id', '=', 'archive_tags.archive_id')
			).as('tags'),
		])
		.where('archives.id', 'in', ids)
		.execute();

	if (sortingIds) {
		return archives.toSorted((a, b) => sortingIds.indexOf(a.id) - sortingIds.indexOf(b.id));
	} else {
		return archives.toSorted((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
	}
};

export const taxonomies = async () => {
	const taxonomies: {
		slug: string;
		name: string;
		type: 'artist' | 'circle' | 'magazine' | 'event' | 'publisher' | 'parody' | 'tag';
	}[] = [];

	const artists = await db
		.selectFrom('artists')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const circles = await db
		.selectFrom('circles')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const magazines = await db
		.selectFrom('magazines')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const events = await db
		.selectFrom('events')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const publishers = await db
		.selectFrom('publishers')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const parodies = await db
		.selectFrom('parodies')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const tags = await db.selectFrom('tags').select(['id', 'slug', 'name']).orderBy('name').execute();

	taxonomies.push(...artists.map(({ slug, name }) => ({ slug, name, type: 'artist' as const })));
	taxonomies.push(...circles.map(({ slug, name }) => ({ slug, name, type: 'circle' as const })));
	taxonomies.push(
		...magazines.map(({ slug, name }) => ({ slug, name, type: 'magazine' as const }))
	);
	taxonomies.push(...events.map(({ slug, name }) => ({ slug, name, type: 'event' as const })));
	taxonomies.push(
		...publishers.map(({ slug, name }) => ({ slug, name, type: 'publisher' as const }))
	);
	taxonomies.push(...parodies.map(({ slug, name }) => ({ slug, name, type: 'parody' as const })));
	taxonomies.push(...tags.map(({ slug, name }) => ({ slug, name, type: 'tag' as const })));

	return taxonomies;
};
