import { error } from '@sveltejs/kit';
import { getGallery } from '$lib/server/db/queries';
import type { Gallery } from '$lib/types';
import { getMetadata } from '$lib/utils';
import config from '~shared/config';
import db from '~shared/db';

export const GET = async ({ locals, setHeaders }) => {
	if (!locals.user) {
		error(400, 'Not logged in');
	}

	const favorites = await db
		.selectFrom('userFavorites')
		.select('archiveId')
		.where('userId', '=', locals.user.id)
		.orderBy('createdAt asc')
		.execute();

	const galleries: Gallery[] = [];

	for (const { archiveId } of favorites) {
		const gallery = await getGallery(archiveId, { showHidden: true });

		if (gallery) {
			galleries.push(gallery);
		}
	}

	setHeaders({
		'Content-Disposition': 'attachment; filename=favorites.json',
	});

	return new Response(
		JSON.stringify(
			galleries.map((gallery) => ({
				...getMetadata(gallery, config.site.url ?? ''),
				Id: gallery.id,
				Hash: gallery.hash,
				Language: gallery.language ?? undefined,
				Sources: gallery.sources.length
					? gallery.sources.filter((source) => source.url).map((source) => source.url)
					: undefined,
				Created: Math.round(new Date(gallery.createdAt).getTime() / 1000),
			}))
		)
	);
};
