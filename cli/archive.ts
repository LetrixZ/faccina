import { createReadStream } from 'node:fs';
import { rename, rm, stat } from 'node:fs/promises';
import { dirname, extname, join, parse } from 'node:path';
import { Glob, sleep } from 'bun';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { filetypemime } from 'magic-bytes.js';
import naturalCompare from 'natural-compare-lite';
import StreamZip from 'node-stream-zip';
import slugify from 'slugify';
import { upsertImages, upsertSeries, upsertSources, upsertTags } from '../shared/archive';
import config from '../shared/config';
import { now } from '../shared/db/helpers';
import type { ArchiveMetadata, Image } from '../shared/metadata';
import { exists } from '../shared/server.utils';
import { leadingZeros } from '../shared/utils';
import {
	addEmbeddedDirMetadata,
	addEmbeddedZipMetadata,
	addExternalMetadata,
	MetadataFormat,
	MetadataSchema,
} from './metadata';
import { parseFilename } from './metadata/utils';
import { directorySize, queryIdRanges } from './utilts';
import { readStream } from '$lib/server/utils';

slugify.extend({ '.': '-', _: '-', '+': '-' });

const imageGlob = new Glob('**/*.{jpeg,jpg,png,webp,avif,jxl}');

interface IndexOptions {
	paths?: string[];
	ids?: string;
	recursive?: boolean;
	fromPath?: string;
	force?: boolean;
	reindex?: boolean;
	unpack?: boolean;
	verbose?: boolean;
}

export type ArchiveScan = {
	type: 'archive';
	path: string;
};

export type MetadataScan = {
	type: 'metadata';
	path: string;
	metadata?: string;
};

export type IndexScan = ArchiveScan | MetadataScan;

/**
 * Index archives to the database
 * @param opts Indexing options
 */
