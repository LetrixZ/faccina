import { type Order, type Sort } from '$lib/schemas';
import { shuffle } from '$lib/utils';
import chalk from 'chalk';
import {
	type Expression,
	type OrderByExpression,
	type SelectQueryBuilder,
	sql,
	type SqlBool,
} from 'kysely';
import naturalCompare from 'natural-compare-lite';
import { z } from 'zod';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom, like } from '~shared/db/helpers';
import { log, type SearchParams, sortArchiveTags } from '../utils';
import type { Query } from '$lib/query.svelte';
import type { Archive, Collection, Gallery, GalleryItem, Tag } from '$lib/types';
import type { DB } from '~shared/db/types';

export type QueryOptions = {
	showHidden?: boolean;
	matchIds?: number[] | null;
	sortingIds?: number[];
	tagBlacklist?: string[];
	skipPagination?: boolean;
	skipHandlingTags?: boolean;
};

export const getGallery = (
	id: number,
	options: Pick<QueryOptions, 'showHidden'>
): Promise<Gallery | undefined> => {
	let query = db
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
			'deletedAt',
			jsonArrayFrom(
				eb
					.selectFrom('archiveTags')
					.innerJoin('tags', 'id', 'tagId')
					.select(['namespace', 'name'])
					.whereRef('archives.id', '=', 'archiveId')
					.orderBy('archiveTags.createdAt asc')
			).as('tags'),
			jsonArrayFrom(
				eb

					.selectFrom('archiveImages')
					.select(['filename', 'pageNumber', 'width', 'height'])
					.whereRef('archives.id', '=', 'archiveId')
					.orderBy('pageNumber asc')
			).as('images'),
			jsonArrayFrom(
				eb
					.selectFrom('archiveSources')
					.select(['name', 'url'])
					.whereRef('archives.id', '=', 'archiveId')
					.orderBy('archiveSources.createdAt asc')
			).as('sources'),
			jsonArrayFrom(
				eb
					.selectFrom('seriesArchive')
					.innerJoin('series', 'series.id', 'seriesArchive.seriesId')
					.select(['series.id', 'series.title'])
					.whereRef('archives.id', '=', 'archiveId')
			).as('series'),
		])
		.where('id', '=', id);

	if (!options.showHidden) {
		query = query.where('deletedAt', 'is', null);
	}

	return query.executeTakeFirst();
};

export const getArchive = (id: number): Promise<Archive | undefined> => {
	return db
		.selectFrom('archives')
		.select((eb) => [
			'id',
			'hash',
			'path',
			'title',
			'description',
			'pages',
			'thumbnail',
			'language',
			'size',
			'protected',
			'createdAt',
			'releasedAt',
			'deletedAt',
			jsonArrayFrom(
				eb
					.selectFrom('archiveTags')
					.innerJoin('tags', 'id', 'tagId')
					.select(['namespace', 'name'])
					.whereRef('archives.id', '=', 'archiveId')
					.orderBy('archiveTags.createdAt asc')
			).as('tags'),
			jsonArrayFrom(
				eb
					.selectFrom('archiveImages')
					.select(['filename', 'pageNumber', 'width', 'height'])
					.whereRef('archives.id', '=', 'archiveId')
					.orderBy('pageNumber asc')
			).as('images'),
			jsonArrayFrom(
				eb
					.selectFrom('archiveSources')
					.select(['name', 'url'])
					.whereRef('archives.id', '=', 'archiveId')
					.orderBy('archiveSources.createdAt asc')
			).as('sources'),
			jsonArrayFrom(
				eb
					.selectFrom('seriesArchive')
					.innerJoin('series', 'series.id', 'seriesArchive.seriesId')
					.select(['series.title', 'seriesArchive.order'])
					.whereRef('seriesArchive.archiveId', '=', 'archives.id')
			).as('series'),
		])
		.where('id', '=', id)
		.executeTakeFirst();
};

