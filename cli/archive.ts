import { Glob, sleep } from 'bun';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { generateImagesBatch } from 'image-encoder';
import { sql } from 'kysely';
import { filetypemime } from 'magic-bytes.js';
import naturalCompare from 'natural-compare-lite';
import { createReadStream } from 'node:fs';
import { exists, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import StreamZip from 'node-stream-zip';
import { parse } from 'path';
import slugify from 'slugify';

import type { Archive } from '../shared/metadata';

import { upsertImages, upsertSources } from '../shared/archive';
import config, { Preset } from '../shared/config';
import db from '../shared/db';
import { jsonArrayFrom } from '../shared/db/helpers';
import {
	type ReferenceTable,
	type RelationshipId,
	type RelationshipTable,
	taxonomyTables,
} from '../shared/taxonomy';
import { leadingZeros, readStream } from '../shared/utils';
import {
	addEmbeddedMetadata,
	addExternalMetadata,
	MetadataFormat,
	MetadataSchema,
} from './metadata';
import { parseFilename } from './metadata/utils';

slugify.extend({ '.': '-', _: '-', '+': '-' });

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

interface IndexOptions {
	paths?: string[];
	recursive?: boolean;
	fromPath?: string;
	force?: boolean;
	reindex?: boolean;
	verbose?: boolean;
}

/**
 * Upserts tags
 * @param id Archive ID
 * @param archive new archive data
 */
const upsertTags = async (id: number, archive: Archive) => {
	const metadataTags = Array.from(
		new Map(
			archive.tags?.map(([name, namespace]) => [
				slugify(name, { lower: true, strict: true }),
				{ slug: slugify(name, { lower: true, strict: true }), name, namespace },
			]) || []
		).values()
	);

	const tags = metadataTags.length
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

	const newTags = metadataTags.filter((tag) => tags.every((t) => t.slug !== tag.slug));

	const dbTags = tags;

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
const upsertTaxonomy = async (
	id: number,
	archive: Archive,
	tableName: Exclude<ReferenceTable, 'tags'>,
	relationName: Exclude<RelationshipTable, 'archive_tags'>,
	relationId: Exclude<RelationshipId, 'tag_id'>
) => {
	const metadataTags = Array.from(
		new Map(
			archive[tableName]?.map((name) => [
				slugify(name, { lower: true, strict: true }),
				{ slug: slugify(name, { lower: true, strict: true }), name },
			]) || []
		).values()
	);

	const tags = metadataTags.length
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

	const newTags = metadataTags.filter((tag) => tags.every((t) => t.slug !== tag.slug));

	const dbTags = tags;

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

/**
 * Index archives to the database
 * @param opts Indexing options
 */
export const index = async (opts: IndexOptions) => {
	const hasPaths = opts.paths ? opts.paths?.length > 0 : false;

	if (!opts.paths || !hasPaths) {
		if (opts.recursive === undefined) {
			opts.recursive = true; // Default to true if no path given
		}

		const dir = await stat(config.directories.content).catch(() => null);

		if (!dir || !dir.isDirectory()) {
			throw new Error(
				`Content directory located at '${config.directories.content}' does not exist or is not a directory.`
			);
		}

		opts.paths = [config.directories.content];
	}

	let indexPaths: string[] = [];

	for (const path of opts.paths) {
		const info = await stat(path).catch(() => null);

		if (info?.isDirectory()) {
			const glob = new Glob(opts.recursive ? '**/*.{cbz,zip}' : '*.{cbz,zip}');
			indexPaths.push(
				...(await Array.fromAsync(
					glob.scan({ cwd: path, absolute: true, followSymlinks: true, onlyFiles: true })
				))
			);
		} else if (info?.isFile()) {
			indexPaths.push(path);
		} else {
			console.error(
				chalk.bold(`Path ${chalk.bold(path)} does not exist or is not a directory or file.`)
			);
		}
	}

	if (opts.fromPath && !hasPaths) {
		let shouldAdd = false;
		const paths: string[] = [];

		for (const path of indexPaths) {
			if (path === opts.fromPath) {
				shouldAdd = true;
			}

			if (shouldAdd) {
				paths.push(path);
			}
		}

		indexPaths = paths;
	}

	console.info(`Found ${chalk.bold(indexPaths.length)} files to index\n`);

	const multibar = new cliProgress.MultiBar(
		{
			clearOnComplete: true,
			format: ` {bar} - {path} - {value}/{total}`,
		},
		cliProgress.Presets.shades_grey
	);

	const progress = multibar.create(indexPaths.length, 0);
	let count = 0;
	let indexed = 0;
	let skipped = 0;

	const start = performance.now();

	for (const path of indexPaths) {
		progress.update(count, { path });

		const existing = await db
			.selectFrom('archives')
			.select('id')
			.where('path', '=', path)
			.executeTakeFirst();

		// If using --reindex, then skip non indexed archives
		if (opts.reindex && !existing) {
			if (opts.verbose) {
				multibar.log(
					chalk.yellow(`${chalk.bold(path)} doesn't exists in the database, skipping\n`)
				);
			}

			progress.increment();
			count++;
			skipped++;

			continue;
		}

		// If --force wasn't used, skip already indexed archives
		if (!opts.force && existing) {
			if (opts.verbose) {
				multibar.log(
					chalk.yellow(`${chalk.bold(path)} already exists in the database, skipping\n`)
				);
			}

			progress.increment();
			count++;
			skipped++;

			continue;
		}

		const buffer = await readStream(createReadStream(path, { start: 0, end: 8192 }));

		const filetype = filetypemime(buffer)[0];

		if (filetype !== 'application/zip') {
			multibar.log(chalk.yellow(`${chalk.bold(path)} is not a zip file, skipping\n`));
			progress.increment();
			count++;
			skipped++;

			continue;
		}

		const hasher = new Bun.CryptoHasher('sha256');
		hasher.update(buffer);

		const hash = hasher.digest('hex').substring(0, 16);

		const existingHash = await db
			.selectFrom('archives')
			.select(['id', 'path'])
			.where('hash', '=', hash)
			.executeTakeFirst();

		if (existingHash && existingHash.path !== path) {
			if (await Bun.file(existingHash.path).exists()) {
				multibar.log(
					chalk.yellow.bold(
						`${chalk.magenta(`[ID: ${existingHash.id}]`)} ${chalk.bold(existingHash.path)} and ${existing ? chalk.magenta(`[ID: ${existing.id}] `) : ''}${chalk.bold(path)} have the same hash, skipping\n`
					)
				);
				progress.increment();
				count++;
				skipped++;

				continue;
			} else {
				await db.updateTable('archives').set({ path }).where('id', '=', existingHash.id).execute();
			}
		}

		let archive: Archive = {};
		let metadataSchema: MetadataSchema;
		let metadataFormat: MetadataFormat;

		const filename = parse(path).name;

		try {
			const zip = new StreamZip.async({ file: path });

			try {
				[archive, [metadataSchema, metadataFormat]] = await addExternalMetadata(path, archive);

				if (opts.verbose) {
					multibar.log(
						`Found embedded ${metadataFormat} metadata with schema ${chalk.bold(metadataSchema)}\n`
					);
				}
			} catch (error) {
				if (opts.verbose) {
					multibar.log(
						chalk.yellow(
							`Failed to add external metadata for ${chalk.bold(path)} - ${chalk.bold((error as Error).message)}\n`
						)
					);
				}

				try {
					[archive, [metadataSchema, metadataFormat]] = await addEmbeddedMetadata(zip, archive);

					if (opts.verbose) {
						multibar.log(
							`Found external ${chalk.bold(metadataFormat)} metadata with schema ${chalk.bold(metadataSchema)}\n`
						);
					}
				} catch (error) {
					if (opts.verbose) {
						multibar.log(
							chalk.yellow(
								`Failed to add embedded metadata for ${chalk.bold(path)} - ${(error as Error).message}\n`
							)
						);
					}

					if (config.metadata?.parseFilenameAsTitle) {
						const [title, artists, circles] = parseFilename(filename);

						archive.title = title ?? filename;
						archive.slug = slugify(archive.title, { lower: true, strict: true });
						archive.artists = artists;
						archive.circles = circles;
					} else {
						archive.title = filename;
						archive.slug = slugify(archive.title, { lower: true, strict: true });
					}
				}
			}

			if (!archive.images) {
				const filenames = Object.keys(await zip.entries())
					.filter((key) => key.match(/.(jpeg|jpg|png|webp|avif|jxl|bmp)$/i))
					.sort(naturalCompare);

				if (filenames.length) {
					archive.images = filenames.map((filename, i) => ({
						filename,
						page_number: i + 1,
					}));
				}
			}

			if (!archive.title || !archive.slug) {
				archive.title = filename;
				archive.slug = slugify(archive.title, { lower: true, strict: true });
			}

			if (!archive.images || !archive.images.length) {
				multibar.log(chalk.yellow(`No images found for ${chalk.bold(path)}, skipping\n`));
				progress.increment();
				count++;
				skipped++;

				continue;
			}

			const info = await stat(path);

			const existingPath = await db
				.selectFrom('archives')
				.select(['id', 'hash'])
				.where('path', '=', path)
				.executeTakeFirst();

			let id: number;

			if (existingPath) {
				const update = await db
					.updateTable('archives')
					.set({
						title: archive.title,
						slug: archive.slug,
						hash,
						description: archive.description,
						language: archive.language,
						released_at: archive.released_at?.toISOString(),
						thumbnail: archive.thumbnail,
						pages: archive.images.length,
						size: info.size,
						has_metadata: archive.has_metadata,
					})
					.where('id', '=', existingPath.id)
					.returning('id')
					.executeTakeFirstOrThrow();

				id = update.id;

				const moveImages = async () => {
					const sourcePath = join(config.directories.images, existingPath.hash);
					const destinationPath = join(config.directories.images, hash);

					if (!(await exists(sourcePath))) {
						if (opts.verbose) {
							multibar.log(
								chalk.yellow(`The source path ${chalk.bold(sourcePath)} does not exists`)
							);
						}

						return;
					}

					if (opts.verbose) {
						multibar.log(
							chalk.bgBlue(
								`Moving thumbnails from ${chalk.bold(sourcePath)} to ${chalk.bold(destinationPath)}\n`
							)
						);
					}

					try {
						await rename(sourcePath, destinationPath);
					} catch (error) {
						multibar.log(
							chalk.red(
								`Failed to move thumbnails from ${chalk.bold(sourcePath)} to ${chalk.bold(destinationPath)} - ${(error as Error).message}\n`
							)
						);
					}
				};

				if (hash !== existingPath.hash) {
					await moveImages();
				}
			} else {
				const insert = await db
					.insertInto('archives')
					.values({
						title: archive.title,
						slug: archive.slug,
						path,
						hash,
						description: archive.description,
						language: archive.language,
						released_at: archive.released_at?.toISOString(),
						thumbnail: archive.thumbnail,
						pages: archive.images.length,
						size: info.size,
						has_metadata: archive.has_metadata,
					})
					.returning('id')
					.executeTakeFirstOrThrow();

				id = insert.id;
			}

			for (const { relationId, relationTable, referenceTable } of taxonomyTables) {
				if (
					referenceTable === 'tags' ||
					relationTable === 'archive_tags' ||
					relationId === 'tag_id'
				) {
					await upsertTags(id, archive);
				} else {
					await upsertTaxonomy(id, archive, referenceTable, relationTable, relationId);
				}
			}

			if (archive.sources) {
				await upsertSources(id, archive.sources);
			}

			if (archive.images) {
				await upsertImages(id, archive.images);
			}

			indexed++;
		} catch (error) {
			multibar.log(
				chalk.redBright(`Failed to index ${chalk.bold(path)} - ${(error as Error).message}\n`)
			);
		} finally {
			progress.increment();
			count++;
		}
	}

	const end = performance.now();

	await db.destroy();
	await sleep(250);

	multibar.stop();

	console.info(chalk.bold(`~~~ Finished in ${((end - start) / 1000).toFixed(2)} seconds ~~~`));
	console.info(`Indexed ${chalk.bold(indexed)} and skipped ${chalk.bold(skipped)} archives\n`);
};

/**
 * Checks if an archive exists and removes if it wasn't found
 */
export const prune = async () => {
	const archives = await db.selectFrom('archives').select(['id', 'path']).execute();

	const toDelete: number[] = [];

	for (const archive of archives) {
		if (await Bun.file(archive.path).exists()) {
			continue;
		}

		toDelete.push(archive.id);
	}

	if (toDelete.length) {
		await db.deleteFrom('archives').where('id', 'in', toDelete).execute();
		console.info(`Deleted ${chalk.bold(toDelete.length)} archives`);
	} else {
		console.info(`No archives were deleted`);
	}

	await db.destroy();
};

type GenerateImagesOptions = {
	ids?: string[];
	force: boolean;
	batchSize: number;
};

type ArchiveGenerate = {
	id: number;
	path: string;
	hash: string;
	thumbnail: number;
	pages: number;
	images: { filename: string; page_number: number }[];
};

type ImageGenerate = {
	filename: string;
	savePath: string;
	options: Preset;
};

export const generateImages = async (options: GenerateImagesOptions) => {
	const ids = options.ids?.map((id) => parseInt(id)).filter((id) => !isNaN(id)) ?? [];

	let archives: ArchiveGenerate[] = await (() => {
		if (ids.length) {
			return db
				.selectFrom('archives')
				.select((eb) => [
					'id',
					'path',
					'hash',
					'thumbnail',
					'pages',
					jsonArrayFrom(
						eb
							.selectFrom('archive_images')
							.select(['filename', 'page_number'])
							.whereRef('archive_id', '=', 'archives.id')
					).as('images'),
				])
				.where('id', 'in', ids)
				.orderBy('pages asc')
				.execute();
		} else {
			return db
				.selectFrom('archives')
				.select((eb) => [
					'id',
					'path',
					'hash',
					'thumbnail',
					'pages',
					jsonArrayFrom(
						eb
							.selectFrom('archive_images')
							.select(['filename', 'page_number'])
							.whereRef('archive_id', '=', 'archives.id')
					).as('images'),
				])
				.orderBy('pages asc')
				.execute();
		}
	})();

	let skipped = 0;

	for (const [index, archive] of archives.entries()) {
		const missingImages: { filename: string; page_number: number }[] = [];

		for (const image of archive.images) {
			if (image.page_number === archive.thumbnail) {
				const preset = config.image.coverPreset;

				const imagePath = join(
					config.directories.images,
					archive.hash,
					preset.name,
					`${leadingZeros(image.page_number, archive.pages ?? 1)}.${preset.format}`
				);

				const exists = await Bun.file(imagePath).exists();

				if (!exists || options.force) {
					missingImages.push(image);
				} else {
					skipped++;
				}
			}

			const preset = config.image.thumbnailPreset;

			const imagePath = join(
				config.directories.images,
				archive.hash,
				preset.name,
				`${leadingZeros(image.page_number, archive.pages ?? 1)}.${preset.format}`
			);

			const exists = await Bun.file(imagePath).exists();

			if (!exists || options.force) {
				missingImages.push(image);
			} else {
				skipped++;
			}
		}

		archives[index].images = missingImages;
	}

	archives = archives.filter((archive) => archive.images.length);

	const batches: ArchiveGenerate[][] = [];

	for (const archive of archives) {
		const lastBatchIndex = batches.findLastIndex(
			(batch) =>
				batch.reduce((acc, archive) => acc + archive.pages, 0) <=
				(options.batchSize ?? navigator.hardwareConcurrency * 4)
		);

		if (lastBatchIndex >= 0) {
			const lastBatch = batches[lastBatchIndex]!;

			if (
				lastBatch.reduce((acc, archive) => acc + archive.pages, 0) + archive.pages <=
				(options.batchSize ?? navigator.hardwareConcurrency * 4)
			) {
				batches[lastBatchIndex].push(archive);

				continue;
			}
		}

		batches.push([archive]);
	}

	console.info(
		`Generating images for ${chalk.bold(archives.length)} archives in ${batches.length} batches\n`
	);

	let generated = 0;

	const start = performance.now();

	for (const batch of batches) {
		const missingImagesBatches: {
			path: string;
			images: ImageGenerate[];
		}[] = [];

		for (const archive of batch) {
			const missingImages: ImageGenerate[] = [];

			const images = await db
				.selectFrom('archive_images')
				.select(['filename', 'page_number'])
				.where('archive_id', '=', archive.id)
				.execute();

			for (const image of images) {
				if (image.page_number === archive.thumbnail) {
					const preset = config.image.coverPreset;

					const imagePath = join(
						config.directories.images,
						archive.hash,
						preset.name,
						`${leadingZeros(image.page_number, archive.pages ?? 1)}.${preset.format}`
					);

					missingImages.push({ filename: image.filename, savePath: imagePath, options: preset });
				}

				const preset = config.image.thumbnailPreset;

				const imagePath = join(
					config.directories.images,
					archive.hash,
					preset.name,
					`${leadingZeros(image.page_number, archive.pages ?? 1)}.${preset.format}`
				);

				missingImages.push({ filename: image.filename, savePath: imagePath, options: preset });
			}

			missingImagesBatches.push({
				path: archive.path,
				images: missingImages,
			});
		}

		const encodedImages = generateImagesBatch(missingImagesBatches);

		generated += encodedImages.length;

		for (const image of encodedImages) {
			await Bun.write(image.path, image.contents);
		}
	}

	const end = performance.now();

	await db.destroy();
	await sleep(250);

	console.info(chalk.bold(`~~~ Finished in ${((end - start) / 1000).toFixed(2)} seconds ~~~`));
	console.info(
		`Generated ${chalk.bold(generated)} images and skipped ${chalk.bold(skipped)} images\n`
	);
};
