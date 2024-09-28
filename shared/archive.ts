import type { Image, Source } from './metadata';

import db from './db';

/**
 * Upserts archive sources
 * @param id Archive ID
 * @param archive new archive data
 */
export const upsertSources = async (id: number, sources: Source[]) => {
	const dbSources = await db
		.selectFrom('archive_sources')
		.select(['name', 'url'])
		.where('archive_id', '=', id)
		.execute();

	if (sources?.length) {
		const upsertedSources = await db
			.insertInto('archive_sources')
			.values(
				sources.map(({ name, url }) => ({
					name,
					url,
					archive_id: id,
				}))
			)
			.onConflict((oc) =>
				oc.columns(['archive_id', 'url']).doUpdateSet((eb) => ({
					name: eb.ref('excluded.name'),
				}))
			)
			.returning(['name', 'url'])
			.execute();

		dbSources.push(...upsertedSources);
	}

	const toDelete = dbSources.filter((source) => !sources?.some((s) => s.url === source.url));

	if (toDelete.length) {
		await db
			.deleteFrom('archive_sources')
			.where('archive_id', '=', id)
			.where(
				'url',
				'in',
				toDelete.map((source) => source.url)
			)
			.execute();
	}
};

/**
 * Upserts archive images
 * @param id Archive ID
 * @param archive new archive data
 */
export const upsertImages = async (id: number, images: Image[]) => {
	const dbImages = await db
		.selectFrom('archive_images')
		.select(['filename', 'page_number', 'width', 'height'])
		.where('archive_id', '=', id)
		.execute();

	if (images?.length) {
		const upsertedImages = await db
			.insertInto('archive_images')
			.values(
				images.map(({ filename, page_number, width, height }) => ({
					filename,
					page_number,
					width,
					height,
					archive_id: id,
				}))
			)
			.onConflict((oc) =>
				oc.columns(['archive_id', 'page_number']).doUpdateSet((eb) => ({
					filename: eb.ref('excluded.filename'),
					width: eb.ref('excluded.width'),
					height: eb.ref('excluded.height'),
				}))
			)
			.returning(['filename', 'page_number', 'width', 'height'])
			.execute();

		dbImages.push(...upsertedImages);
	}

	const toDelete = dbImages.filter(
		(image) => !images?.some((i) => i.page_number === image.page_number)
	);

	if (toDelete.length) {
		await db
			.deleteFrom('archive_images')
			.where('archive_id', '=', id)
			.where(
				'page_number',
				'in',
				toDelete.map((image) => image.page_number)
			)
			.execute();
	}
};
