import { userCollections } from '$lib/server/db/queries.js';
import type { Collection } from '$lib/types.js';
import { redirect } from '@sveltejs/kit';
import config from '~shared/config.js';
import db from '~shared/db/index.js';

export const load = async ({ locals }) => {
	if (!locals.user) {
		redirect(301, '/login?to=/collections');
	} else if (!config.site.enableCollections) {
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
				userId: locals.user.id
			})
			.execute();
	}

	collections = await userCollections(locals.user.id);

	return {
		collections: collections satisfies Collection[]
	};
};