type TagMatch = {
	namespace: string;
	name: string;
	negate: boolean;
	or: boolean;
};

export const parseQuery = (query: string) => {
	query = query.replaceAll('$', '');

	const tagQueryMatches = query.match(/[-|~]?(\w+):(".*?"|[^\s]+)/g);

	const titleMatch = query
		.replaceAll(
			/[-|~]?(\w+):(".*?"|[^\s]+)|\b(\w+)(>|<|=|>=|<=)(\d+)([kmg])?\b|\blanguage:(\w+)\b/gi,
			'#||#'
		)
		.trim()
		.split('#||#')
		.map((s) => s.trim())
		.filter((s) => s.length);

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

	const pagesMatch = Array.from(query.matchAll(/\bpages(>|<|=|>=|<=)(\d+)\b/g)).at(-1);

	let pagesNumber: number | undefined = undefined;
	let pagesExpression: string | undefined = undefined;

	if (pagesMatch?.[1] !== undefined && pagesMatch[2] !== undefined) {
		pagesNumber = parseInt(pagesMatch[2]);
		pagesExpression = pagesMatch[1];
	}

	const tagsQuantityMatch = Array.from(query.matchAll(/\btags(>|<|=|>=|<=)(\d+)\b/g)).at(-1);

	let tagsQuantity: number | undefined = undefined;
	let tagsQuantityExpression: string | undefined = undefined;

	if (tagsQuantityMatch?.[1] !== undefined && tagsQuantityMatch[2] !== undefined) {
		tagsQuantity = parseInt(tagsQuantityMatch[2]);
		tagsQuantityExpression = tagsQuantityMatch[1];
	}

	const sourcesQuantityMatch = Array.from(query.matchAll(/\bsources(>|<|=|>=|<=)(\d+)\b/g)).at(-1);

	let sourcesQuantity: number | undefined = undefined;
	let sourcesQuantityExpression: string | undefined = undefined;

	if (sourcesQuantityMatch?.[1] !== undefined && sourcesQuantityMatch[2] !== undefined) {
		sourcesQuantity = parseInt(sourcesQuantityMatch[2]);
		sourcesQuantityExpression = sourcesQuantityMatch[1];
	}

	const sizeMatch = Array.from(query.matchAll(/\bsize(>|<|=|>=|<=)(\d+)([kmg])?\b/gi)).at(-1);

	let sizeNumber: number | undefined = undefined;
	let sizeExpression: string | undefined = undefined;

	if (sizeMatch?.[1] !== undefined && sizeMatch[2] !== undefined && sizeMatch[3] !== undefined) {
		const parsedSize = parseInt(sizeMatch[2]);

		switch (sizeMatch[3]?.toLowerCase()) {
			case 'k':
				sizeNumber = parsedSize * 1024;
				break;
			case 'm':
				sizeNumber = parsedSize * 1024 * 1024;
				break;
			case 'g':
				sizeNumber = parsedSize * 1024 * 1024 * 1024;
				break;
			default:
				sizeNumber = parsedSize;
				break;
		}

		sizeExpression = sizeMatch[1];
	}

	const tagNamespaceQuantityMatch = Array.from(query.matchAll(/\b(\w+)(>|<|=|>=|<=)(\d+)\b/g));

	const tagNamespaceQuantity: {
		namespace: string;
		quantity: number;
		expression: string;
	}[] = [];

	if (tagNamespaceQuantityMatch.length) {
		for (const match of tagNamespaceQuantityMatch) {
			if (match[1] === undefined || match[2] === undefined || match[3] === undefined) {
				continue;
			}

			const namespace = match[1];

			if (['source', 'sources', 'url', 'language', 'size', 'tags'].includes(namespace)) {
				continue;
			}

			tagNamespaceQuantity.push({
				namespace: match[1],
				expression: match[2],
				quantity: parseInt(match[3]),
			});
		}
	}

	const languageMatch = Array.from(query.matchAll(/\blanguage:(\w+)\b/g));

	const matches = {
		titleMatch,
		pagesMatch: {
			number: pagesNumber,
			expression: pagesExpression,
		},
		tagsQuantityMatch: {
			quantity: tagsQuantity,
			expression: tagsQuantityExpression,
		},
		sourcesQuantityMatch: {
			quantity: sourcesQuantity,
			expression: sourcesQuantityExpression,
		},
		size: {
			number: sizeNumber,
			expression: sizeExpression,
		},
		tagNamespaceQuantity,
		urlMatch,
		sourceMatch,
		languageMatch: languageMatch.map((match) => match?.[1]).filter((match) => match !== undefined),
	};

	const tagMatches: TagMatch[] = [];

	if (!tagQueryMatches) {
		return { ...matches, tagMatches };
	}

	for (const match of tagQueryMatches) {
		const split = [match.slice(0, match.indexOf(':')), match.slice(match.indexOf(':') + 1)];

		if (split[0] === undefined || split[1] === undefined) {
			continue;
		}

		let name = split[1].replaceAll('"', '');

		if (/^%+$/.test(name)) {
			continue;
		}

		if (!name.endsWith('$')) {
			name = name + '%';
		} else {
			name = name.slice(0, -1);
		}

		let namespace = split[0];

		const negate = namespace.startsWith('-');
		const or = namespace.startsWith('~');

		namespace = negate || or ? namespace.slice(1) : namespace;

		if (['source', 'sources', 'url', 'language', 'size', 'tags'].includes(namespace)) {
			continue;
		}

		tagMatches.push({
			namespace,
			name,
			negate,
			or,
		});
	}

	return { ...matches, tagMatches };
};

