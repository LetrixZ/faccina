import { Glob } from 'bun';
import { sql } from 'kysely';
import { rm } from 'node:fs/promises';
import slugify from 'slugify';

import type { Image, Source } from './metadata';

import db from '../shared/db';
import {
	type ReferenceTable,
	type RelationshipId,
	type RelationshipTable,
} from '../shared/taxonomy';
import config from './config';
import { leadingZeros } from './utils';

const tagAliases = [
	['fff-threesome', 'FFF Threesome'],
	['ffm-threesome', 'FFM Threesome'],
	['fft-threesome', 'FFT Threesome'],
	['mmf-threesome', 'MMF Threesome'],
	['mmm-threesome', 'MMM Threesome'],
	['mmt-threesome', 'MMT Threesome'],
	['fffm-foursome', 'FFFM Foursome'],
	['mmmf-foursome', 'MMMF Foursome'],
	['cg-set', 'CG Set'],
	['bss', 'BSS'],
	['bl', 'BL'],
	['bdsm', 'BDSM'],
	['ntr', 'NTR'],
	['romance-centric', 'Romance-centric'],
	['slice-of-life', 'Slice of Life'],
	['comics-r18', 'Comics R18'],
	['sci-fi', 'Sci-Fi'],
	['x-ray', 'X-ray'],
	['sixty-nine', 'Sixty-Nine'],
	['milf', 'MILF'],
	['dilf', 'DILF'],
];

/**
 * Upserts archive sources
 * @param id Archive ID
 * @param archive new archive data
 */