export const indexArchives = async (opts: IndexOptions) => {
	let indexScans: IndexScan[] = [];

	const db = (await import('../shared/db')).default;

	if (opts.ids) {
		const archives = await queryIdRanges(db.selectFrom('archives'), opts.ids)
			.select('archives.path')
			.execute();

		for (const archive of archives) {
			const info = await stat(archive.path).catch(() => null);

			if (!info) {
				console.error(
					chalk.bold(
						`Archive path ${chalk.bold(archive.path)} does not exist or is not a directory or file.`
					)
				);
				continue;
			}

			if (info.isDirectory()) {
				indexScans = indexScans.concat({ type: 'metadata', path: archive.path });
			} else if (info.isFile()) {
				indexScans = indexScans.concat({ type: 'archive', path: archive.path });
			}
		}
	} else {
		// Path argument
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

			// Add content directory to scanning paths
			opts.paths = [config.directories.content];
		}

		for (const path of opts.paths) {
			const info = await stat(path).catch(() => null);

			if (!info) {
				console.error(
					chalk.bold(`Path ${chalk.bold(path)} does not exist or is not a directory or file.`)
				);
				continue;
			}

			if (info.isDirectory()) {
				const glob = new Glob(opts.recursive ? '**/*.{cbz,zip}' : '*.{cbz,zip}');
				const archiveMatches: ArchiveScan[] = Array.from(
					glob.scanSync({ cwd: path, absolute: true, followSymlinks: true, onlyFiles: true })
				).map((path) => ({ type: 'archive', path }));
				indexScans = indexScans.concat(archiveMatches);

				// Match metadata files
				const metadataGlob = new Glob(
					opts.recursive
						? '**/{info.{json,yml,yaml},ComicInfo.xml,booru.txt,.faccina}'
						: '*/{info.{json,yml,yaml},ComicInfo.xml,booru.txt,.faccina}'
				);
				const metadataMatches: MetadataScan[] = Array.from(
					metadataGlob.scanSync({
						cwd: path,
						absolute: true,
						followSymlinks: true,
						dot: true,
					})
				)
					.filter((path) => Array.from(imageGlob.scanSync({ cwd: dirname(path) })).length)
					.map((path) => ({ type: 'metadata', path: dirname(path), metadata: path }));
				indexScans = indexScans.concat(metadataMatches);

				const rootMetadataMatches = Array.from(
					new Glob(`{info.{json,yml,yaml},ComicInfo.xml,booru.txt,.faccina}`).scanSync({
						cwd: path,
						absolute: true,
						followSymlinks: true,
						dot: true,
					})
				);

				indexScans = indexScans.concat(
					rootMetadataMatches
						.filter((path) => Array.from(imageGlob.scanSync({ cwd: dirname(path) })).length)
						.map(
							(path) =>
								({ type: 'metadata', path: dirname(path), metadata: path }) satisfies MetadataScan
						)
				);
			} else if (info.isFile()) {
				indexScans = indexScans.concat({ type: 'archive', path });
			}
		}

		if (opts.fromPath && !hasPaths) {
			let shouldAdd = false;
			const paths: IndexScan[] = [];

			for (const scan of indexScans) {
				if (scan.path === opts.fromPath) {
					shouldAdd = true;
				}

				if (shouldAdd) {
					paths.push(scan);
				}
			}

			indexScans = paths;
		}
	}

	console.info(`Found ${chalk.bold(indexScans.length)} files to index\n`);

	const multibar = new cliProgress.MultiBar(
		{
			clearOnComplete: true,
			format: ` {bar} - {path} - {value}/{total}`,
			linewrap: true,
		},
		cliProgress.Presets.shades_grey
	);

	const progress = multibar.create(indexScans.length, 0);
	let count = 0;
	let indexed = 0;
	let skipped = 0;

	const start = performance.now();

	for (const scan of indexScans) {
		progress.update(count, { path: scan.path });

		const existing = await db
			.selectFrom('archives')
			.select('id')
			.where('path', '=', scan.path)
			.executeTakeFirst();

		// If using --reindex, then skip non indexed archives
		if (opts.reindex && !existing) {
			if (opts.verbose) {
				multibar.log(chalk.yellow(`${chalk.bold(scan.path)} is not indexed, skipping\n`));
			}

			progress.increment();
			count++;
			skipped++;

			continue;
		}

		// If --force wasn't used, skip already indexed archives
		if (!opts.force && existing) {
			if (opts.verbose) {
				multibar.log(chalk.yellow(`${chalk.bold(scan.path)} is already indexed, skipping\n`));
			}

			progress.increment();
			count++;
			skipped++;

			continue;
		}

		let hash: string;

		if (scan.type === 'archive') {
			const buffer = await readStream(createReadStream(scan.path, { start: 0, end: 8192 }));

			if (filetypemime(buffer)?.[0] !== 'application/zip') {
				multibar.log(chalk.yellow(`${chalk.bold(scan.path)} is not a zip file, skipping\n`));
				progress.increment();
				count++;
				skipped++;

				continue;
			}

			const hasher = new Bun.CryptoHasher('sha256');
			hasher.update(buffer);
			hash = hasher.digest('hex').substring(0, 16);
		} else {
			const images = Array.from(
				imageGlob.scanSync({ cwd: scan.path, absolute: true, followSymlinks: true })
			);
			const readEnd = images.length > 10 ? 1024 : 4096;
			const hasher = new Bun.CryptoHasher('sha256');

			for (const image of images) {
				const buffer = await readStream(createReadStream(image, { start: 0, end: readEnd }));
				hasher.update(buffer);
			}

			hash = hasher.digest('hex').substring(0, 16);
		}

		const existingHash = await db
			.selectFrom('archives')
			.select(['id', 'path'])
			.where('hash', '=', hash)
			.executeTakeFirst();

		if (existingHash && existingHash.path !== scan.path) {
			// Hash exists in the database but the database path and the index path are different
			if (await exists(existingHash.path)) {
				// Database path exists in the file system, skips
				if (opts.verbose) {
					multibar.log(
						chalk.yellow.bold(
							`${chalk.magenta(`[ID: ${existingHash.id}]`)} ${chalk.bold(existingHash.path)} and ${existing ? chalk.magenta(`[ID: ${existing.id}] `) : ''}${chalk.bold(scan.path)} have the same hash, skipping\n`
						)
					);
				}

				progress.increment();
				count++;
				skipped++;

				continue;
			} else {
				// Database path does NOT exists in the file system, update archive
				await db
					.updateTable('archives')
					.set({ path: scan.path, updatedAt: now() })
					.where('id', '=', existingHash.id)
					.execute();
			}
		}

		let archive: ArchiveMetadata = {};
		let metadataSchema: MetadataSchema;
		let metadataFormat: MetadataFormat;

		const filename = parse(scan.path).name;

		try {
			const externalResult = await addExternalMetadata(
				scan,
				archive,
				opts.verbose ? multibar : null
			).catch((error) => {
				if (opts.verbose) {
					multibar.log(
						chalk.yellow(
							`Failed to add external metadata for ${chalk.bold(scan.path)} - ${chalk.bold((error as Error).message)}\n`
						)
					);
				}

				return null;
			});

			if (externalResult) {
				[archive, [metadataSchema, metadataFormat]] = externalResult;

				if (opts.verbose) {
					multibar.log(
						`Found external ${metadataFormat} metadata with schema ${chalk.bold(metadataSchema)} for ${chalk.bold(scan.path)}\n`
					);
				}
			} else {
				if (scan.type === 'archive') {
					const zip = new StreamZip.async({ file: scan.path });

					const embeddedResult = await addEmbeddedZipMetadata(
						zip,
						archive,
						opts.verbose ? multibar : null
					).catch((error) => {
						if (opts.verbose) {
							multibar.log(
								chalk.yellow(
									`Failed to add embedded ZIP metadata for ${chalk.bold(scan.path)} - ${(error as Error).message}\n`
								)
							);
						}

						return null;
					});

					await zip.close();

					if (embeddedResult) {
						[archive, [metadataSchema, metadataFormat]] = embeddedResult;

						if (opts.verbose) {
							multibar.log(
								`Found embedded ${chalk.bold(metadataFormat)} ZIP metadata with schema ${chalk.bold(metadataSchema)} for ${chalk.bold(scan.path)}\n`
							);
						}
					}
				} else {
					const embeddedResult = await addEmbeddedDirMetadata(
						scan,
						archive,
						opts.verbose ? multibar : null
					).catch((error) => {
						if (opts.verbose) {
							multibar.log(
								chalk.yellow(
									`Failed to add embedded directory metadata for ${chalk.bold(scan.path)} - ${(error as Error).message}\n`
								)
							);
						}

						return null;
					});

					if (embeddedResult) {
						[archive, [metadataSchema, metadataFormat]] = embeddedResult;

						if (opts.verbose) {
							multibar.log(
								`Found embedded ${chalk.bold(metadataFormat)} directory metadata with schema ${chalk.bold(metadataSchema)} for ${chalk.bold(scan.path)}\n`
							);
						}
					}
				}
			}

			if (!archive.title) {
				if (config.metadata?.parseFilenameAsTitle) {
					const [title, artists, circles] = parseFilename(filename);

					if (title) {
						archive.title = title ?? filename;

						if (!archive.tags) {
							archive.tags = [];

							if (artists) {
								archive.tags.push(
									...artists.map((tag) => ({
										namespace: 'artist',
										name: tag,
									}))
								);
							}

							if (circles) {
								archive.tags.push(
									...circles.map((tag) => ({
										namespace: 'circle',
										name: tag,
									}))
								);
							}
						}
					}
				} else {
					archive.title = filename;
				}
			}

			let images: Image[];

			if (scan.type === 'archive') {
				const zip = new StreamZip.async({ file: scan.path });
				images = Object.keys(await zip.entries())
					.filter((key) => key.match(/.(jpeg|jpg|png|webp|avif|jxl)$/i))
					.sort(naturalCompare)
					.map((filename, i) => ({
						filename,
						pageNumber: i + 1,
					}));
				await zip.close();
			} else {
				images = Array.from(imageGlob.scanSync({ cwd: scan.path, followSymlinks: true }))
					.sort(naturalCompare)
					.map((path, i) => ({
						filename: path,
						pageNumber: i + 1,
					}));
			}

			if (images.length === 0) {
				if (opts.verbose) {
					multibar.log(chalk.yellow(`No images found for ${chalk.bold(scan.path)}, skpping\n`));
				}

				progress.increment();
				count++;
				skipped++;

				continue;
			}

			if (archive.imageOrder) {
				images = images
					.toSorted((a, b) => {
						const indexA = archive.imageOrder!.findIndex((image) => image.filename === a.filename);
						const indexB = archive.imageOrder!.findIndex((image) => image.filename === b.filename);
						return indexA - indexB;
					})
					.map((image, i) => ({ filename: image.filename, pageNumber: i + 1 }));
			}

			if (!archive.title) {
				archive.title = filename;
			}

			let size: number;

			if (scan.type === 'archive') {
				size = (await stat(scan.path)).size;
			} else {
				size = await directorySize(scan.path);
			}

			const existingPath = await db
				.selectFrom('archives')
				.select(['id', 'hash', 'protected'])
				.where('path', '=', scan.path)
				.executeTakeFirst();

			let id: number;
			const isProtected = existingPath?.protected;

			if (existingPath) {
				// Index path already exists in database
				if (isProtected) {
					// Archive is protected, so only basic info is updated
					const update = await db
						.updateTable('archives')
						.set({ hash, pages: images.length, size, updatedAt: now() })
						.where('id', '=', existingPath.id)
						.returning(['id', 'protected'])
						.executeTakeFirstOrThrow();

					id = update.id;
				} else {
					// Archive is NOT protected, so everything is updated
					const update = await db
						.updateTable('archives')
						.set({
							title: archive.title,
							hash,
							description: archive.description,
							language: archive.language,
							releasedAt: archive.releasedAt?.toISOString(),
							thumbnail: archive.thumbnail,
							pages: images.length,
							size,
							updatedAt: now(),
						})
						.where('id', '=', existingPath.id)
						.returning(['id', 'protected'])
						.executeTakeFirstOrThrow();

					id = update.id;
				}

				if (archive.thumbnail !== undefined) {
					try {
						const imagePath = join(
							config.directories.images,
							hash,
							'_meta',
							`${leadingZeros(archive.thumbnail, images.length)}.png`
						);

						await rm(imagePath, { force: true });
					} catch {
						/* empty */
					}
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
								`Moving generated images from ${chalk.bold(sourcePath)} to ${chalk.bold(destinationPath)}\n`
							)
						);
					}

					try {
						await rename(sourcePath, destinationPath);
					} catch (error) {
						multibar.log(
							chalk.red(
								`Failed to move generated images from ${chalk.bold(sourcePath)} to ${chalk.bold(destinationPath)} - ${(error as Error).message}\n`
							)
						);
					}
				};

				if (hash !== existingPath.hash) {
					await moveImages();
				}
			} else {
				// Index path does NOT exists in database
				const insert = await db
					.insertInto('archives')
					.values({
						title: archive.title,
						path: scan.path,
						hash,
						description: archive.description,
						language: archive.language ?? config.metadata.defaultLanguage,
						releasedAt: archive.releasedAt?.toISOString(),
						thumbnail: archive.thumbnail,
						pages: images.length,
						size,
					})
					.returning('id')
					.executeTakeFirstOrThrow();

				id = insert.id;
			}

			if (!isProtected) {
				if (archive.tags) {
					await upsertTags(id, archive.tags);
				}

				if (archive.sources) {
					await upsertSources(id, archive.sources);
				}

				if (archive.series) {
					await upsertSeries(id, archive.series);
				}
			}

			await upsertImages(id, images, hash);

			if ((scan.type === 'archive' && opts.unpack) || config.server.autoUnpack) {
				let unpacked = 0;
				let skipped = 0;

				if (opts.verbose) {
					multibar.log(
						chalk.bgBlue(`Unpacking ${images.length} images for ${chalk.bold(scan.path)}\n`)
					);
				}

				const zip = new StreamZip.async({ file: scan.path });

				for (const image of images) {
					const imagePath = join(
						config.directories.images,
						hash,
						`${leadingZeros(image.pageNumber, images.length)}${extname(image.filename)}`
					);

					const data = await zip.entryData(image.filename);

					await zip.close();

					if (await exists(imagePath)) {
						const hasher = new Bun.CryptoHasher('sha256');
						const newImageHash = hasher.update(data).digest('hex').substring(0, 16);

						const buffer = await readStream(createReadStream(imagePath));
						const oldImageHash = hasher.update(buffer).digest('hex').substring(0, 16);

						if (newImageHash === oldImageHash) {
							if (opts.verbose) {
								multibar.log(chalk.yellow(`${chalk.bold(imagePath)} already exists, skipping\n`));
							}

							skipped++;
							continue;
						}
					}

					await Bun.write(imagePath, data);

					unpacked++;
				}

				if (opts.verbose) {
					multibar.log(chalk.blue(`Unpacked ${unpacked} and skipped ${skipped} images\n`));
				}
			}

			indexed++;
		} catch (error) {
			multibar.log(
				chalk.redBright(`Failed to index ${chalk.bold(scan.path)} - ${(error as Error).message}\n`)
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
export const pruneArchives = async () => {
	const db = (await import('../shared/db')).default;

	const archives = await db.selectFrom('archives').select(['id', 'path']).execute();

	const toDelete: number[] = [];

	for (const archive of archives) {
		if (await exists(archive.path)) {
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

export const pruneTags = async () => {
	const db = (await import('../shared/db')).default;

	const disconnectedTags = await db
		.selectFrom('tags')
		.select(['id', 'namespace', 'name'])
		.where((eb) =>
			eb.not(
				eb.exists(
					eb.selectFrom('archiveTags').select('id').whereRef('archiveTags.tagId', '=', 'tags.id')
				)
			)
		)
		.execute();

	if (disconnectedTags.length) {
		await db
			.deleteFrom('tags')
			.where(
				'id',
				'in',
				disconnectedTags.map((tag) => tag.id)
			)
			.execute();

		console.info(`Deleted ${chalk.bold(disconnectedTags.length)} tags`);
	} else {
		console.info('No tags were deleted');
	}

	await db.destroy();
};
