import type { FakkuCollection } from './types';
import db from '~shared/db';
import { jsonArrayFrom } from '~shared/db/helpers';

const collections: FakkuCollection[] = await Bun.file('scripts/fakku_collections.json').json();

const idSlugs = await db
	.selectFrom('archives')
	.select((eb) => [
		'id',
		jsonArrayFrom(
			eb
				.selectFrom('archiveSources')
				.select('url')
				.where('url', 'like', '%fakku.net%')
				.whereRef('archiveId', '=', 'archives.id')
		).as('sources'),
	])
	.execute()
	.then((archives) =>
		archives
			.filter((archive) => archive.sources.length)
			.map((archive) => ({
				id: archive.id,
				slug: archive.sources.map((source) => '/' + source.url!.split('/').slice(-2).join('/'))[0]!,
			}))
	);

const series: { title: string; chapters: { id: number; order: number }[] }[] = [];

for (const { id, slug } of idSlugs) {
	for (const { title, chapters } of collections) {
		const chapterIndex = chapters.indexOf(slug);

		if (chapterIndex >= 0) {
			const seriesIndex = series.findIndex((s) => s.title === title);

			if (seriesIndex === -1) {
				series.push({
					title,
					chapters: [{ id, order: chapterIndex }],
				});
			} else {
				series[seriesIndex]!.chapters.push({ id, order: chapterIndex });
			}

			continue;
		}
	}
}

series.forEach((seriesItem) => seriesItem.chapters.sort((a, b) => a.order - b.order));

for (const { title, chapters } of series) {
	let id;

	const existant = await db
		.selectFrom('series')
		.select('id')
		.where('title', '=', title)
		.executeTakeFirst();

	if (existant) {
		id = existant.id;
	} else {
		const newSeries = await db
			.insertInto('series')
			.values({ title })
			.returning('id')
			.executeTakeFirstOrThrow();

		id = newSeries.id;
	}

	await db.deleteFrom('seriesArchive').where('seriesId', '=', id).execute();

	if (chapters.length) {
		await db
			.insertInto('seriesArchive')
			.values(
				chapters.map((chapter) => ({ archiveId: chapter.id, order: chapter.order, seriesId: id }))
			)
			.execute();
	}
}

db.destroy();
