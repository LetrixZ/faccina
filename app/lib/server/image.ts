import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import chalk from 'chalk';
import StreamZip from 'node-stream-zip';
import sharp from 'sharp';
import { match } from 'ts-pattern';
import { readStream } from '~shared/utils';
import db from '~shared/db';
import config, { type Preset } from '~shared/config';

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
			.selectFrom('archiveImages')
			.select('filename')
			.where('archiveId', '=', args.archive.id)
			.where('pageNumber', '=', args.page)
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
		.updateTable('archiveImages')
		.set({
			width: args.dimensions.width,
			height: args.dimensions.height,
		})
		.where('archiveId', '=', args.archive.id)
		.where('pageNumber', '=', args.page)
		.execute();
};

export const encodeImage = async (args: ImageEncodingArgs) => {
	const image = await db
		.selectFrom('archiveImages')
		.select(['filename', 'width', 'height'])
		.where('archiveId', '=', args.archive.id)
		.where('pageNumber', '=', args.page)
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
		.updateTable('archiveImages')
		.set({ width, height })
		.where('pageNumber', '=', args.page)
		.where('archiveId', '=', args.archive.id)
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
		await mkdir(dirname(args.savePath), { recursive: true });
		await writeFile(args.savePath, newImage);
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
