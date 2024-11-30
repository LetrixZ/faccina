import {
	type Expression,
	ExpressionWrapper,
	type OrderByExpression,
	sql,
	type SqlBool,
} from 'kysely';
import naturalCompare from 'natural-compare-lite';
import { z } from 'zod';
import { handleTags, type SearchParams } from '../utils';
import { type Order, type Sort } from '$lib/schemas';
import type { Archive, Collection, Gallery, GalleryListItem, Tag } from '$lib/types';
import { shuffle } from '$lib/utils';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom, like } from '~shared/db/helpers';
import type { DB } from '~shared/types';

export type QueryOptions = {
	showHidden?: boolean;
	matchIds?: number[];
	sortingIds?: number[];
	tagBlacklist?: string[];
};

export const getGallery = (id: number, options: QueryOptions): Promise<Gallery | undefined> => {
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
					.select(['id', 'namespace', 'name', 'displayName'])
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
			'createdAt',
			'releasedAt',
			'deletedAt',
			'protected',
			jsonArrayFrom(
				eb
					.selectFrom('archiveTags')
					.innerJoin('tags', 'id', 'tagId')
					.select(['id', 'namespace', 'name', 'displayName'])
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
	const tagQueryMatches = query.match(/[-|~]?(\w+):(".*?"|[^\s]+)/g);

	const titleMatch = query
		.replaceAll(
			/[-|~]?(\w+):(".*?"|[^\s]+)|\bpages(>|<|=|>=|<=)(\d+)\b|\blanguage:(\w+)\b/g,
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

	if (pagesMatch) {
		pagesNumber = parseInt(pagesMatch[2]);
		pagesExpression = pagesMatch[1];
	}

	const languageMatch = Array.from(query.matchAll(/\blanguage:(\w+)\b/g));

	const matches = {
		titleMatch,
		pagesMatch: {
			number: pagesNumber,
			expression: pagesExpression,
		},
		urlMatch,
		sourceMatch,
		languageMatch: languageMatch.map((match) => match?.[1]),
	};

	const tagMatches: TagMatch[] = [];

	if (!tagQueryMatches) {
		return { ...matches, tagMatches };
	}

	for (const match of tagQueryMatches) {
		const split = [match.slice(0, match.indexOf(':')), match.slice(match.indexOf(':') + 1)];

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

		if (['source', 'url', 'language'].includes(namespace)) {
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

export const search = async (
	params: SearchParams,
	options: QueryOptions
): Promise<{ ids: number[]; total: number }> => {
	const start = performance.now();

	const { tagMatches, titleMatch, pagesMatch, languageMatch, urlMatch, sourceMatch } = parseQuery(
		params.query
	);

	const sortQuery = (sort: Sort, order: Order) => {
		switch (sort) {
			case 'released_at':
				return `archives.released_at ${order}`;
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

	const sort = params.sort ?? config.site.defaultSort;
	const order = params.order ?? config.site.defaultOrder;

	const orderBy = sortQuery(sort, order) as OrderByExpression<DB, 'archives', undefined>;

	if (options.tagBlacklist) {
		tagMatches.push(
			...options.tagBlacklist.map((tag) => ({
				namespace: tag.split(':')[0],
				name: tag.split(':').slice(1).join(':'),
				negate: true,
				or: false,
			}))
		);
	}

	const getTagIds = (name: string, namespace = 'tag') => {
		let query = db.selectFrom('tags').select('id');

		if (namespace !== 'tag') {
			query = query.where('namespace', '=', namespace);
		}

		return query.where((eb) => eb('name', like(), name).or('displayName', like(), name)).execute();
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

	let query = (() => {
		if (config.database.vendor === 'sqlite') {
			return db.selectFrom('archives').select(['archives.id', 'archives.title']);
		} else {
			return db.selectFrom('archives').select(['archives.id']);
		}
	})();

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
									? eb('name', like(), tag.name).or('displayName', like(), tag.name)
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

	if (titleMatch.length) {
		if (config.database.vendor === 'postgresql' && config.database.enableFts) {
			query = query.where(
				'archives.fts',
				'@@',
				sql<string>`websearch_to_tsquery('simple', ${titleMatch.join(' ').replaceAll('- ', '\\- ')})`
			);
		} else {
			for (let split of titleMatch) {
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

					const buildTagQuery = () => {
						return exists(
							selectFrom('archiveTags')
								.innerJoin('tags', 'id', 'tagId')
								.select('id')
								.where((eb) =>
									eb('name', like(), `${split}%`).or('displayName', like(), `${split}%`)
								)
								.where('namespace', 'in', ['artist', 'circle'])
								.whereRef('archiveId', '=', 'archives.id')
						);
					};

					conditions.push(negate ? not(buildTagQuery()) : buildTagQuery());

					return negate ? and(conditions) : or(conditions);
				});
			}
		}
	}

	if (pagesMatch.expression && pagesMatch.number) {
		const { data } = z.enum(['>', '<', '=', '>=', '<=']).safeParse(pagesMatch.expression);

		if (data) {
			query = query.where('pages', data, pagesMatch.number);
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

	if (options.matchIds?.length) {
		query = query.where('archives.id', 'in', options.matchIds);
	}

	if (!options.showHidden) {
		query = query.where('deletedAt', 'is', null);
	}

	query = query
		.orderBy([orderBy])
		.orderBy(order === 'asc' ? 'archives.createdAt asc' : 'archives.createdAt desc')
		.orderBy(order === 'asc' ? 'archives.id asc' : 'archives.id desc');

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
		console.info(`Query "${params.query}" took ${(performance.now() - start).toFixed(2)}ms`);

		return {
			ids: [],
			total: allIds.length,
		};
	}

	if (sort === 'random' && params.seed) {
		allIds = shuffle(allIds, params.seed);
	}

	console.info(`Query "${params.query}" took ${(performance.now() - start).toFixed(2)}ms`);

	return {
		ids: allIds.slice((params.page - 1) * params.limit, params.page * params.limit),
		total: allIds.length,
	};
};

export const libraryItems = async (
	ids: number[],
	options?: QueryOptions
): Promise<GalleryListItem[]> => {
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
					.select(['id', 'namespace', 'name', 'displayName'])
					.whereRef('archives.id', '=', 'archiveId')
					.orderBy('archiveTags.createdAt asc')
			).as('tags'),
		])
		.where('archives.id', 'in', ids)
		.execute()) satisfies GalleryListItem[];

	archives = archives.map((archive) => handleTags(archive));

	if (options?.sortingIds) {
		const ids = options.sortingIds;

		return archives.toSorted((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
	} else {
		return archives.toSorted((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
	}
};

export const tagList = (): Promise<Tag[]> =>
	db.selectFrom('tags').select(['id', 'namespace', 'name', 'displayName']).execute();

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
