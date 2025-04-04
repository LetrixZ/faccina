import { error, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';
import { resetSchema } from '$lib/schemas';
import config from '~shared/config';
import db from '~shared/db';
import { now } from '~shared/db/helpers';

export const load: PageServerLoad = async ({ url }) => {
	if (!config.site.enableUsers) {
		error(404, { message: 'Not Found' });
	}

	return {
		form: await superValidate(
			{ code: url.searchParams.get('code') ?? undefined },
			zod(resetSchema),
			{ errors: false }
		),
	};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(resetSchema));

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const { code, password } = form.data;

		const user = await db
			.selectFrom('userCodes')
			.select('userId')
			.where('code', '=', code)
			.where('consumedAt', 'is', null)
			.where('type', '=', 'recovery')
			.executeTakeFirst();

		if (!user) {
			return fail(400, {
				message: 'Invalid recovery code.',
				form,
			});
		}

		await db.updateTable('userCodes').set({ consumedAt: now() }).where('code', '=', code).execute();

		const hash = await Bun.password.hash(password, {
			algorithm: 'argon2id',
			memoryCost: 19456,
			timeCost: 2,
		});

		await db
			.updateTable('users')
			.set({
				passwordHash: hash,
			})
			.where('id', '=', user.userId)
			.execute();

		return {
			form,
		};
	},
};