export const upsertSources = async (id: number, sources: Source[]) => {
	const dbSources = await db
		.selectFrom('archive_sources')
		.select(['name', 'url'])
		.where('archive_id', '=', id)
		.execute();

	if (sources?.length) {
		const upsertedSources = await db
			.insertInto('archive_sources')
			.values(
				sources.map(({ name, url }) => ({
					name,
					url,
					archive_id: id,
				}))
			)
			.onConflict((oc) =>
				oc.columns(['archive_id', 'url']).doUpdateSet((eb) => ({
					name: eb.ref('excluded.name'),
				}))
			)
			.returning(['name', 'url'])
			.execute();

		dbSources.push(...upsertedSources);
	}

	const toDelete = dbSources.filter((source) => !sources?.some((s) => s.url === source.url));

	if (toDelete.length) {
		await db
			.deleteFrom('archive_sources')
			.where('archive_id', '=', id)
			.where(
				'url',
				'in',
				toDelete.map((source) => source.url)
			)
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
		.selectFrom('archive_images')
		.select(['filename', 'page_number', 'width', 'height'])
		.where('archive_id', '=', id)
		.execute();

	const diff: Image[] = [];

	for (const image of dbImages) {
		const newImage = images.find((im) => im.page_number === image.page_number);

		if (newImage && newImage.filename !== image.filename) {
			diff.push({
				filename: image.filename,
				page_number: image.page_number,
			});
		}
	}

	if (config.image.removeOnUpdate) {
		const filenames = diff.reduce(
			(acc, image) => [
				...acc,
				...Array.from(
					new Glob(`${hash}/**/${leadingZeros(image.page_number, dbImages.length)}.*`).scanSync({
						cwd: config.directories.images,
						absolute: true,
					})
				),
			],
			[] as string[]
		);

		for (const filename of filenames) {
			await rm(filename).catch(() => {});
		}
	}

	if (images?.length) {
		const upsertedImages = await db
			.insertInto('archive_images')
			.values(
				images.map(({ filename, page_number, width, height }) => ({
					filename,
					page_number,
					width,
					height,
					archive_id: id,
				}))
			)
			.onConflict((oc) =>
				oc.columns(['archive_id', 'page_number']).doUpdateSet((eb) => ({
					filename: eb.ref('excluded.filename'),
					width: eb.ref('excluded.width'),
					height: eb.ref('excluded.height'),
				}))
			)
			.returning(['filename', 'page_number', 'width', 'height'])
			.execute();

		dbImages.push(...upsertedImages);
	}

	const toDelete = dbImages.filter(
		(image) => !images?.some((i) => i.page_number === image.page_number)
	);

	if (toDelete.length) {
		await db
			.deleteFrom('archive_images')
			.where('archive_id', '=', id)
			.where(
				'page_number',
				'in',
				toDelete.map((image) => image.page_number)
			)
			.execute();
	}
};

/**
 * Upserts tags
 * @param id Archive ID
 * @param archive new archive data
 */
export const upsertTags = async (id: number, tags: [string, string][]) => {
	const metadataTags = Array.from(
		new Map(
			tags.map(([name, namespace]) => [
				`${namespace}:${slugify(name, { lower: true, strict: true })}`,
				{ slug: slugify(name, { lower: true, strict: true }), name, namespace },
			]) || []
		).values()
	);

	const dbTags = metadataTags.length
		? await db
				.selectFrom('tags')
				.select(['id', 'slug'])
				.where(
					'slug',
					'in',
					metadataTags.map((tag) => tag.slug)
				)
				.execute()
		: [];

	const newTags = metadataTags.filter((tag) => dbTags.every((t) => t.slug !== tag.slug));

	if (newTags.length) {
		const inserted = await db
			.insertInto('tags')
			.values(
				newTags.map((tag) => {
					const alias = tagAliases.find((a) => a[0] === tag.slug);

					if (alias) {
						return {
							slug: alias[0],
							name: alias[1],
						};
					}

					return {
						slug: tag.slug,
						name: tag.name,
					};
				})
			)
			.returning(['id', 'slug'])
			.onConflict((oc) =>
				oc.column('name').doUpdateSet((eb) => ({
					slug: eb.ref('excluded.slug'),
				}))
			)
			.execute();

		dbTags.push(...inserted);
	}

	const { rows } = await sql<{
		id: number;
		slug: string;
		namespace: string;
	}>`SELECT tag_id id, slug, namespace FROM archive_tags INNER JOIN tags ON id = tag_id WHERE archive_id = ${id}`.execute(
		db
	);

	const toDelete = rows.filter(
		(relation) =>
			!metadataTags.some(
				(tag) => tag.slug === relation.slug && tag.namespace === relation.namespace
			)
	);

	for (const relation of toDelete) {
		await db
			.deleteFrom('archive_tags')
			.where('archive_id', '=', id)
			.where('tag_id', '=', relation.id)
			.where('namespace', '=', relation.namespace)
			.execute();
	}

	const toInsert = metadataTags.filter(
		(tag) =>
			!rows.some((relation) => relation.slug === tag.slug && relation.namespace === tag.namespace)
	);

	const ids = toInsert.map((tag) => ({
		id: dbTags.find((t) => t.slug === tag.slug)!.id,
		namespace: tag.namespace,
	}));

	if (ids?.length) {
		await db
			.insertInto('archive_tags')
			.values(
				ids.map(({ id: tagId, namespace }) => ({
					archive_id: id,
					tag_id: tagId,
					namespace,
				}))
			)
			.execute();
	}
};

/**
 * Upserts taxonomy
 * @param id Archive ID
 * @param archive new archive data
 * @param tableName taxonomy table to upsert
 * @param relationName name of the related table
 * @param relationId name of the column ID in the related table
 */
export const upsertTaxonomy = async (
	id: number,
	tags: string[],
	tableName: Exclude<ReferenceTable, 'tags'>,
	relationName: Exclude<RelationshipTable, 'archive_tags'>,
	relationId: Exclude<RelationshipId, 'tag_id'>
) => {
	const metadataTags = Array.from(
		new Map(
			tags?.map((name) => [
				slugify(name, { lower: true, strict: true }),
				{ slug: slugify(name, { lower: true, strict: true }), name },
			]) || []
		).values()
	);

	const dbTags = metadataTags.length
		? await db
				.selectFrom(tableName)
				.select(['id', 'slug'])
				.where(
					'slug',
					'in',
					metadataTags.map((tag) => tag.slug)
				)
				.execute()
		: [];

	const newTags = metadataTags.filter((tag) => dbTags.every((t) => t.slug !== tag.slug));

	if (newTags.length) {
		const inserted = await db
			.insertInto(tableName)
			.values(newTags)
			.returning(['id', 'slug'])
			.onConflict((oc) =>
				oc.column('name').doUpdateSet((eb) => ({
					slug: eb.ref('excluded.slug'),
				}))
			)
			.execute();

		dbTags.push(...inserted);
	}

	const { rows } = await sql<{
		id: number;
		slug: string;
	}>`SELECT ${sql.ref(relationId)} id, slug FROM ${sql.table(relationName)} INNER JOIN ${sql.table(tableName)} ON id = ${sql.ref(relationId)} WHERE archive_id = ${id}`.execute(
		db
	);

	const toDelete = rows.filter(
		(relation) => !metadataTags.some((tag) => tag.slug === relation.slug)
	);

	if (toDelete.length) {
		await db
			.deleteFrom(relationName)
			.where('archive_id', '=', id)
			.where(
				relationId,
				'in',
				toDelete.map((relation) => relation.id)
			)
			.execute();
	}

	const toInsert = metadataTags.filter(
		(tag) => !rows.some((relation) => relation.slug === tag.slug)
	);

	const ids = toInsert.map((tag) => dbTags.find((t) => t.slug === tag.slug)!.id);

	if (ids?.length) {
		await db
			.insertInto(relationName)
			.values(
				ids.map((tagId) => ({
					archive_id: id,
					[relationId]: tagId,
				}))
			)
			.execute();
	}
};
