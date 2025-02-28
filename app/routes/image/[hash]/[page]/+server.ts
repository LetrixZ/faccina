import { stat } from 'fs/promises';
import { extname, join } from 'node:path';
import chalk from 'chalk';
import { filetypemime } from 'magic-bytes.js';
import StreamZip from 'node-stream-zip';
import sharp from 'sharp';
import { match } from 'ts-pattern';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { calculateDimensions, encodeImage } from '$lib/server/image';
import type { ImageArchive } from '$lib/types';
import config from '~shared/config';
import db from '~shared/db';
import { exists, imageDirectory } from '~shared/server.utils';
import { leadingZeros } from '~shared/utils';

const originalImage = async (archive: ImageArchive): Promise<[Buffer | Uint8Array, string]> => {
	const imagePath = join(
		imageDirectory(archive.hash),
		`${leadingZeros(archive.pageNumber, archive.pages)}${extname(archive.filename)}`
	);

	let data: Buffer | Uint8Array;
	let extension: string;

	try {
		data = await Bun.file(imagePath).bytes();
		extension = extname(imagePath);
	} catch {
		if (!exists(archive.path)) {
			console.error(
				chalk.red(
					`[${new Date().toISOString()}] ${chalk.blue`originalImage`} ${chalk.magenta(`[ID ${archive.id}]`)} Page number ${chalk.bold(archive.pageNumber)} - ZIP archive not found in path ${chalk.bold(archive.path)}`
				)
			);

			throw new Error('Archive file not found');
		}

		const info = await stat(archive.path);

		if (info.isFile()) {
			const zip = new StreamZip.async({ file: archive.path });
			data = await zip.entryData(archive.filename);
			await zip.close();

			extension = extname(archive.filename);

			if (config.server.autoUnpack) {
				Bun.write(imagePath, data);
			}
		} else {
			data = await Bun.file(join(archive.path, archive.filename)).bytes();
			extension = extname(archive.filename);
		}
	}

	if (!archive.width || !archive.height) {
		sharp(data)
			.metadata()
			.then(({ width, height }) => {
				if (width && height) {
					calculateDimensions({
						archive,
						page: archive.pageNumber,
						dimensions: { width, height },
					});
				}
			});
	}

	return [data, extension];
};

const resampledImage = async (
	archive: ImageArchive,
	type: string
): Promise<[Buffer | Uint8Array, string]> => {
	let presetName: string | undefined = undefined;

	const presets = config.image.presets;

	const result = z
		.enum([
			'cover',
			'thumb',
			...presets.map((preset) => preset.name),
			...presets.map((preset) => preset.hash),
		])
		.safeParse(type);

	if (!result.data) {
		return originalImage(archive);
	} else {
		presetName = result.data;
	}

	let allowAspectRatioSimilar = false;

	const preset = match(presetName)
		.with('cover', () => {
			allowAspectRatioSimilar = true;
			return config.image.coverPreset;
		})
		.with('thumb', () => {
			allowAspectRatioSimilar = true;
			return config.image.thumbnailPreset;
		})
		.otherwise((name) => presets.find((preset) => preset.name === name || preset.hash === name)!);

	const imagePath = join(
		imageDirectory(archive.hash),
		preset.hash,
		`${leadingZeros(archive.pageNumber, archive.pages ?? 1)}.${preset.format}`
	);

	const file = Bun.file(imagePath);

	if (await file.exists()) {
		return [await file.bytes(), extname(imagePath)];
	}

	try {
		const encodedImage = await encodeImage({
			archive,
			page: archive.pageNumber,
			savePath: imagePath,
			preset,
			allowAspectRatioSimilar,
		});

		return [encodedImage, extname(imagePath)];
	} catch (err) {
		console.error(
			chalk.red(
				`[${new Date().toISOString()}] ${chalk.blue`resampledImage`} ${chalk.magenta(`[ID ${archive.id}]`)} Page number ${chalk.bold(archive.pageNumber)} - Failed to encode image`
			),
			err
		);

		throw new Error('Failed to encode image');
	}
};

export const GET: RequestHandler = async ({ params, url, locals, setHeaders }) => {
	if (!locals.user && !config.site.guestAccess) {
		return new Response(null, { status: 404 });
	}

	const hash = params.hash;
	const page = parseInt(params.page);

	if (isNaN(page)) {
		return new Response(null, { status: 400 });
	}

	const archive = await db
		.selectFrom('archives')
		.innerJoin('archiveImages', (join) =>
			join.onRef('archiveId', '=', 'id').on('pageNumber', '=', page)
		)
		.select(['id', 'hash', 'path', 'pages', 'filename', 'pageNumber', 'width', 'height'])
		.where('hash', '=', hash)
		.executeTakeFirst();

	if (!archive) {
		return new Response(null, { status: 404 });
	}

	const imageType = url.searchParams.get('type');

	let image: Buffer | Uint8Array;
	let extension: string;

	if (imageType) {
		[image, extension] = await resampledImage(archive, imageType);
	} else {
		[image, extension] = await originalImage(archive);
	}

	let mimetype = filetypemime(image)?.[0];

	if (!mimetype || !mimetype.startsWith('image/')) {
		mimetype = `image/${extension.replace('.', '')}`;
	}

	setHeaders({ 'Content-Type': mimetype });

	if (config.image.caching) {
		switch (imageType) {
			case 'cover':
				setHeaders({
					'Cache-Control': `public, max-age=${config.image.caching.cover}, immutable`,
				});
				break;
			case 'thumbnail':
				setHeaders({
					'Cache-Control': `public, max-age=${config.image.caching.thumbnail}, immutable`,
				});
				break;
			default:
				setHeaders({
					'Cache-Control': `public, max-age=${config.image.caching.page}, immutable`,
				});
				break;
		}
	}

	return new Response(image);
};
