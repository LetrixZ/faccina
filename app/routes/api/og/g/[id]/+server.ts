import interBold from '$assets/Inter-Bold.ttf?raw-hex';
import interRegular from '$assets/Inter-Regular.ttf?raw-hex';
import { og } from '@ethercorps/sveltekit-og';
import { error } from '@sveltejs/kit';
import config from '~shared/config.js';
import { leadingZeros } from '~shared/utils';
import { join } from 'node:path';
import sharp from 'sharp';

import { get } from '~/lib/server/db/queries';

import GalleryPreview from './gallery-preview.svelte';

export const GET = async ({ fetch, params }) => {
	const { id } = params;

	const archive = await get(parseInt(id), false);

	if (!archive) {
		error(404);
	}

	const imagePath = join(
		config.directories.images,
		archive.hash,
		'_meta',
		`${leadingZeros(archive.thumbnail, archive.pages)}.png`
	);

	const file = Bun.file(imagePath);

	if (await file.exists()) {
		return new Response(await file.bytes(), {
			headers: {
				'content-type': 'image/png',
			},
		});
	}

	const response = await fetch(`/image/${archive.hash}/${archive.thumbnail}?type=cover`);
	const data = await response.arrayBuffer();

	const containerHeight = 300;
	const imageHeight = Math.round(containerHeight - 8 * 2);
	const imageWidth = Math.round((imageHeight * 540) / 768);

	const pipeline = sharp(data).resize({
		height: imageHeight,
		width: imageWidth,
	});
	const buffer = await pipeline.toFormat('png').toBuffer();
	const dataURL = `data:image/png;base64,${buffer.toString('base64')}`;

	const metaImage = await og(
		// @ts-expect-error works
		GalleryPreview,
		{
			width: 600,
			height: 300,
			fonts: [
				{
					name: 'Inter',
					data: Uint8Array.fromHex(interRegular),
					weight: 400,
				},
				{
					name: 'Inter',
					data: Uint8Array.fromHex(interBold),
					weight: 700,
				},
			],
		},
		{ archive, dataURL, imageHeight, imageWidth }
	);

	await Bun.write(imagePath, metaImage);

	return new Response(metaImage, {
		headers: {
			'content-type': 'image/png',
		},
	});
};
