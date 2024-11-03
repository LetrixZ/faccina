import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { loginSchema, recoverSchema, registerSchema, resetSchema } from '$lib/schemas';
import { tagList } from '$lib/server/db/queries';
import db from '~shared/db';
import type { CollectionItem } from '$lib/types';
import { jsonArrayFrom } from '~shared/db/helpers';

export const load = async ({ locals }) => {
	let userCollections: CollectionItem[] = [];

	if (locals.user) {
		userCollections = await db
			.selectFrom('collection')
			.select((eb) => [
				'collection.id',
				'collection.name',
				'collection.slug',
				jsonArrayFrom(
					eb
						.selectFrom('collectionArchive')
						.select('archiveId as id')
						.whereRef('collectionId', '=', 'collection.id')
				).as('archives'),
			])
			.where('userId', '=', locals.user.id)
			.groupBy('collection.id')
			.orderBy('createdAt asc')
			.execute();
	}

	return {
		userCollections,
		tags: await tagList(),
		loginForm: await superValidate(zod(loginSchema)),
		registerForm: await superValidate(zod(registerSchema)),
		recoverForm: await superValidate(zod(recoverSchema)),
		resetForm: await superValidate(zod(resetSchema)),
	};
};
