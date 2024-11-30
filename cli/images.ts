import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import { MultiBar, Presets } from 'cli-progress';
import StreamZip from 'node-stream-zip';
import pMap from 'p-map';
import sharp from 'sharp';
import { match } from 'ts-pattern';
import config, { Preset } from '../shared/config';
import db from '../shared/db';
import { jsonArrayFrom } from '../shared/db/helpers';
import { exists, leadingZeros, readStream, sleep } from '../shared/utils';
import { queryIdRanges } from './utilts';

type GenerateImagesOptions = {
	ids?: string;
	force: boolean;
	reverse?: boolean;
};

type ImageEncode = { filename: string; pageNumber: number; savePath: string; preset: Preset };

type ArchiveEncode = { id: number; path: string; images: ImageEncode[] };

export const generateImages = async (options: GenerateImagesOptions) => {
	const start = performance.now();

	const query = queryIdRanges(db.selectFrom('archives'), options.ids)
		.select((eb) => [
			'id',
			'path',
			'hash',
			'pages',
			'thumbnail',
			jsonArrayFrom(
				eb
					.selectFrom('archiveImages')
					.select(['filename', 'pageNumber'])
					.whereRef('archiveId', '=', 'id')
			).as('images'),
		])
		.orderBy(options.reverse ? 'id desc' : 'id asc');

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
					`${leadingZeros(image.pageNumber, archive.pages)}.${preset.format}`
				);

			if (image.pageNumber === archive.thumbnail) {
				const savePath = getPath(coverPreset);

				if (!options.force && (await exists(savePath))) {
					skipped++;
				} else {
					images.push({
						filename: image.filename,
						pageNumber: image.pageNumber,
						savePath,
						preset: coverPreset,
					});
					imageCount++;
				}
			}

			const savePath = getPath(thumbnailPreset);

			if (!options.force && (await exists(savePath))) {
				skipped++;
			} else {
				images.push({
					filename: image.filename,
					pageNumber: image.pageNumber,
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
						.updateTable('archiveImages')
						.set({ width, height })
						.where('pageNumber', '=', image.pageNumber)
						.where('archiveId', '=', archive.id)
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
					await mkdir(dirname(image.savePath), { recursive: true });
					await writeFile(image.savePath, newImage);

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
