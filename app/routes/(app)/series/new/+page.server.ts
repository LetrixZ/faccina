import { error, redirect } from '@sveltejs/kit';
import { fail, message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createSeriesSchema } from '$lib/schemas';
import db from '~shared/db';

export const load = async ({ locals }) => {
	if (!locals.user?.admin) {
		error(403, { message: 'Not allowed', status: 403 });
	}

	return {
		form: await superValidate(zod(createSeriesSchema)),
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(createSeriesSchema));

		if (!event.locals.user?.admin) {
			return message(form, 'You are not allowed to perform this action', { status: 403 });
		}

		if (!form.valid) {
			return fail(400, { form });
		}

		const { title, chapters } = form.data;

		const existant = await db
			.selectFrom('series')
			.select('id')
			.where('title', '=', title)
			.limit(1)
			.executeTakeFirst();

		if (existant) {
			return setError(form, 'title', 'A series with the same title already exists.');
		}

		const seriesId = await db.transaction().execute(async (trx) => {
			const { id } = await trx
				.insertInto('series')
				.values({ title })
				.returning('id')
				.executeTakeFirstOrThrow();

			if (chapters.length) {
				await trx
					.insertInto('seriesArchive')
					.values(
						chapters.map((archiveId, i) => ({
							archiveId,
							seriesId: id,
							order: i,
						}))
					)
					.execute();
			}

			return id;
		});

		redirect(301, `/series/${seriesId}`);
	},
};
