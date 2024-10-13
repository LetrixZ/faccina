import { Glob, sleep } from 'bun';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { filetypemime } from 'magic-bytes.js';
import naturalCompare from 'natural-compare-lite';
import { createReadStream } from 'node:fs';
import { exists, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import StreamZip from 'node-stream-zip';
import { parse } from 'path';
import slugify from 'slugify';

import type { Archive, Image } from '../shared/metadata';

import { upsertImages, upsertSources, upsertTags, upsertTaxonomy } from '../shared/archive';
import config from '../shared/config';
import db from '../shared/db';
import { taxonomyTables } from '../shared/taxonomy';
import { readStream } from '../shared/utils';
import {
	addEmbeddedMetadata,
	addExternalMetadata,
	MetadataFormat,
	MetadataSchema,
} from './metadata';
import { parseFilename } from './metadata/utils';

slugify.extend({ '.': '-', _: '-', '+': '-' });

interface IndexOptions {
	paths?: string[];
	recursive?: boolean;
	fromPath?: string;
	force?: boolean;
	reindex?: boolean;
	verbose?: boolean;
}

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
			linewrap: true,
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
				multibar.log(chalk.yellow(`${chalk.bold(path)} is not indexed, skipping\n`));
			}

			progress.increment();
			count++;
			skipped++;

			continue;
		}

		// If --force wasn't used, skip already indexed archives
		if (!opts.force && existing) {
			if (opts.verbose) {
				multibar.log(chalk.yellow(`${chalk.bold(path)} is already indexed, skipping\n`));
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
						`Found external ${metadataFormat} metadata with schema ${chalk.bold(metadataSchema)}\n`
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
							`Found embedded ${chalk.bold(metadataFormat)} metadata with schema ${chalk.bold(metadataSchema)}\n`
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

						if (title) {
							archive.title = title ?? filename;
							archive.slug = slugify(archive.title, { lower: true, strict: true });
							archive.artists = artists;
							archive.circles = circles;
						}
					} else {
						archive.title = filename;
						archive.slug = slugify(archive.title, { lower: true, strict: true });
					}
				}
			}

			let images: Image[] = Object.keys(await zip.entries())
				.filter((key) => key.match(/.(jpeg|jpg|png|webp|avif|jxl|bmp)$/i))
				.sort(naturalCompare)
				.map((filename, i) => ({
					filename,
					page_number: i + 1,
				}));

			if (images.length === 0) {
				multibar.log(chalk.yellow(`No images found for ${chalk.bold(path)}, skpping\n`));
				progress.increment();
				count++;
				skipped++;

				continue;
			}

			images = images
				.toSorted((a, b) => {
					const indexA = archive.images?.findIndex((image) => image.filename === a.filename) ?? -1;
					const indexB = archive.images?.findIndex((image) => image.filename === b.filename) ?? -1;

					return indexA - indexB;
				})
				.map((image, i) => ({ filename: image.filename, page_number: i + 1 }));

			if (!archive.title || !archive.slug) {
				archive.title = filename;
				archive.slug = slugify(archive.title, { lower: true, strict: true });
			}

			const info = await stat(path);

			const existingPath = await db
				.selectFrom('archives')
				.select(['id', 'hash', 'protected'])
				.where('path', '=', path)
				.executeTakeFirst();

			let id: number;
			const isProtected = existingPath?.protected;

			if (existingPath) {
				if (isProtected) {
					const update = await db
						.updateTable('archives')
						.set({ hash, pages: images.length, size: info.size })
						.where('id', '=', existingPath.id)
						.returning(['id', 'protected'])
						.executeTakeFirstOrThrow();

					id = update.id;
				} else {
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
							pages: images.length,
							size: info.size,
							has_metadata: archive.has_metadata,
						})
						.where('id', '=', existingPath.id)
						.returning(['id', 'protected'])
						.executeTakeFirstOrThrow();

					id = update.id;
				}

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
						pages: images.length,
						size: info.size,
						has_metadata: archive.has_metadata,
					})
					.returning('id')
					.executeTakeFirstOrThrow();

				id = insert.id;
			}

			if (!isProtected) {
				for (const { relationId, relationTable, referenceTable } of taxonomyTables) {
					if (
						referenceTable === 'tags' ||
						relationTable === 'archive_tags' ||
						relationId === 'tag_id'
					) {
						if (archive.tags) {
							await upsertTags(id, archive.tags);
						}
					} else {
						if (archive[referenceTable]) {
							await upsertTaxonomy(
								id,
								archive[referenceTable],
								referenceTable,
								relationTable,
								relationId
							);
						}
					}
				}
			}

			await upsertImages(id, images, hash);

			if (!isProtected && archive.sources) {
				await upsertSources(id, archive.sources);
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
