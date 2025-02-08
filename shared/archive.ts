import { rm } from 'node:fs/promises';
import { sql } from 'kysely';
import db from '../shared/db';
import config from './config';
import type { Image, Series, Source, Tag } from './metadata';
import { leadingZeros } from './utils';
import { glob } from './server.utils';

/**
 * Upserts archive sources
 * @param id Archive ID
 * @param archive new archive data
 */
export const upsertSources = async (id: number, metadataSources: Source[]) => {
	metadataSources = metadataSources.map((source) => {
		const mapping = config.metadata.sourceMapping.findLast(({ match, ignoreCase }) => {
			const normalizedMatch = ignoreCase ? match.toLowerCase() : match;

			if (source.name?.length) {
				const normalizedSource = ignoreCase ? source.name.toLowerCase() : source.name;

				if (normalizedSource === normalizedMatch) {
					return true;
				}
			}

			if (source.url?.length) {
				const normalizedUrl = ignoreCase ? source.url.toLowerCase() : source.url;
				if (normalizedUrl.includes(normalizedMatch)) {
					return true;
				}
			}

			return false;
		});

		return {
			name: mapping?.name ?? source.name,
			url: source.url,
		};
	});

	await db.deleteFrom('archiveSources').where('archiveId', '=', id).execute();

	for (const source of metadataSources) {
		if (!source.name) {
			continue;
		}

		await db
			.insertInto('archiveSources')
			.values({ name: source.name, url: source.url, archiveId: id })
			.execute();
	}
};

/**
 * Upserts archive images
 * @param id Archive ID
 * @param archive new archive data
 */
export const upsertImages = async (id: number, images: Image[], hash: string) => {
	const dbImages = await db
		.selectFrom('archiveImages')
		.select(['filename', 'pageNumber', 'width', 'height'])
		.where('archiveId', '=', id)
		.execute();

	const diff: Image[] = [];

	for (const image of dbImages) {
		const newImage = images.find((_image) => _image.pageNumber === image.pageNumber);

		if (newImage && newImage.filename !== image.filename) {
			diff.push({ filename: image.filename, pageNumber: image.pageNumber });
		}
	}

	if (config.image.removeOnUpdate) {
		const filenames = diff.reduce(
			(acc, image) => [
				...acc,
				...glob(`${hash}/**/${leadingZeros(image.pageNumber, dbImages.length)}.*`, {
					cwd: config.directories.images,
					absolute: true,
				}),
			],
			[] as string[]
		);

		for (const filename of filenames) {
			await rm(filename).catch(() => {});
		}
	}

	if (images?.length) {
		const upsertedImages = await db
			.insertInto('archiveImages')
			.values(
				images.map(({ filename, pageNumber }) => ({
					filename,
					pageNumber,
					archiveId: id,
				}))
			)
			.onConflict((oc) =>
				oc.columns(['archiveId', 'pageNumber']).doUpdateSet((eb) => ({
					filename: eb.ref('excluded.filename'),
					width: eb.ref('excluded.width'),
					height: eb.ref('excluded.height'),
				}))
			)
			.returning(['filename', 'pageNumber', 'width', 'height'])
			.execute();

		dbImages.push(...upsertedImages);
	}

	const toDelete = dbImages.filter(
		(image) => !images?.some((i) => i.pageNumber === image.pageNumber)
	);

	if (toDelete.length) {
		await db
			.deleteFrom('archiveImages')
			.where('archiveId', '=', id)
			.where(
				'pageNumber',
				'in',
				toDelete.map((image) => image.pageNumber)
			)
			.execute();
	}
};

/**
 * Upserts tags
 * @param id Archive ID
 * @param archive new archive data
 */
