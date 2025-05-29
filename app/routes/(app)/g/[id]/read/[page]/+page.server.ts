import { getGallery } from '$lib/server/db/queries';
import { readStream } from '$lib/server/utils';
import { error, redirect } from '@sveltejs/kit';
import config from '~shared/config.js';
import db from '~shared/db';
import dayjs from 'dayjs';
import imageSize from 'image-size';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import StreamZip from 'node-stream-zip';
import { z } from 'zod';

export const load = async ({ params, locals, cookies }) => {
	if (!locals.user && !config.site.guestAccess) {
		throw error(404, { message: 'Not found', status: 404 });
	}

	const { success, data: pageNumber } = z.coerce.number().int().safeParse(params.page);

	if (!success) {
		redirect(301, `/g/${params.id}/read/1`);
	}

	const gallery = await getGallery(+params.id, { showHidden: locals.user?.admin });

	if (!gallery) {
		error(404, { message: 'Not found', status: 404 });
	}

	if (pageNumber < 1) {
		redirect(301, `/g/${params.id}/read/1`);
	} else if (pageNumber > gallery.pages) {
		redirect(301, `/g/${params.id}/read/${gallery.pages}`);
	}

	if (gallery.images.length) {
		const filteredImages = gallery.images.filter(
			(image) => image.width === null || image.height === null
		);

		if (filteredImages.length) {
			const archive = await db
				.selectFrom('archives')
				.select('path')
				.where('id', '=', gallery.id)
				.executeTakeFirstOrThrow();

			const info = await stat(archive.path);

			if (info.isFile()) {
				const zip = new StreamZip.async({ file: archive.path });

				for (const image of filteredImages) {
					const data = await zip.entryData(image.filename);

					const { width, height } = imageSize(data);

					if (width !== undefined && height !== undefined) {
						image.width = width;
						image.height = height;

						await db
							.updateTable('archiveImages')
							.set({ width, height })
							.where('archiveId', '=', gallery.id)
							.where('pageNumber', '=', image.pageNumber)
							.execute();
					}
				}

				await zip.close();
			} else {
				for (const image of gallery.images) {
					if (image.width !== null && image.height !== null) {
						continue;
					}

					const stream = createReadStream(join(archive.path, image.filename), {
						start: 0,
						end: 128 * 1024,
					});

					const data = await readStream(stream);

					const { width, height } = imageSize(data);

					if (width !== undefined && height !== undefined) {
						image.width = width;
						image.height = height;

						await db
							.updateTable('archiveImages')
							.set({ width, height })
							.where('archiveId', '=', gallery.id)
							.where('pageNumber', '=', image.pageNumber)
							.execute();
					}
				}
			}
		}
	}

	try {
		const prefs: { preset?: string | null } = JSON.parse(cookies.get('reader') || '{}');

		if (prefs.preset === undefined) {
			if (config.image.readerDefaultPreset) {
				prefs.preset = config.image.readerDefaultPreset.hash;
			} else if (config.image.readerPresets[0] && !config.image.readerAllowOriginal) {
				prefs.preset = config.image.readerPresets[0].hash;
			}
		} else if (
			prefs.preset !== null &&
			!config.image.readerPresets.some((preset) => preset.hash === prefs.preset)
		) {
			if (config.image.readerDefaultPreset) {
				prefs.preset = config.image.readerDefaultPreset.hash;
			} else if (config.image.readerPresets[0] && !config.image.readerAllowOriginal) {
				prefs.preset = config.image.readerPresets[0].hash;
			} else {
				prefs.preset = null;
			}
		} else if (prefs.preset === null && !config.image.readerAllowOriginal) {
			if (config.image.readerDefaultPreset) {
				prefs.preset = config.image.readerDefaultPreset.hash;
			} else if (config.image.readerPresets[0]) {
				prefs.preset = config.image.readerPresets[0].hash;
			}
		}

		cookies.set('reader', JSON.stringify(prefs), {
			path: '/',
			expires: dayjs().add(1, 'year').toDate(),
			httpOnly: false,
			secure: false,
		});
	} catch (error) {
		console.error(error);
		cookies.set('reader', '{}', {
			path: '/',
			expires: dayjs().add(1, 'year').toDate(),
			httpOnly: false,
			secure: false,
		});
	}

	return {
		gallery,
	};
};
