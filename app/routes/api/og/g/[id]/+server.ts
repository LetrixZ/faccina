import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { og } from '@ethercorps/sveltekit-og';
import { error } from '@sveltejs/kit';
import sharp from 'sharp';
import GalleryPreview from './gallery-preview.svelte';
import interBold from '$assets/Inter-Bold.ttf?raw-hex';
import interRegular from '$assets/Inter-Regular.ttf?raw-hex';
import { getGallery } from '$lib/server/db/queries';
import config from '~shared/config';
import { exists, leadingZeros } from '~shared/utils';

export const GET = async ({ fetch, params }) => {
	const { id } = params;

	const gallery = await getGallery(parseInt(id), { showHidden: false });

	if (!gallery) {
		error(404);
	}

	const imagePath = join(
		config.directories.images,
		gallery.hash,
		'_meta',
		`${leadingZeros(gallery.thumbnail, gallery.pages)}.png`
	);

	if (config.site.storeOgImages) {
		if (await exists(imagePath)) {
			return new Response(await readFile(imagePath), {
				headers: {
					'content-type': 'image/png',
				},
			});
		}
	}

	const response = await fetch(`/image/${gallery.hash}/${gallery.thumbnail}?type=cover`);
	const data = await response.arrayBuffer();

	const containerHeight = 300;
	const imageHeight = Math.round(containerHeight - 16 * 2);
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
		{ gallery, dataURL, imageHeight, imageWidth }
	);

	if (config.site.storeOgImages) {
		await mkdir(dirname(imagePath), { recursive: true });
		await writeFile(imagePath, metaImage);
	}

	return new Response(metaImage, {
		headers: {
			'content-type': 'image/png',
		},
	});
};
