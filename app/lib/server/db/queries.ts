import type { Archive, ArchiveListItem, TaxonomyItem } from '$lib/models';
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
import {
	type ExpressionBuilder,
	type ExpressionWrapper,
	type OrderByExpression,
	sql,
	type SqlBool,
} from 'kysely';
import naturalCompare from 'natural-compare-lite';
import { z } from 'zod';

import { type Order, orderSchema, type Sort, sortSchema } from '~/lib/schemas';

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

export type TagMatch = {
	table: ReferenceTable;
	relationId: RelationshipId;
	relationTable: RelationshipTable;
	value: string;
	negate: boolean;
	or: boolean;
	namespace?: string;
};

export const parseQuery = (query: string) => {
	const queryMatch = query.match(
		/[-|~]?(artist|circle|magazine|event|publisher|parody|tag|\w+):(".*?"|[^\s]+)/g
	);

	const titleMatch = query
		.replaceAll(
			/[-|~]?(artist|circle|magazine|event|publisher|parody|tag|url|source|\w+):(".*?"|[^\s]+)|\bpages(>|<|=|>=|<=)(\d+)\b/g,
			''
		)
		.trim();

	const pagesMatch = Array.from(query.matchAll(/\bpages(>|<|=|>=|<=)(\d+)\b/g)).at(-1);

	const urlMatch = Array.from(query.matchAll(/-?(url):(".*?"|[^\s]+)/g))
		.map((match) => match[2])
		.filter((match) => match !== undefined)
		.filter((match) => {
			try {
				new URL(`http://${match}`);

				return true;
			} catch {
				return false;
			}
		});

	const sourceMatch = Array.from(query.matchAll(/-?(source):(".*?"|[^\s]+)/g))
		.map((match) => match[2])
		.filter((match) => match !== undefined);

	let pagesNumber: number | undefined = undefined;
	let pagesExpression: string | undefined = undefined;

	if (pagesMatch) {
		pagesNumber = parseInt(pagesMatch[2]);
		pagesExpression = pagesMatch[1];
	}

	const matches = {
		titleMatch,
		pagesMatch: {
			number: pagesNumber,
			expression: pagesExpression,
		},
		urlMatch,
		sourceMatch,
	};

	if (!queryMatch) {
		return { ...matches, tagMatches: [] };
	}

	const tagMatches: TagMatch[] = [];

	for (const match of queryMatch) {
		const split = [match.slice(0, match.indexOf(':')), match.slice(match.indexOf(':') + 1)];

		const value = split[1].replaceAll('"', '');

		if (/^%+$/.test(value)) {
			continue;
		}

		let type = split[0];

		const negate = type.startsWith('-');
		const or = type.startsWith('~');

		type = negate || or ? type.slice(1) : type;

		if (['source', 'url'].includes(type)) {
			continue;
		}

		const obj = {
			value,
			negate,
			or,
		};

		switch (type) {
			case 'artist':
				tagMatches.push({
					...obj,
					table: 'artists',
					relationId: 'artist_id',
					relationTable: 'archive_artists',
				});
				break;
			case 'circle':
				tagMatches.push({
					...obj,
					table: 'circles',
					relationId: 'circle_id',
					relationTable: 'archive_circles',
				});
				break;
			case 'magazine':
				tagMatches.push({
					...obj,
					table: 'magazines',
					relationId: 'magazine_id',
					relationTable: 'archive_magazines',
				});
				break;
			case 'event':
				tagMatches.push({
					...obj,
					table: 'events',
					relationId: 'event_id',
					relationTable: 'archive_events',
				});
				break;
			case 'publisher':
				tagMatches.push({
					...obj,
					table: 'publishers',
					relationId: 'publisher_id',
					relationTable: 'archive_publishers',
				});
				break;
			case 'parody':
				tagMatches.push({
					...obj,
					table: 'parodies',
					relationId: 'parody_id',
					relationTable: 'archive_parodies',
				});
				break;
			case 'tag':
				tagMatches.push({
					...obj,
					table: 'tags',
					relationId: 'tag_id',
					relationTable: 'archive_tags',
					namespace: '',
				});
				break;
			default:
				tagMatches.push({
					...obj,
					table: 'tags',
					relationId: 'tag_id',
					relationTable: 'archive_tags',
					namespace: type,
				});
				break;
		}
	}

	return { ...matches, tagMatches };
};