export const upsertTags = async (id: number, metadataTags: Tag[]) => {
	metadataTags = metadataTags.map(({ namespace, name }) => ({
		namespace: namespace.length ? namespace.toLowerCase() : 'tag',
		name,
	}));

	metadataTags = metadataTags.map((tag) => {
		const mapping = config.metadata.tagMapping.findLast(({ ignoreCase, match, matchNamespace }) => {
			const normalizedTagName = ignoreCase ? tag.name.toLowerCase() : tag.name;
			const normalizedMatches = ignoreCase ? match.map((t) => t.toLowerCase()) : match;

			if (matchNamespace && matchNamespace !== tag.namespace) {
				return;
			}

			return normalizedMatches.includes(normalizedTagName);
		});

		return {
			namespace: mapping?.namespace?.length
				? mapping.namespace.toLowerCase()
				: tag.namespace.toLowerCase(),
			name: mapping?.name ?? tag.name,
		};
	});

	const tags = metadataTags.length
		? await db
				.selectFrom('tags')
				.select(['id', 'namespace', 'name'])
				.where(
					sql`namespace || ':' || name`,
					'in',
					metadataTags.map(({ namespace, name }) => `${namespace}:${name}`)
				)
				.execute()
		: [];

	const tagsInsert = metadataTags.filter(
		(tag) => !tags.some((_tag) => _tag.namespace === tag.namespace && _tag.name === tag.name)
	);

	if (tagsInsert.length) {
		const inserted = await db
			.insertInto('tags')
			.values(tagsInsert)
			.returning(['id', 'namespace', 'name'])
			.onConflict((oc) =>
				oc.columns(['namespace', 'name']).doUpdateSet((eb) => ({
					name: eb.ref('excluded.name'),
					namespace: eb.ref('excluded.namespace'),
				}))
			)
			.execute();

		tags.push(...inserted);
	}

	const archiveTags = await db
		.selectFrom('archiveTags')
		.innerJoin('tags', 'tags.id', 'tagId')
		.select(['tagId', 'namespace', 'name'])
		.where('archiveId', '=', id)
		.execute();

	const relationDelete = archiveTags.filter(
		(relation) =>
			!metadataTags.some(
				(tag) => tag.name === relation.name && tag.namespace === relation.namespace
			)
	);

	for (const relation of relationDelete) {
		await db
			.deleteFrom('archiveTags')
			.where('archiveId', '=', id)
			.where('tagId', '=', relation.tagId)
			.execute();
	}

	const relationInsert = metadataTags.filter(
		(tag) =>
			!archiveTags.some(
				(relation) => relation.name === tag.name && relation.namespace === tag.namespace
			)
	);

	const relationIdsInsert = relationInsert.map((tag) => ({
		tagId: tags.find((_tag) => _tag.namespace === tag.namespace && _tag.name === tag.name)!.id,
	}));

	if (relationIdsInsert.length) {
		await db
			.insertInto('archiveTags')
			.values(
				relationIdsInsert.map(({ tagId }) => ({
					archiveId: id,
					tagId,
				}))
			)
			.execute();
	}
};

export const upsertSeries = async (id: number, seriesList: Series[]) => {
	const existingSeries = seriesList.length
		? await db
				.selectFrom('series')
				.select(['id', 'title'])
				.where(
					'title',
					'in',
					seriesList.map((series) => series.title)
				)
				.execute()
		: [];

	const seriesInsert = seriesList.filter(
		(series) => !existingSeries.some((_series) => _series.title === series.title)
	);

	if (seriesInsert.length) {
		const inserted = await db
			.insertInto('series')
			.values(seriesInsert.map((series) => ({ title: series.title })))
			.returning(['id', 'title'])
			.execute();

		existingSeries.push(...inserted);
	}

	const seriesArchive = await db
		.selectFrom('seriesArchive')
		.innerJoin('series', 'series.id', 'seriesArchive.seriesId')
		.select(['seriesId', 'series.title'])
		.where('archiveId', '=', id)
		.execute();

	const relationDelete = seriesArchive.filter(
		(relation) => !seriesList.some((series) => series.title === relation.title)
	);

	for (const relation of relationDelete) {
		await db
			.deleteFrom('seriesArchive')
			.where('archiveId', '=', id)
			.where('seriesId', '=', relation.seriesId)
			.execute();
	}

	const relationInsert = seriesList.filter(
		(series) => !seriesArchive.some((relation) => relation.title === series.title)
	);

	const relationIdsInsert = relationInsert.map((series) => ({
		seriesId: existingSeries.find((_series) => _series.title === series.title)!.id,
		order: seriesList.find((_series) => _series.title === series.title)!.order,
	}));

	if (relationIdsInsert.length) {
		await db
			.insertInto('seriesArchive')
			.values(
				relationIdsInsert.map(({ seriesId, order }) => ({
					seriesId,
					archiveId: id,
					order,
				}))
			)
			.execute();
	}
};
