import { error, fail } from '@sveltejs/kit';
import dayjs from 'dayjs';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import type { PageServerLoad } from './$types';
import { editArchiveSchema, editTagsSchema } from '$lib/schemas';
import { getArchive, getGallery } from '$lib/server/db/queries';
import type { Archive, HistoryEntry } from '$lib/types';
import { upsertSources, upsertTags } from '~shared/archive';
import config from '~shared/config';
import db from '~shared/db';
import { now } from '~shared/db/helpers';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = parseInt(params.id);

	if (isNaN(id)) {
		throw error(400, { message: 'Invalid ID', status: 400 });
	}

	const gallery = await getGallery(id, { showHidden: !!locals.user?.admin });

	if (!gallery) {
		throw error(404, { message: 'Not found', status: 404 });
	}

	let isFavorite = false;

	if (locals.user) {
		isFavorite = !!(await db
			.selectFrom('userFavorites')
			.select('userId')
			.where('archiveId', '=', gallery.id)
			.where('userId', '=', locals.user.id)
			.executeTakeFirst());
	}

	let archive: Archive | undefined = undefined;

	if (locals.user?.admin) {
		archive = await getArchive(id);
	}

	locals.analytics?.postMessage({
		action: 'gallery_view',
		payload: {
			archiveId: gallery.id,
			userId: locals.user?.id,
		},
	});

	let readEntry: Omit<HistoryEntry, 'archive'> | undefined = undefined;

	if (locals.user) {
		readEntry = await db
			.selectFrom('userReadHistory')
			.select(['lastPage', 'startPage', 'startedAt', 'lastReadAt', 'finishedAt'])
			.where('archiveId', '=', gallery.id)
			.where('userId', '=', locals.user.id)
			.executeTakeFirst();
	}

	return {
		gallery,
		archive,
		isFavorite,
		readEntry,
		editForm: archive
			? await superValidate(
					{
						title: archive.title,
						description: archive.description ?? undefined,
						pages: archive.pages,
						thumbnail: archive.thumbnail,
						language: archive.language ?? undefined,
						releasedAt: archive.releasedAt
							? dayjs(archive.releasedAt).format('YYYY-MM-DD[T]HH:mm')
							: undefined,
						sources: archive.sources.map(({ name, url }) => ({ name, url: url ?? undefined })),
						protected: !!archive.protected,
					},
					zod(editArchiveSchema)
				)
			: undefined,
		editTagsForm: archive
			? await superValidate({ tags: archive.tags }, zod(editTagsSchema))
			: undefined,
	};
};

