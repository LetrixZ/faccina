import { error } from '@sveltejs/kit';
import { strToU8, Zip, ZipPassThrough } from 'fflate';
import { getGallery } from '$lib/server/db/queries';
import { generateFilename, getMetadata } from '$lib/utils';
import config from '~shared/config';

export const GET = async ({ params, locals, fetch, setHeaders }) => {
	if (!config.site.guestDownloads && !locals.user) {
		error(400, { message: 'Guest downloads are disabled' });
	}

	const id = parseInt(params.id);

	if (isNaN(id)) {
		throw error(400, { message: 'Invalid ID', status: 400 });
	}

	const gallery = await getGallery(id, { showHidden: !!locals.user?.admin });

	if (!gallery) {
		throw error(404, { message: 'Not found', status: 404 });
	}

	setHeaders({
		'Content-Type': 'application/zip',
		'Content-Disposition': `attachment; filename="${generateFilename(gallery)}.cbz"`,
	});

	const { readable, writable } = new TransformStream();
	const writer = writable.getWriter();

	const zip = new Zip();

	zip.ondata = (err, data, final) => {
		if (err) {
			writer.abort(err);
		} else {
			writer.write(data);

			if (final) {
				writer.close();
			}
		}
	};

	const metadataFile = new ZipPassThrough('info.json');
	const encodedMetadata = strToU8(
		JSON.stringify(getMetadata(gallery, config.site.url ?? ''), null, 2)
	);
	zip.add(metadataFile);
	metadataFile.push(encodedMetadata, true);

	await Promise.all(
		gallery.images.map((image) =>
			fetch(`/image/${gallery.hash}/${image.pageNumber}`)
				.then((res) => res.arrayBuffer())
				.then((buffer) => {
					const imageFile = new ZipPassThrough(image.filename);
					zip.add(imageFile);
					imageFile.push(new Uint8Array(buffer), true);
				})
		)
	);

	zip.end();

	locals.analytics?.postMessage({
		action: 'gallery_download_server',
		payload: {
			archiveId: gallery.id,
			userId: locals.user?.id,
		},
	});

	return new Response(readable);
};
