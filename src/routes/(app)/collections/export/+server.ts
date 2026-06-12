import { error } from '@sveltejs/kit';
import { getGallery } from '$lib/server/db/queries';
import type { Gallery } from '$lib/types';
import { getMetadata } from '$lib/utils';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom } from '~shared/db/helpers';

export const GET = async ({ locals, setHeaders }) => {
	if (!locals.user) {
		error(400, 'Not logged in');
	}

	const collections = await db
		.selectFrom('collection')
		.select((eb) => [
			'collection.name',
			jsonArrayFrom(
				eb
					.selectFrom('collectionArchive')
					.select('archiveId')
					.orderBy('collectionArchive.order asc')
					.whereRef('collection.id', '=', 'collectionId')
			).as('archives'),
		])
		.where('userId', '=', locals.user.id)
		.groupBy('collection.id')
		.orderBy('createdAt asc')
		.execute();

	const collectionsList: { name: string; galleries: number[] }[] = [];
	const galleries: Gallery[] = [];

	for (const { name, archives } of collections) {
		const collection: { name: string; galleries: number[] } = { name, galleries: [] };

		for (const { archiveId } of archives) {
			collection.galleries.push(archiveId);

			if (galleries.some((g) => g.id === archiveId)) {
				continue;
			}

			const gallery = await getGallery(archiveId, { showHidden: true });

			if (gallery) {
				galleries.push(gallery);
			}
		}

		collectionsList.push(collection);
	}

	setHeaders({
		'Content-Disposition': 'attachment; filename=collections.json',
	});

	return new Response(
		JSON.stringify({
			collections: collectionsList,
			galleries: galleries.map((gallery) => ({
				...getMetadata(gallery, config.site.url ?? ''),
				Id: gallery.id,
				Hash: gallery.hash,
				Language: gallery.language ?? undefined,
				Sources: gallery.sources.length
					? gallery.sources.filter((source) => source.url).map((source) => source.url)
					: undefined,
				Created: Math.round(new Date(gallery.createdAt).getTime() / 1000),
			})),
		})
	);
};
