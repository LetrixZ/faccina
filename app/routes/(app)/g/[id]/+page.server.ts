import { editArchiveSchema, editTagsSchema } from '$lib/schemas';
import { getArchive, getGallery } from '$lib/server/db/queries';
import { error, fail } from '@sveltejs/kit';
import { upsertSources, upsertTags } from '~shared/archive';
import db from '~shared/db';
import { now } from '~shared/db/helpers';
import dayjs from 'dayjs';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import type { Archive } from '~/lib/types';

import type { Actions, PageServerLoad } from './$types';

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

	return {
		gallery,
		archive,
		isFavorite,
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
	addFavorite: async (event) => {
		if (!event.locals.user) {
			throw fail(400, {
				message: 'You are not logged in',
			});
		}

		await db
			.insertInto('userFavorites')
			.values({
				userId: event.locals.user.id,
				archiveId: parseInt(event.params.id),
			})
			.execute();
	},
	removeFavorite: async (event) => {
		if (!event.locals.user) {
			throw fail(400, {
				message: 'You are not logged in',
			});
		}

		await db
			.deleteFrom('userFavorites')
			.where('userId', '=', event.locals.user.id)
			.where('archiveId', '=', parseInt(event.params.id))
			.execute();
	},
	hide: async (event) => {
		const admin = event.locals.user?.admin;

		if (!admin) {
			throw fail(401);
		}

		const { id } = event.params;

		await db
			.updateTable('archives')
			.set({ deletedAt: now() })
			.where('id', '=', parseInt(id))
			.execute();
	},
	show: async (event) => {
		const admin = event.locals.user?.admin;

		if (!admin) {
			throw fail(401);
		}

		const { id } = event.params;

		await db
			.updateTable('archives')
			.set({
				deletedAt: null,
			})
			.where('id', '=', parseInt(id))
			.execute();
	},
	editInfo: async (event) => {
		const admin = event.locals.user?.admin;

		if (!admin) {
			throw fail(401);
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
				protected: isProtected,
				updatedAt: now(),
			})
			.where('id', '=', archive.id)
			.execute();

		await upsertSources(
			parseInt(id),
			sources.map((source) => ({ name: source.name, url: source.url ?? undefined }))
		);

		return {
			form,
		};
	},
	editTags: async (event) => {
		const admin = event.locals.user?.admin;

		if (!admin) {
			throw fail(401);
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

		return {
			form,
		};
	},
} satisfies Actions;
