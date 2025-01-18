import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { sortArchiveTags } from '$lib/server/utils';
import { createCollectionSchema } from '$lib/schemas';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom, now } from '~shared/db/helpers';

export const load = async ({ params, locals }) => {
	if (!locals.user || !config.site.enableCollections) {
		redirect(301, '/');
	}

	const slug = params.slug;

	let query = db
		.selectFrom('collection')
		.select((eb) => [
			'collection.id',
			'collection.name',
			'collection.slug',
			'collection.protected',
			jsonArrayFrom(
				eb
					.selectFrom('collectionArchive')
					.innerJoin('archives', 'archives.id', 'archiveId')
					.select((eb) => [
						'archives.id',
						'archives.hash',
						'archives.title',
						'archives.pages',
						'archives.thumbnail',
						'archives.deletedAt',
						jsonArrayFrom(
							eb
								.selectFrom('archiveTags')
								.innerJoin('tags', 'tags.id', 'tagId')
								.select(['tags.id', 'tags.namespace', 'tags.name', 'tags.displayName'])
								.whereRef('archives.id', '=', 'archiveId')
								.orderBy('archiveTags.createdAt asc')
						).as('tags'),
					])
					.orderBy('order asc')
					.whereRef('collectionId', '=', 'collection.id')
			).as('archives'),
		])
		.where('slug', '=', slug);

	if (!locals.user.admin) {
		query = query.where('userId', '=', locals.user.id);
	}

	const collection = await query.executeTakeFirst();

	if (!collection) {
		error(404, {
			message: 'Collection not found',
		});
	}

	collection.archives = collection.archives.map(sortArchiveTags);

	return {
		collection,
		editForm: await superValidate(
			{
				name: collection.name,
			},
			zod(createCollectionSchema)
		),
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

		const slug = event.params.slug;

		const collection = await db
			.selectFrom('collection')
			.select('id')
			.where('slug', '=', slug)
			.where('userId', '=', event.locals.user.id)
			.executeTakeFirst();

		if (!collection) {
			return fail(404, {
				message: 'This collection does not exists',
			});
		}

		const form = await superValidate(event, zod(createCollectionSchema));

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const { name, archives } = form.data;

		await db
			.updateTable('collection')
			.set({
				name,
				updatedAt: now(),
			})
			.where('id', '=', collection.id)
			.executeTakeFirstOrThrow();

		const collectionArchives = await db
			.selectFrom('collectionArchive')
			.select('archiveId')
			.where('collectionId', '=', collection.id)
			.execute();

		const relationDelete = collectionArchives.filter(
			(relation) => !archives.some((id) => id === relation.archiveId)
		);

		if (relationDelete.length) {
			await db
				.deleteFrom('collectionArchive')
				.where(
					'archiveId',
					'in',
					relationDelete.map((relation) => relation.archiveId)
				)
				.where('collectionId', '=', collection.id)
				.execute();
		}

		if (archives.length) {
			await db
				.insertInto('collectionArchive')
				.values(
					archives.map((id, i) => ({
						archiveId: id,
						collectionId: collection.id,
						order: i,
						updatedAt: now(),
					}))
				)
				.onConflict((oc) =>
					oc.columns(['collectionId', 'archiveId']).doUpdateSet((eb) => ({
						order: eb.ref('excluded.order'),
					}))
				)
				.execute();
		}

		event.locals.analytics?.postMessage({
			action: 'collection_update',
			payload: {
				data: form.data,
				userId: event.locals.user.id,
			},
		});

		return {
			form,
		};
	},
};
