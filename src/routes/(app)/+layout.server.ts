import { loginSchema, recoverSchema, registerSchema, resetSchema } from '$lib/schemas.js';
import { tagList } from '$lib/server/db/queries.js';
import type { CollectionItem } from '$lib/types.js';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { jsonArrayFrom } from '~shared/db/helpers.js';
import db from '~shared/db/index.js';

export const load = async ({ locals }) => {
	const getUserCollections = async (): Promise<CollectionItem[] | undefined> => {
		if (!locals.user) {
			return;
		}

		return await db
			.selectFrom('collection')
			.select((eb) => [
				'collection.id',
				'collection.name',
				'collection.slug',
				'collection.protected',
				jsonArrayFrom(
					eb
						.selectFrom('collectionArchive')
						.select('archiveId as id')
						.whereRef('collectionId', '=', 'collection.id')
				).as('archives')
			])
			.where('userId', '=', locals.user.id)
			.groupBy('collection.id')
			.orderBy('createdAt', 'asc')
			.execute();
	};

	return {
		userCollections: await getUserCollections(),
		tagList: await tagList(),
		loginForm: await superValidate(zod(loginSchema)),
		registerForm: await superValidate(zod(registerSchema)),
		recoverForm: await superValidate(zod(recoverSchema)),
		resetForm: await superValidate(zod(resetSchema))
	};
};
