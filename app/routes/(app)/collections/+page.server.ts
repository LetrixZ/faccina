import { redirect } from '@sveltejs/kit';
import { userCollections } from '$lib/server/db/queries';
import type { Collection } from '$lib/types';
import config from '~shared/config';
import db from '~shared/db';

export const load = async ({ locals }) => {
	if (!locals.user || !config.site.enableCollections) {
		redirect(301, '/');
	}

	let collections = await userCollections(locals.user.id);

	if (!collections.length) {
		await db
			.insertInto('collection')
			.values({
				name: 'Bookmarks',
				slug: `bookmarks-${locals.user.id}`,
				protected: true,
				userId: locals.user.id,
			})
			.execute();
	}

	collections = await userCollections(locals.user.id);

	return {
		collections: collections satisfies Collection[],
	};
};