const parseTitleQuery = (titleMatch: string[]) => {
	if (titleMatch.length) {
		let splits = titleMatch.join(' ').split(' ');

		if (config.database.vendor === 'postgresql') {
			splits = splits
				.map((s) =>
					s
						.replace(/<->|\||&|\(\)|!|#/g, '')
						.replaceAll("'", '<->')
						.trim()
				)
				.filter((s) => s.length && !['-', '~', '!', '(', ')', '()'].includes(s));
		}

		const andQueries = splits
			.filter((s) => !s.startsWith('~') && !s.startsWith('-'))
			.map((s) =>
				s
					.toLowerCase()
					.replace(/[^ -~]/g, '')
					.trim()
			)
			.filter((s) => s.length);
		const orQueries = splits
			.filter((s) => s.startsWith('~'))
			.map((s) =>
				s
					.substring(1)
					.toLowerCase()
					.replace(/[^ -~]/g, '')
					.trim()
			)
			.filter((s) => s.length);

		const notQueries = splits
			.filter((s) => s.startsWith('-'))
			.map((s) =>
				s
					.substring(1)
					.toLowerCase()
					.replace(/[^ -~]/g, '')
					.trim()
			)
			.filter((s) => s.length);

		let or = ``;
		let not = ``;

		if (config.database.vendor === 'postgresql') {
			const and = andQueries.join(' & ');

			if (orQueries.length) {
				or = `(${orQueries.join(' | ')})`;
			}

			if (notQueries.length) {
				not = `!(${notQueries.join(' & ')})`;
			}

			if (and.length && or.length) {
				or = `& ${or}`;
			}

			if ((and.length || or.length) && not.length) {
				not = `& ${not}`;
			}

			return { and, or, not };
		} else {
			const and = andQueries.map((s) => `"${s}"`).join(' AND ');

			if (orQueries.length) {
				or = `(${orQueries.map((s) => `"${s}"`).join(' OR ')})`;
			}

			if (notQueries.length) {
				not = `NOT (${notQueries.map((s) => `"${s}"`).join(' AND ')})`;
			}

			if (and.length && or.length) {
				or = `AND ${or}`;
			}

			return { and, or, not };
		}
	}
};

export const searchArchives = async (
	searchQuery: Query,
	options: QueryOptions
): Promise<{ ids: number[]; total: number }> => {
	let start = performance.now();

	const {
		tagMatches,
		titleMatch,
		pagesMatch,
		tagsQuantityMatch,
		sourcesQuantityMatch,
		size,
		tagNamespaceQuantity,
		languageMatch,
		urlMatch,
		sourceMatch,
	} = parseQuery(searchQuery.search);

	log(
		chalk.blue(
			`• Query parsed in ${chalk.bold(`${(performance.now() - start).toFixed(2)}ms`)}${searchQuery.search.length ? ` - ${searchQuery.search}` : ''}`
		)
	);

	start = performance.now();

	const sortQuery = (sort: Sort, order: Order) => {
		switch (sort) {
			case 'released_at':
				return config.database.vendor === 'postgresql'
					? sql`archives.released_at ${sql.raw(order)} nulls last`
					: `archives.released_at ${order}`;
			case 'title':
				return config.database.vendor === 'postgresql'
					? `archives.title ${order}`
					: sql`archives.title collate nocase ${sql.raw(order)}`;
			case 'pages':
				return `archives.pages ${order}`;
			case 'created_at':
			default:
				return `archives.created_at ${order}`;
		}
	};

	const orderBy = sortQuery(searchQuery.sort, searchQuery.order) as OrderByExpression<
		DB,
		'archives',
		undefined
	>;

	if (options.tagBlacklist?.length) {
		for (const tag of options.tagBlacklist) {
			const namespace = tag.split(':')[0];
			const name = tag.split(':').slice(1).join(':');

			if (namespace === undefined || name === undefined) {
				continue;
			}

			tagMatches.push({
				namespace,
				name,
				negate: true,
				or: false,
			});
		}
	}

	const getTagIds = (name: string, namespace = 'tag') => {
		let query = db.selectFrom('tags').select('id');

		if (namespace !== 'tag') {
			query = query.where('namespace', '=', namespace);
		}

		return query.where((eb) => eb('name', like(), name)).execute();
	};

	const excludeTags = (
		await Promise.all(
			tagMatches
				.filter((tag) => !tag.or && tag.negate)
				.map((tag) => getTagIds(tag.name, tag.namespace))
		)
	)
		.flat()
		.map((tag) => tag.id);

	const optionalTags = (
		await Promise.all(
			tagMatches.filter((tag) => tag.or).map((tag) => getTagIds(tag.name, tag.namespace))
		)
	)
		.flat()
		.map((tag) => tag.id);

	let archiveIdsExclude: number[] = [];
	let archiveIdsOptional: number[] = [];

	if (excludeTags.length) {
		archiveIdsExclude = (
			await db
				.selectFrom('archiveTags')
				.select('archiveId')
				.where('tagId', 'in', excludeTags)
				.groupBy('archiveId')
				.execute()
		).map((at) => at.archiveId);
	}

	if (optionalTags.length) {
		archiveIdsOptional = (
			await db
				.selectFrom('archiveTags')
				.select('archiveId')
				.where('tagId', 'in', optionalTags)
				.groupBy('archiveId')
				.execute()
		).map((at) => at.archiveId);
	}

	log(
		chalk.blue(
			`• Exclude and optional tags fetched in ${chalk.bold(`${(performance.now() - start).toFixed(2)}ms`)}${searchQuery.search.length ? ` - ${searchQuery.search}` : ''}`
		)
	);

	start = performance.now();

	let query = (() => {
		if (config.database.vendor === 'sqlite') {
			return db.selectFrom('archives').select(['archives.id', 'archives.title']);
		} else {
			return db.selectFrom('archives').select(['archives.id']);
		}
	})() as SelectQueryBuilder<DB, 'archives' | 'archivesFts', { id: number; title: string }>;

	const inclusiveTags = tagMatches.filter((tag) => !tag.or && !tag.negate);

	if (inclusiveTags.length) {
		query = query.where((eb) => {
			const conditions: Expression<SqlBool>[] = [];

			for (const tag of inclusiveTags) {
				conditions.push(
					eb.exists(
						eb
							.selectFrom('archiveTags')
							.select('id')
							.innerJoin('tags', 'id', 'tagId')
							.whereRef('archives.id', '=', 'archiveId')
							.where((eb) =>
								tag.namespace === 'tag'
									? eb('name', like(), tag.name)
									: eb('name', like(), tag.name).and('namespace', '=', tag.namespace)
							)
					)
				);
			}

			return eb.and(conditions);
		});
	}

	if (archiveIdsExclude.length) {
		query = query.where('id', 'not in', archiveIdsExclude);
	}

	if (archiveIdsOptional.length) {
		query = query.where('id', 'in', archiveIdsOptional);
	}

	const parsedTitlteQuery = parseTitleQuery(titleMatch);

	if (parsedTitlteQuery) {
		const { and, or, not } = parsedTitlteQuery;

		if (config.database.vendor === 'postgresql') {
			query = query.where('archives.fts', '@@', `${`${and} ${or} ${not}`}`);
		} else {
			query = query.innerJoin('archivesFts', `archivesFts.rowid`, 'archives.id');

			if (!and.length && not.length) {
				if (or.length) {
					query = query.where((eb) => sql`${eb.table('archivesFts')} = ${or}`);
				}

				query = query.where((eb) =>
					eb(
						'archives.id',
						'not in',
						eb
							.selectFrom('archives')
							.innerJoin('archivesFts', `archivesFts.rowid`, 'archives.id')
							.select('id')
							.where((eb) => sql`${eb.table('archivesFts')} = ${not.replace('NOT', '')}`)
					)
				);
			} else {
				query = query.where((eb) => sql`${eb.table('archivesFts')} = ${`${and} ${or} ${not}`}`);
			}
		}
	}

	if (pagesMatch.expression && pagesMatch.number) {
		const { data } = z.enum(['>', '<', '=', '>=', '<=']).safeParse(pagesMatch.expression);

		if (data) {
			query = query.where('pages', data, pagesMatch.number);
		}
	}

	if (tagsQuantityMatch.expression !== undefined && tagsQuantityMatch.quantity !== undefined) {
		const { data } = z.enum(['>', '<', '=', '>=', '<=']).safeParse(tagsQuantityMatch.expression);
		const quantity = tagsQuantityMatch.quantity;

		if (data) {
			query = query.where((eb) =>
				eb.exists(
					eb
						.selectFrom('archiveTags')
						.select('archiveId')
						.whereRef('archiveTags.archiveId', '=', 'archives.id')
						.having((eb) => eb(eb.fn.count<number>('archiveTags.tagId'), data, quantity))
						.groupBy('archiveTags.archiveId')
				)
			);
		}
	}

	if (
		sourcesQuantityMatch.expression !== undefined &&
		sourcesQuantityMatch.quantity !== undefined
	) {
		const { data } = z.enum(['>', '<', '=', '>=', '<=']).safeParse(sourcesQuantityMatch.expression);
		const quantity = sourcesQuantityMatch.quantity;

		if (data) {
			// @ts-expect-error works
			query = query
				.leftJoin('archiveSources', 'archiveSources.archiveId', 'archives.id')
				.having((eb) => eb(eb.fn.count<number>('archiveSources.archiveId'), data, quantity))
				.groupBy('archives.id');
		}
	}

	if (size.expression !== undefined && size.number !== undefined) {
		const { data } = z.enum(['>', '<', '=', '>=', '<=']).safeParse(size.expression);

		if (data) {
			query = query.where('size', data, size.number).groupBy('archives.id');
		}
	}

	if (tagNamespaceQuantity.length) {
		// @ts-expect-error works
		query = query
			.leftJoin('archiveTags as namespaceQuantity', 'namespaceQuantity.archiveId', 'archives.id')
			.groupBy('archives.id');

		for (const { namespace, expression, quantity } of tagNamespaceQuantity) {
			const { data } = z.enum(['>', '<', '=', '>=', '<=']).safeParse(expression);

			if (data) {
				// @ts-expect-error works
				query = query
					.leftJoin(`tags as ${namespace}`, (join) =>
						join
							// @ts-expect-error works
							.onRef(`${namespace}.id`, '=', 'namespaceQuantity.tagId')
							.on(`${namespace}.namespace`, '=', namespace)
					)
					.having((eb) => eb(eb.fn.count<number>(`${namespace}.id`), data, quantity));
			}
		}
	}

	if (languageMatch?.length) {
		for (const language of languageMatch) {
			query = query.where('language', like(), language);
		}
	}

	if (urlMatch.length) {
		query = query.where(({ exists, or, selectFrom }) =>
			or(
				urlMatch.map((match) =>
					exists(
						selectFrom('archiveSources')
							.select('id')
							.whereRef('archiveId', '=', 'archives.id')
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
						selectFrom('archiveSources')
							.select('id')
							.whereRef('archiveId', '=', 'archives.id')
							.where('name', like(), match)
					)
				)
			)
		);
	}

	if (options.matchIds) {
		if (options.matchIds.length) {
			query = query.where('archives.id', 'in', options.matchIds);
		} else {
			return { ids: [], total: 0 };
		}
	}

	if (!options.showHidden) {
		query = query.where('deletedAt', 'is', null);
	}

	query = query
		.orderBy([orderBy])
		.orderBy(searchQuery.order === 'asc' ? 'archives.createdAt asc' : 'archives.createdAt desc')
		.orderBy(searchQuery.order === 'asc' ? 'archives.id asc' : 'archives.id desc');

	const compiled = query.compile();

	log(
		chalk.blue(
			`• Main query builded in ${chalk.bold(`${(performance.now() - start).toFixed(2)}ms`)} - \n  Compiled query: ${chalk.gray(compiled.sql)}\n  Parameters: ${chalk.gray(JSON.stringify(compiled.parameters))}${searchQuery.search.length ? ` - ${searchQuery.search}` : ''}`
		)
	);

	start = performance.now();

	let filteredResults = await query.execute();

	log(
		chalk.blue(`• Query exceuted in ${chalk.bold(`${(performance.now() - start).toFixed(2)}ms`)}`)
	);

	if (config.database.vendor === 'sqlite' && searchQuery.sort === 'title') {
		filteredResults = (filteredResults as { id: number; title: string }[]).toSorted((a, b) =>
			naturalCompare(a.title.toLowerCase(), b.title.toLowerCase())
		);

		if (searchQuery.order === 'desc') {
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

	if (searchQuery.sort === 'random' && searchQuery.seed) {
		allIds = shuffle(allIds, searchQuery.seed);
	}

	return {
		ids: options.skipPagination
			? allIds
			: allIds.slice(
					(searchQuery.page - 1) * searchQuery.limit,
					searchQuery.page * searchQuery.limit
				),
		total: allIds.length,
	};
};

export const libraryItems = async (
	ids: number[],
	options?: QueryOptions
): Promise<GalleryItem[]> => {
	if (!ids.length) {
		return [];
	}

	let archives = (await db
		.selectFrom('archives')
		.select((eb) => [
			'id',
			'hash',
			'title',
			'pages',
			'thumbnail',
			'deletedAt',
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
		.execute()) satisfies GalleryItem[];

	if (!options?.skipHandlingTags) {
		archives = archives.map((archive) => sortArchiveTags(archive));
	}

	if (options?.sortingIds) {
		const ids = options.sortingIds;

		return archives.toSorted((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
	} else {
		return archives.toSorted((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
	}
};

export const tagList = (): Promise<Tag[]> =>
	db.selectFrom('tags').select(['namespace', 'name']).execute();

export const getUserBlacklist = async (userId: string) => {
	const row = await db
		.selectFrom('userBlacklist')
		.select('blacklist')
		.where('userId', '=', userId)
		.executeTakeFirst();

	if (!row) {
		return [];
	}

	try {
		return z.array(z.string()).parse(row.blacklist);
	} catch {
		return [];
	}
};

export const userCollections = (userId: string): Promise<Collection[]> =>
	db
		.selectFrom('collection')
		.select((eb) => [
			'collection.id',
			'collection.name',
			'collection.slug',
			'collection.protected',
			jsonArrayFrom(
				eb
					.selectFrom('collectionArchive')
					.innerJoin('archives', 'archives.id', 'archiveId')
					.select(['id', 'title', 'hash', 'thumbnail', 'deletedAt'])
					.orderBy('collectionArchive.order asc')
					.whereRef('collection.id', '=', 'collectionId')
			).as('archives'),
		])
		.where('userId', '=', userId)
		.groupBy('collection.id')
		.orderBy('createdAt asc')
		.execute();

export const searchSeries = async (
	params: SearchParams,
	options: QueryOptions
): Promise<{ ids: number[]; total: number }> => {
	const { titleMatch } = parseQuery(params.query);

	const sortQuery = (sort: Sort, order: Order) => {
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

	const sort = params.sort ?? 'updated_at';
	const order = params.order ?? 'desc';

	const orderBy = sortQuery(sort, order) as OrderByExpression<DB, 'series', undefined>;

	let ids: number[] = [];

	if (params.query.length) {
		const archives = await searchArchives(params, {
			...options,
			skipPagination: true,
			showHidden: true,
		});

		ids = archives.ids;
	}

	let query = db.selectFrom('series').select(['series.id', 'series.title']);

	if (options.matchIds && !options.matchIds.length) {
		return { ids: [], total: 0 };
	}

	const parsedTitlteQuery = parseTitleQuery(titleMatch);

	if (parsedTitlteQuery && config.database.vendor === 'sqlite') {
		query = query.innerJoin('seriesFts', `seriesFts.rowid`, 'series.id');
	}

	query = query.where((eb) => {
		const expressions: Expression<SqlBool>[] = [];

		if (parsedTitlteQuery) {
			const { and, or, not } = parsedTitlteQuery;

			if (config.database.vendor === 'postgresql') {
				expressions.push(eb('series.fts', '@@', `${`${and} ${or} ${not}`}`));
			} else {
				// @ts-expect-error works
				expressions.push(sql`${eb.table('seriesFts')} = ${`${and} ${or} ${not}`}`);
			}
		}

		if (options.matchIds) {
			if (options.matchIds.length) {
				expressions.push(eb('series.id', 'in', options.matchIds));
			}
		}

		if (ids.length) {
			const expression: Expression<SqlBool> = eb.exists(
				eb
					.selectFrom('seriesArchive')
					.select('seriesArchive.seriesId')
					.whereRef('seriesArchive.seriesId', '=', 'series.id')
					.where('seriesArchive.archiveId', 'in', ids)
			);

			if (expressions.length) {
				return eb.and(expressions).or(expression);
			} else {
				return eb.and([expression]);
			}
		} else {
			return eb.and(expressions);
		}
	});

	query = query.orderBy([orderBy]);

	let filteredResults = await query.execute();

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
			ids: [],
			total: allIds.length,
		};
	}

	if (sort === 'random' && params.seed) {
		allIds = shuffle(allIds, params.seed);
	}

	return {
		ids: options.skipPagination
			? allIds
			: allIds.slice((params.page - 1) * params.limit, params.page * params.limit),
		total: allIds.length,
	};
};
