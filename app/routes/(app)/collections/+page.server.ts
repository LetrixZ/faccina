import { userCollections } from '$lib/server/db/queries';
import { redirect } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import type { Collection } from '$lib/types';

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
				protected: 1,
				userId: locals.user.id,
			})
			.execute();
	}

	collections = await userCollections(locals.user.id);

	return {
		collections: collections satisfies Collection[],
	};
};
