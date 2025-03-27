import { getGallery } from '$lib/server/db/queries';
import interBold from '../../../../../assets/Inter-Bold.ttf?raw-hex';
import interRegular from '../../../../../assets/Inter-Regular.ttf?raw-hex';
import GalleryPreview from './gallery-preview.svelte';
import { og } from '@ethercorps/sveltekit-og';
import { join } from 'node:path';
import sharp from 'sharp';
import config from '~shared/config';
import { imageDirectory } from '~shared/server.utils';
import { leadingZeros } from '~shared/utils';

export const GET = async ({ fetch, locals, params }) => {
	if (!locals.user && !config.site.guestAccess) {
		return new Response(null, { status: 404 });
	}

	const { id } = params;

	const gallery = await getGallery(parseInt(id), { showHidden: false });

	if (!gallery) {
		return new Response(null, { status: 404 });
	}

	const imagePath = join(
		imageDirectory(gallery.hash),
		'_meta',
		`${leadingZeros(gallery.thumbnail, gallery.pages)}.png`
	);

	if (config.site.storeOgImages) {
		const file = Bun.file(imagePath);

		if (await file.exists()) {
			return new Response(await file.bytes(), {
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
		await Bun.write(imagePath, metaImage);
	}

	return new Response(metaImage, {
		headers: {
			'content-type': 'image/png',
		},
	});
};
