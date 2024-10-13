import type { ArchiveDetail } from '$lib/models';

import { editArchiveSchema, editTaxonomySchema } from '$lib/schemas';
import { get } from '$lib/server/db/queries';
import { error, fail } from '@sveltejs/kit';
import { upsertSources, upsertTags, upsertTaxonomy } from '~shared/archive';
import db from '~shared/db';
import { now } from '~shared/db/helpers';
import { taxonomyTables } from '~shared/taxonomy';
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
		archive: locals.user?.admin
			? archive
			: (R.omit(['path', 'has_metadata'], archive) satisfies ArchiveDetail),
		isFavorite,
		editForm: locals.user?.admin
			? await superValidate(
					{
						title: archive.title,
						slug: archive.slug,
						description: archive.description ?? undefined,
						pages: archive.pages,
						thumbnail: archive.thumbnail,
						language: archive.language ?? undefined,
						releasedAt: archive.released_at
							? dayjs(archive.released_at).format('YYYY-MM-DD[T]HH:mm')
							: undefined,
						hasMetadata: archive.has_metadata!,
						sources: archive.sources.map(({ name, url }) => ({ name, url: url ?? undefined })),
						protected: !!archive.protected,
					},
					zod(editArchiveSchema)
				)
			: undefined,
		editTaxonomyForm: locals.user?.admin
			? await superValidate(
					{
						artists: archive.artists.map((tag) => tag.name),
						circles: archive.circles.map((tag) => tag.name),
						magazines: archive.magazines.map((tag) => tag.name),
						events: archive.events.map((tag) => tag.name),
						publishers: archive.publishers.map((tag) => tag.name),
						parodies: archive.parodies.map((tag) => tag.name),
						tags: archive.tags.map((tag) =>
							tag.namespace?.length ? `${tag.namespace}:${tag.name}` : tag.name
						),
					},
					zod(editTaxonomySchema)
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

		const form = await superValidate(event, zod(editArchiveSchema));

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const {
			title,
			slug,
			description,
			thumbnail,
			releasedAt,
			sources,
			protected: isProtected,
		} = form.data;

		console.log('x', isProtected);

		await db
			.updateTable('archives')
			.set({
				title,
				slug,
				description,
				thumbnail,
				released_at: dayjs(releasedAt).toISOString(),
				protected: isProtected,
				updated_at: now(),
			})
			.where('id', '=', parseInt(id))
			.execute();

		await upsertSources(
			parseInt(id),
			sources.map((source) => ({ name: source.name, url: source.url ?? undefined }))
		);

		return {
			form,
		};
	},
	editTaxonomy: async (event) => {
		const admin = event.locals.user?.admin;

		if (!admin) {
			throw fail(401);
		}

		const { id } = event.params;

		const form = await superValidate(event, zod(editTaxonomySchema));

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const { tags } = form.data;

		for (const { relationId, relationTable, referenceTable } of taxonomyTables) {
			if (
				referenceTable === 'tags' ||
				relationTable === 'archive_tags' ||
				relationId === 'tag_id'
			) {
				await upsertTags(
					parseInt(id),
					tags.map((tag) => {
						const [namespace, name] = tag.split(':');

						if (!name || name.startsWith(' ')) {
							return [namespace, ''];
						} else {
							return [name, namespace];
						}
					})
				);
			} else {
				await upsertTaxonomy(
					parseInt(id),
					form.data[referenceTable],
					referenceTable,
					relationTable,
					relationId
				);
			}
		}

		return {
			form,
		};
	},
} satisfies Actions;
