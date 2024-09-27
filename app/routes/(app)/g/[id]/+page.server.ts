import type { ArchiveDetail } from '$lib/models';

import { archiveSchema } from '$lib/schemas';
import { get } from '$lib/server/db/queries';
import { error, fail } from '@sveltejs/kit';
import db from '~shared/db';
import dayjs from 'dayjs';
import * as R from 'ramda';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = parseInt(params.id);

	if (isNaN(id)) {
		throw error(400, { message: 'Invalid ID', status: 400 });
	}

	const archive = await get(id, !!locals.user?.admin);

	if (!archive) {
		throw error(404, { message: 'Not found', status: 404 });
	}

	let isFavorite = false;

	if (locals.user) {
		isFavorite = !!(await db
			.selectFrom('user_favorites')
			.select('user_id')
			.where('archive_id', '=', archive.id)
			.where('user_id', '=', locals.user.id)
			.executeTakeFirst());
	}

	return {
		archive: R.omit(['path', 'has_metadata'], archive) satisfies ArchiveDetail,
		isFavorite,
		editForm: locals.user?.admin
			? await superValidate(
					{
						title: archive.title,
						slug: archive.slug,
						description: archive.description ?? undefined,
						hash: archive.hash,
						path: archive.path,
						pages: archive.pages,
						size: archive.size,
						thumbnail: archive.thumbnail,
						language: archive.language ?? undefined,
						releasedAt: archive.released_at
							? dayjs(archive.released_at).format('YYYY-MM-DD[T]HH:mm')
							: undefined,
						hasMetadata: archive.has_metadata!,
					},
					zod(archiveSchema)
				)
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
			.insertInto('user_favorites')
			.values({
				user_id: event.locals.user.id,
				archive_id: parseInt(event.params.id),
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
			.deleteFrom('user_favorites')
			.where('user_id', '=', event.locals.user.id)
			.where('archive_id', '=', parseInt(event.params.id))
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
			.set({
				deleted_at: new Date().toISOString(),
			})
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
				deleted_at: null,
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

		const form = await superValidate(event, zod(archiveSchema));

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const { title, slug, description, pages, thumbnail, releasedAt } = form.data;

		await db
			.updateTable('archives')
			.set({
				title,
				slug,
				description,
				pages,
				thumbnail,
				released_at: dayjs(releasedAt).toISOString(),
			})
			.where('id', '=', parseInt(id))
			.execute();

		return {
			form,
		};
	},
} satisfies Actions;
