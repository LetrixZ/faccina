import { createCollectionSchema } from '$lib/schemas';
import { slugify } from '$lib/utils';
import { fail, redirect } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import crypto from 'crypto';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

export const load = async ({ locals }) => {
	if (!locals.user) {
		redirect(301, '/login?to=/collections/new');
	} else if (!config.site.enableCollections) {
		redirect(301, '/');
	}

	return {
		createForm: await superValidate(zod(createCollectionSchema)),
	};
};

export const actions = {
	default: async (event) => {
		if (!event.locals.user) {
			return fail(400, {
				message: 'You are not logged in',
			});
		}

		if (!config.site.enableCollections) {
			return fail(400, {
				message: 'Collections are not enabled',
			});
		}

		const form = await superValidate(event, zod(createCollectionSchema));

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const { name, archives } = form.data;

		let slug = slugify(name);

		if (slug === 'new') {
			slug = slugify(`${name}-${crypto.randomBytes(4).toString('hex').toLowerCase()}`);
		}

		let existing = await db
			.selectFrom('collection')
			.select('id')
			.where('slug', '=', slug)
			.executeTakeFirst();

		while (existing) {
			slug = slugify(`${name}-${crypto.randomBytes(4).toString('hex').toLowerCase()}`);

			existing = await db
				.selectFrom('collection')
				.select('id')
				.where('slug', '=', slug)
				.executeTakeFirst();
		}

		const { id } = await db
			.insertInto('collection')
			.values({
				name,
				slug,
				userId: event.locals.user.id,
			})
			.returning(['id'])
			.executeTakeFirstOrThrow();

		if (archives.length) {
			await db
				.insertInto('collectionArchive')
				.values(
					archives.map((archive, i) => ({
						archiveId: archive,
						collectionId: id,
						order: i,
					}))
				)
				.execute();
		}

		redirect(300, `/collections/${slug}`);
	},
};
