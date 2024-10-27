import { sleep } from 'bun';
import chalk from 'chalk';
import { MultiBar, Presets } from 'cli-progress';
import { ExpressionWrapper, SqlBool } from 'kysely';
import { join } from 'node:path';
import StreamZip from 'node-stream-zip';
import pMap from 'p-map';
import sharp from 'sharp';
import { match } from 'ts-pattern';

import config, { Preset } from '../shared/config';
import db from '../shared/db';
import { jsonArrayFrom } from '../shared/db/helpers';
import { DB } from '../shared/types';
import { leadingZeros, readStream } from '../shared/utils';
import { parseIdRanges } from './utilts';

type GenerateImagesOptions = {
	ids?: string;
	force: boolean;
};

type ImageEncode = { filename: string; pageNumber: number; savePath: string; preset: Preset };

type ArchiveEncode = { id: number; path: string; images: ImageEncode[] };

export const generate = async (options: GenerateImagesOptions) => {
	const parsed = parseIdRanges(options.ids);

	const start = performance.now();

	let query = db
		.selectFrom('archives')
		.select((eb) => [
			'id',
			'path',
			'hash',
			'pages',
			'thumbnail',
			jsonArrayFrom(
				eb
					.selectFrom('archive_images')
					.select(['filename', 'page_number'])
					.whereRef('archive_id', '=', 'id')
			).as('images'),
		]);

	if (parsed) {
		const { ids, ranges } = parsed;

		if (ids.length || ranges.length) {
			query = query.where(({ eb, and, or }) => {
				const conditions: ExpressionWrapper<DB, 'archives', SqlBool>[] = [];

				if (ids.length) {
					conditions.push(eb('id', 'in', ids));
				}

				for (const [start, end] of ranges) {
					if (end !== undefined) {
						conditions.push(and([eb('id', '>=', start), eb('id', '<=', end)]));
					} else {
						conditions.push(and([eb('id', '>=', start)]));
					}
				}

				return or(conditions);
			});
		}
	}

	const archives = await query.execute();

	let skipped = 0;
	let imageCount = 0;

	const coverPreset = config.image.coverPreset;
	const thumbnailPreset = config.image.thumbnailPreset;

	const archivesEncode: ArchiveEncode[] = [];

	for (const archive of archives) {
		const images: ImageEncode[] = [];

		for (const image of archive.images) {
			const getPath = (preset: Preset) =>
				join(
					config.directories.images,
					archive.hash,
					preset.name,
					`${leadingZeros(image.page_number, archive.pages)}.${preset.format}`
				);

			if (image.page_number === archive.thumbnail) {
				const savePath = getPath(coverPreset);

				if (!options.force && (await Bun.file(savePath).exists())) {
					skipped++;
				} else {
					images.push({
						filename: image.filename,
						pageNumber: image.page_number,
						savePath,
						preset: coverPreset,
					});
					imageCount++;
				}
			}

			const savePath = getPath(thumbnailPreset);

			if (!options.force && (await Bun.file(savePath).exists())) {
				skipped++;
			} else {
				images.push({
					filename: image.filename,
					pageNumber: image.page_number,
					savePath,
					preset: thumbnailPreset,
				});
				imageCount++;
			}
		}

		if (images.length) {
			archivesEncode.push({
				id: archive.id,
				path: archive.path,
				images,
			});
		}
	}

	console.info(
		`Generating ${chalk.bold(imageCount)} images for ${chalk.bold(archives.length)} archives\n`
	);

	const multibar = new MultiBar(
		{
			clearOnComplete: true,
			format: ` {bar} | ETA: {eta}s | {value}/{total}`,
			linewrap: true,
		},
		Presets.shades_grey
	);
	const progress = multibar.create(imageCount, 0);

	let generatedCount = 0;

	await pMap(
		archivesEncode,
		async (archive) => {
			const zip = new StreamZip.async({ file: archive.path });

			for (const image of archive.images) {
				try {
					const stream = await zip.stream(image.filename);
					const buffer = await readStream(stream);

					let pipeline = sharp(buffer);

					const { width, height } = await pipeline.metadata();

					await db
						.updateTable('archive_images')
						.set({ width, height })
						.where('archive_images.page_number', '=', image.pageNumber)
						.where('archive_id', '=', archive.id)
						.execute()
						.catch((error) =>
							multibar.log(chalk.red(`Failed to save image dimensions: ${error.message}\n`))
						);

					let newHeight: number | undefined = undefined;

					if (config.image.aspectRatioSimilar) {
						const aspectRatio = width! / height!;

						if (aspectRatio >= 0.65 && aspectRatio <= 0.75) {
							newHeight = image.preset.width * (64 / 45);
						}
					}

					pipeline = pipeline.resize({
						width: Math.floor(image.preset.width),
						height: newHeight ? Math.floor(newHeight) : undefined,
					});
					pipeline = match(image.preset)
						.with({ format: 'webp' }, (data) => pipeline.webp(data))
						.with({ format: 'jpeg' }, (data) => pipeline.jpeg(data))
						.with({ format: 'png' }, () => pipeline.png())
						.with({ format: 'jxl' }, (data) => pipeline.jxl(data))
						.with({ format: 'avif' }, (data) => pipeline.avif(data))
						.exhaustive();

					const newImage = await pipeline.toBuffer();
					await Bun.write(image.savePath, newImage);

					generatedCount++;
				} catch (error) {
					multibar.log(
						chalk.red(
							`Failed to generate image ${chalk.bold(image.savePath.split('/').slice(-2).join('/'))} for ${chalk.bold(archive.path)}: ${chalk.bold(error.message)}\n`
						)
					);
				} finally {
					progress.increment();
				}
			}
		},
		{ concurrency: navigator.hardwareConcurrency }
	);

	const end = performance.now();

	await db.destroy();

	await sleep(250);
	multibar.stop();

	console.info(chalk.bold(`~~~ Finished in ${((end - start) / 1000).toFixed(2)} seconds ~~~`));
	console.info(
		`Generated ${chalk.bold(generatedCount)} images and skipped ${chalk.bold(skipped)} images\n`
	);
};