export const actions = {
	addFavorite: async ({ locals, params }) => {
		if (!locals.user) {
			return fail(400, {
				message: 'You are not logged in',
			});
		}

		await db
			.insertInto('userFavorites')
			.values({
				userId: locals.user.id,
				archiveId: parseInt(params.id),
			})
			.execute();
	},
	removeFavorite: async ({ locals, params }) => {
		if (!locals.user) {
			return fail(400, {
				message: 'You are not logged in',
			});
		}

		await db
			.deleteFrom('userFavorites')
			.where('userId', '=', locals.user.id)
			.where('archiveId', '=', parseInt(params.id))
			.execute();
	},
	hide: async ({ locals, params }) => {
		const admin = locals.user?.admin;

		if (!admin) {
			return fail(401);
		}

		const { id } = params;

		await db
			.updateTable('archives')
			.set({ deletedAt: now() })
			.where('id', '=', parseInt(id))
			.execute();
	},
	show: async ({ locals, params }) => {
		const admin = locals.user?.admin;

		if (!admin) {
			return fail(401);
		}

		const { id } = params;

		await db
			.updateTable('archives')
			.set({ deletedAt: null })
			.where('id', '=', parseInt(id))
			.execute();
	},
	addCollection: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(400, {
				message: 'You are not logged in',
			});
		}

		if (!config.site.enableCollections) {
			return fail(400, {
				message: 'Collections are not enabled',
			});
		}

		const formData = await request.formData();

		const { data } = z
			.object({
				collection: z.coerce.number(),
				archive: z.coerce.number(),
			})
			.safeParse({
				collection: formData.get('collection'),
				archive: formData.get('archive'),
			});

		if (!data) {
			return fail(400);
		}

		const collection = await db
			.selectFrom('collection')
			.select('id')
			.where('id', '=', data.collection)
			.where('userId', '=', locals.user.id)
			.executeTakeFirst();

		if (!collection) {
			return fail(404, {
				message: 'This collection does not exists',
			});
		}

		const lastArchive = await db
			.selectFrom('collectionArchive')
			.select('order')
			.where('collectionId', '=', collection.id)
			.orderBy('order desc')
			.executeTakeFirst();

		await db
			.insertInto('collectionArchive')
			.values({
				collectionId: collection.id,
				archiveId: data.archive,
				order: lastArchive ? lastArchive.order + 1 : 0,
			})
			.execute();

		return {
			message: 'Gallery added to the collection',
			type: 'success',
		};
	},
	removeCollection: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(400, {
				message: 'You are not logged in',
			});
		}

		if (!config.site.enableCollections) {
			return fail(400, {
				message: 'Collections are not enabled',
			});
		}

		const formData = await request.formData();

		const { data } = z
			.object({
				collection: z.coerce.number(),
				archive: z.coerce.number(),
			})
			.safeParse({
				collection: formData.get('collection'),
				archive: formData.get('archive'),
			});

		if (!data) {
			return fail(400);
		}

		const collection = await db
			.selectFrom('collection')
			.select('id')
			.where('id', '=', data.collection)
			.where('userId', '=', locals.user.id)
			.executeTakeFirst();

		if (!collection) {
			return fail(404, {
				message: 'This collection does not exists',
			});
		}

		await db
			.deleteFrom('collectionArchive')
			.where((eb) =>
				eb.and({
					collectionId: collection.id,
					archiveId: data.archive,
				})
			)
			.execute();

		return {
			message: 'Gallery removed from the collection',
			type: 'success',
		};
	},
	editInfo: async (event) => {
		const user = event.locals.user;

		if (!user || !user.admin) {
			return fail(401);
		}

		const { id } = event.params;

		const archive = await db
			.selectFrom('archives')
			.select('id')
			.where('id', '=', parseInt(id))
			.executeTakeFirst();

		if (!archive) {
			return fail(404);
		}

		const form = await superValidate(event, zod(editArchiveSchema));

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const {
			title,
			description,
			thumbnail,
			releasedAt,
			language,
			sources,
			protected: isProtected,
		} = form.data;

		await db
			.updateTable('archives')
			.set({
				title,
				description,
				thumbnail,
				releasedAt: dayjs(releasedAt).toISOString(),
				language,
				protected: isProtected ? 1 : 0,
				updatedAt: now(),
			})
			.where('id', '=', archive.id)
			.execute();

		await upsertSources(
			parseInt(id),
			sources.map((source) => ({ name: source.name, url: source.url ?? undefined }))
		);

		event.locals.analytics?.postMessage({
			action: 'gallery_update_info',
			payload: {
				archiveId: archive.id,
				data: form.data,
				userId: user.id,
			},
		});

		return {
			form,
		};
	},
	editTags: async (event) => {
		const user = event.locals.user;

		if (!user || !user.admin) {
			return fail(401);
		}

		const { id } = event.params;

		const archive = await db
			.selectFrom('archives')
			.select('id')
			.where('id', '=', parseInt(id))
			.executeTakeFirst();

		if (!archive) {
			return fail(404);
		}

		const form = await superValidate(event, zod(editTagsSchema));

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const { tags } = form.data;

		await upsertTags(archive.id, tags);

		event.locals.analytics?.postMessage({
			action: 'gallery_update_tags',
			payload: {
				archiveId: archive.id,
				data: form.data,
				userId: user.id,
			},
		});

		return {
			form,
		};
	},
};
