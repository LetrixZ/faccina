import { calculateDimensions, encodeImage } from '$lib/server/image';
import { error } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import { leadingZeros, readStream } from '~shared/utils';
import chalk from 'chalk';
import { filetypemime } from 'magic-bytes.js';
import StreamZip from 'node-stream-zip';
import { extname, join } from 'path';
import sharp from 'sharp';
import { match } from 'ts-pattern';
import { z } from 'zod';

import type { RequestHandler } from './$types';

type ImageArchive = {
	id: number;
	hash: string;
	path: string;
	pages: number;
	page_number: number;
	filename: string;
	width: number | null;
	height: number | null;
};

const originalImage = async (archive: ImageArchive): Promise<[Buffer, string]> => {
	if (!(await Bun.file(archive.path).exists())) {
		console.error(
			chalk.red(
				`[${new Date().toISOString()}] ${chalk.blue`originalImage`} ${chalk.magenta(`[ID ${archive.id}]`)} Page number ${chalk.bold(archive.page_number)} - ZIP archive not found in path ${chalk.bold(archive.path)}\n`
			)
		);

		error(404, {
			message: 'Archive file not found',
			status: 404,
		});
	}

	const zip = new StreamZip.async({ file: archive.path });
	const stream = await zip.stream(archive.filename);
	const buffer = await readStream(stream);

	if (!archive.width || !archive.height) {
		const { width, height } = await sharp(buffer).metadata();

		if (width && height) {
			calculateDimensions({
				archive,
				page: archive.page_number,
				dimensions: { width, height },
			});
		}
	}

	return [buffer, extname(archive.filename)];
};

const resampledImage = async (
	archive: ImageArchive,
	type: string
): Promise<[Buffer | Uint8Array, string]> => {
	const result = z.enum(['cover', 'thumb']).safeParse(type);

	if (!result.data) {
		error(400, {
			message: `Requested image type "${type}" is not valid.`,
			status: 400,
		});
	}

	const preset = match(result.data)
		.with('cover', () => config.image.coverPreset)
		.with('thumb', () => config.image.thumbnailPreset)
		.exhaustive();

	const imagePath = join(
		config.directories.images,
		archive.hash,
		preset.name,
		`${leadingZeros(archive.page_number, archive.pages ?? 1)}.${preset.format}`
	);

	const file = Bun.file(imagePath);

	if (await file.exists()) {
		return [await file.bytes(), extname(imagePath)];
	}

	try {
		const encodedImage = await encodeImage({
			archive,
			page: archive.page_number,
			savePath: imagePath,
			preset,
		});

		return [encodedImage, extname(imagePath)];
	} catch (err) {
		console.error(
			chalk.red(
				`[${new Date().toISOString()}] ${chalk.blue`resampledImage`} ${chalk.magenta(`[ID ${archive.id}]`)} Page number ${chalk.bold(archive.page_number)} - Failed to encode image\n`
			),
			err
		);

		error(500, {
			message: 'Failed to encode image',
			status: 500,
		});
	}
};

export const GET: RequestHandler = async ({ params, url, setHeaders }) => {
	const hash = params.hash;
	const page = parseInt(params.page);

	if (isNaN(page)) {
		error(400, {
			message: `The requested page "${params.page}" is not a number`,
			status: 400,
		});
	}

	const archive = await db
		.selectFrom('archives')
		.innerJoin('archive_images', (join) =>
			join.onRef('archive_id', '=', 'id').on('page_number', '=', page)
		)
		.select(['id', 'hash', 'path', 'pages', 'page_number', 'filename', 'width', 'height'])
		.where('hash', '=', hash)
		.executeTakeFirst();

	if (!archive) {
		error(404, {
			message: 'Gallery not found',
			status: 404,
		});
	}

	const imageType = url.searchParams.get('type');

	const [image, extension] = await (() => {
		if (imageType) {
			return resampledImage(archive, imageType);
		} else {
			return originalImage(archive);
		}
	})();

	let mimetype = filetypemime(image)?.[0];

	if (!mimetype || !mimetype.startsWith('image/')) {
		mimetype = `image/${extension.replace('.', '')}`;
	}

	setHeaders({ 'content-type': mimetype });

	return new Response(image);
};
