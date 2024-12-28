import { error } from '@sveltejs/kit';
import { strToU8, Zip, ZipPassThrough } from 'fflate';
import { getGallery } from '$lib/server/db/queries';
import { getMetadata } from '$lib/utils';
import config from '~shared/config';
import { generateFilename } from '~shared/utils';

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
		'Content-Disposition': `attachment;filename*=UTF-8''${encodeURIComponent(generateFilename(gallery.title, gallery.tags) + '.cbz')}`,
	});

	locals.analytics?.postMessage({
		action: 'gallery_download_server',
		payload: {
			archiveId: gallery.id,
			userId: locals.user?.id,
		},
	});

	const zip = new Zip();

	return new Response(
		new ReadableStream({
			async start(controller) {
				try {
					zip.ondata = (err, data, final) => {
						if (err) {
							controller.error(err);
						} else {
							controller.enqueue(data);

							if (final) {
								controller.close();
							}
						}
					};

					const metadataFile = new ZipPassThrough('info.json');
					const encodedMetadata = strToU8(
						JSON.stringify(getMetadata(gallery, config.site.url ?? ''), null, 2)
					);
					zip.add(metadataFile);
					metadataFile.push(encodedMetadata, true);

					for (const image of gallery.images) {
						const res = await fetch(`/image/${gallery.hash}/${image.pageNumber}`);
						const buffer = await res.arrayBuffer();

						const imageFile = new ZipPassThrough(image.filename);
						zip.add(imageFile);
						imageFile.push(new Uint8Array(buffer), true);
					}

					zip.end();
				} catch (error) {
					controller.error(error);
				}
			},
			cancel() {
				zip.terminate();
			},
		})
	);
};