export const search = async (
	searchParams: URLSearchParams,
	hidden: boolean,
	ids?: number[]
): Promise<{ ids: number[]; total: number }> => {
	const { tagMatches, titleMatch, pagesMatch, urlMatch, sourceMatch } = parseQuery(
		searchParams.get('q') ?? ''
	);

	const sort = sortSchema
		.nullish()
		.transform((val) => val ?? config.site.defaultSort)
		.catch(config.site.defaultSort)
		.parse(searchParams.get('sort'));
	const order = orderSchema
		.nullish()
		.transform((val) => val ?? config.site.defaultOrder)
		.catch(config.site.defaultOrder)
		.parse(searchParams.get('order'));

	const sortQuery = (sort: Sort, order: Order) => {
		switch (sort) {
			case 'released_at':
				return `archives.released_at ${order}`;
			case 'created_at':
				return `archives.created_at ${order}`;
			case 'title':
				return config.database.vendor === 'postgresql'
					? `archives.title ${order}`
					: sql`archives.title collate nocase ${sql.raw(order)}`;
			case 'pages':
				return `archives.pages ${order}`;
			default:
				return sortQuery(config.site.defaultSort, config.site.defaultOrder);
		}
	};

	const orderBy = sortQuery(sort, order) as OrderByExpression<DB, 'archives', undefined>;

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

	const buildTagQuery = (
		tag: TagMatch,
		{
			not,
			exists,
			selectFrom,
		}: Pick<ExpressionBuilder<DB, 'archives'>, 'not' | 'exists' | 'selectFrom'>
	) => {
		const expression = exists(
			selectFrom(tag.relationTable)
				.select('id')
				.whereRef('archive_id', '=', 'archives.id')
				.innerJoin(tag.table, tag.relationId, 'id')
				// @ts-expect-error works
				.where('name', like(), tag.value)
		);

		return tag.negate ? not(expression) : expression;
	};

	if (tagMatches.length) {
		const andTags = tagMatches.filter((tag) => !tag.or);
		const orTags = tagMatches.filter((tag) => tag.or);

		if (orTags.length) {
			query = query.where(({ or, not, exists, selectFrom }) => {
				const queries: ExpressionWrapper<DB, 'archives', SqlBool>[] = [];

				for (const tag of orTags) {
					queries.push(buildTagQuery(tag, { not, exists, selectFrom }));
				}

				return or(queries);
			});
		}

		if (andTags.length) {
			query = query.where(({ and, not, exists, selectFrom }) => {
				const queries: ExpressionWrapper<DB, 'archives', SqlBool>[] = [];

				for (const tag of andTags) {
					queries.push(buildTagQuery(tag, { not, exists, selectFrom }));
				}

				return and(queries);
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
								.where('name', like(), `%${split}%`)
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

	if (urlMatch.length) {
		query = query.where(({ exists, or, selectFrom }) =>
			or(
				urlMatch.map((match) =>
					exists(
						selectFrom('archive_sources')
							.select('id')
							.whereRef('archive_id', '=', 'archives.id')
							.where('url', like(), `%${match}`)
					)
				)
			)
		);
	}

	if (sourceMatch.length) {
		query = query.where(({ exists, or, selectFrom }) =>
			or(
				sourceMatch.map((match) =>
					exists(
						selectFrom('archive_sources')
							.select('id')
							.whereRef('archive_id', '=', 'archives.id')
							.where('name', like(), match)
					)
				)
			)
		);
	}

	if (ids) {
		query = query.where('archives.id', 'in', ids);
	}

	if (!hidden) {
		query = query.where('deleted_at', 'is', null);
	}

	query = query
		.orderBy([orderBy])
		.orderBy(order === Ordering.ASC ? 'archives.created_at asc' : 'archives.created_at desc')
		.orderBy(order === Ordering.ASC ? 'archives.id asc' : 'archives.id desc');

	console.log(query.compile().parameters);
	console.log(query.compile().sql);

	let filteredResults = await query.execute();

	if (sort === Sorting.TITLE) {
		filteredResults = filteredResults.toSorted((a, b) =>
			naturalCompare(a.title.toLowerCase(), b.title.toLowerCase())
		);

		if (order === Ordering.DESC) {
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

	if (sort === Sorting.RANDOM && seed) {
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
	const taxonomies: TaxonomyItem[] = [];

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
