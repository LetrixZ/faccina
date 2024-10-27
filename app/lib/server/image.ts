import config, { type Preset } from '~shared/config';
import db from '~shared/db';
import { readStream } from '~shared/utils';
import chalk from 'chalk';
import StreamZip from 'node-stream-zip';
import sharp from 'sharp';
import { match } from 'ts-pattern';

import { ProcessingQueue } from '../server/queue';

export type ImageEncodingArgs = {
	archive: { id: number; path: string };
	page: number;
	savePath: string;
	preset: Preset;
};

export type ImageDimensionsArgs = {
	archive: { id: number; path: string };
	page: number;
	buffer?: Buffer;
	dimensions?: { width: number; height: number };
};

export const calculateDimensions = async (args: ImageDimensionsArgs) => {
	if (!args.dimensions) {
		const image = await db
			.selectFrom('archive_images')
			.select('filename')
			.where('archive_id', '=', args.archive.id)
			.where('page_number', '=', args.page)
			.executeTakeFirst();

		if (!image) {
			console.error(
				chalk.red(
					`[${new Date().toISOString()}] [calculateDimensions] ${chalk.magenta(`[ID ${args.archive.id}]`)} Page number ${chalk.bold(args.page)} - Image not found`
				)
			);

			throw new Error('Image not found');
		}

		const { width, height } = await sharp(args.buffer).metadata();

		if (width && height) {
			args.dimensions = {
				width,
				height,
			};
		} else {
			return;
		}
	}

	await db
		.updateTable('archive_images')
		.set({
			width: args.dimensions.width,
			height: args.dimensions.height,
		})
		.where('archive_id', '=', args.archive.id)
		.where('page_number', '=', args.page)
		.execute();
};

export const dimensionsQueue = new ProcessingQueue<ImageDimensionsArgs, void>(calculateDimensions);

export const encodeImage = async (args: ImageEncodingArgs) => {
	const image = await db
		.selectFrom('archive_images')
		.select(['filename', 'width', 'height'])
		.where('archive_id', '=', args.archive.id)
		.where('page_number', '=', args.page)
		.executeTakeFirst();

	if (!image) {
		console.error(
			chalk.red(
				`[${new Date().toISOString()}] [encodeImage] ${chalk.magenta(`[ID ${args.archive.id}]`)} Page number ${chalk.bold(args.page)} - Image not found`
			)
		);

		throw new Error('Image not found');
	}

	const zip = new StreamZip.async({ file: args.archive.path });
	const stream = await zip.stream(image.filename);
	const buffer = await readStream(stream);

	let pipeline = sharp(buffer);

	const { width, height } = await pipeline.metadata();

	await db
		.updateTable('archive_images')
		.set({ width, height })
		.where('archive_images.page_number', '=', args.page)
		.where('archive_id', '=', args.archive.id)
		.execute()
		.catch((error) => console.error(`Failed to save image dimensions: ${error.message}`));

	const preset = args.preset;

	let newHeight: number | undefined = undefined;

	if (config.image.aspectRatioSimilar) {
		const aspectRatio = width! / height!;

		if (aspectRatio >= 0.65 && aspectRatio <= 0.75) {
			newHeight = preset.width * (64 / 45);
		}
	}

	pipeline = pipeline.resize({
		width: Math.floor(preset.width),
		height: newHeight ? Math.floor(newHeight) : undefined,
	});
	pipeline = match(preset)
		.with({ format: 'webp' }, (data) => pipeline.webp(data))
		.with({ format: 'jpeg' }, (data) => pipeline.jpeg(data))
		.with({ format: 'png' }, (data) => pipeline.png(data))
		.with({ format: 'jxl' }, (data) => pipeline.jxl(data))
		.with({ format: 'avif' }, (data) => pipeline.avif(data))
		.exhaustive();

	const newImage = await pipeline.toBuffer();

	try {
		await Bun.write(args.savePath, newImage);
	} catch (err) {
		console.error(
			chalk.red(
				`[${new Date().toISOString()}] [encodeImage] ${chalk.magenta(`[ID ${args.archive.id}]`)} Page number ${chalk.bold(args.page)} - Failed to save resampled image to "${chalk.bold(args.savePath)}"`
			),
			err
		);
	}

	return newImage;
};

export const encodeQueue = new ProcessingQueue<ImageEncodingArgs, Promise<Buffer>>(encodeImage);
