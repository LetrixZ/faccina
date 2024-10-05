import { sleep } from 'bun';
import chalk from 'chalk';
import { join } from 'node:path';
import StreamZip from 'node-stream-zip';
import pMap from 'p-map';
import sharp from 'sharp';
import { match } from 'ts-pattern';

import config, { Preset } from '../shared/config';
import db from '../shared/db';
import { jsonArrayFrom } from '../shared/db/helpers';
import { leadingZeros, readStream } from '../shared/utils';

type GenerateImagesOptions = {
	ids?: string[];
	force: boolean;
	batchSize: number;
	sharp: boolean;
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
	page: number;
	archive_id: number;
};

type GenerateImageResult = {
	path: string;
	contents: Uint8Array;
	width: number;
	height: number;
	page: number;
	archive_id: number;
};

type ArchiveImagesBatch = {
	path: string;
	images: ImageGenerate[];
};

const generateSharp = async (batches: ArchiveImagesBatch[][]) => {
	return (
		await pMap(
			batches,
			async (batch) => {
				const results: GenerateImageResult[] = [];

				for (const archive of batch) {
					const zip = new StreamZip.async({ file: archive.path });

					for (const image of archive.images) {
						const preset = image.options;
						const stream = await zip.stream(image.filename);
						const buffer = await readStream(stream);

						let pipeline = sharp(buffer);

						const { width, height } = await pipeline.metadata();

						pipeline = pipeline.resize({ width: preset.width });

						pipeline = match(preset)
							.with({ format: 'webp' }, (data) => pipeline.webp(data))
							.with({ format: 'jpeg' }, (data) => pipeline.jpeg(data))
							.with({ format: 'png' }, () => pipeline.png())
							.with({ format: 'jxl' }, (data) => pipeline.jxl(data))
							.with({ format: 'avif' }, (data) => pipeline.avif(data))
							.exhaustive();

						const newImage = await pipeline.toBuffer();

						results.push({
							path: image.savePath,
							contents: newImage,
							width: width!,
							height: height!,
							page: image.page,
							archive_id: image.archive_id,
						});
					}
				}

				return results;
			},
			{ concurrency: navigator.hardwareConcurrency * 2 }
		)
	).flat();
};

export const generate = async (options: GenerateImagesOptions) => {
	const start = performance.now();

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
				batch.reduce((acc, archive) => acc + archive.images.length, 0) <=
				(options.batchSize ?? navigator.hardwareConcurrency * 4)
		);

		if (lastBatchIndex >= 0) {
			const lastBatch = batches[lastBatchIndex]!;

			if (
				lastBatch.reduce((acc, archive) => acc + archive.images.length, 0) +
					archive.images.length <=
				(options.batchSize ?? navigator.hardwareConcurrency * 4)
			) {
				batches[lastBatchIndex].push(archive);

				continue;
			}
		}

		batches.push([archive]);
	}

	const imageBatches: ArchiveImagesBatch[][] = [];

	for (const batch of batches) {
		const missingImagesBatch: ArchiveImagesBatch[] = [];

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

					missingImages.push({
						filename: image.filename,
						savePath: imagePath,
						options: preset,
						page: image.page_number,
						archive_id: archive.id,
					});
				}

				const preset = config.image.thumbnailPreset;

				const imagePath = join(
					config.directories.images,
					archive.hash,
					preset.name,
					`${leadingZeros(image.page_number, archive.pages ?? 1)}.${preset.format}`
				);

				missingImages.push({
					filename: image.filename,
					savePath: imagePath,
					options: preset,
					page: image.page_number,
					archive_id: archive.id,
				});
			}

			missingImagesBatch.push({
				path: archive.path,
				images: missingImages,
			});
		}

		imageBatches.push(missingImagesBatch);
	}

	const imageCount = archives.flatMap((archive) => archive.images).length;

	console.info(
		`Generating ${chalk.bold(imageCount)} images for ${chalk.bold(archives.length)} archives in ${chalk.bold(imageBatches.length)} batches\n`
	);

	const generatedImages: GenerateImageResult[] = await generateSharp(imageBatches);

	const end = performance.now();

	await db.destroy();
	await sleep(250);

	console.info(chalk.bold(`~~~ Finished in ${((end - start) / 1000).toFixed(2)} seconds ~~~`));
	console.info(
		`Generated ${chalk.bold(generatedImages.length)} images and skipped ${chalk.bold(skipped)} images\n`
	);
};
