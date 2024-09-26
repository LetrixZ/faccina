import { resetSchema } from '$lib/schemas';
import { error, fail } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import type { Actions } from './$types';

export const load = async ({ url }) => {
	if (!config.site.enableUsers || !config.mailer) {
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

		if (!config.site.enableUsers) {
			return fail(400, {
				message: 'Users are disabled.',
				form,
			});
		}

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const { code, password } = form.data;

		const user = await db
			.selectFrom('user_codes')
			.select('user_id')
			.where('code', '=', code)
			.where('consumed_at', 'is', null)
			.where('type', '=', 'recovery')
			.executeTakeFirst();

		if (!user) {
			return fail(400, {
				message: 'Invalid recovery code.',
				form,
			});
		}

		await db
			.updateTable('user_codes')
			.set({
				consumed_at: new Date().toISOString(),
			})
			.where('code', '=', code)
			.execute();

		const hash = await Bun.password.hash(password, {
			algorithm: 'argon2id',
			memoryCost: 19456,
			timeCost: 2,
		});

		await db
			.updateTable('users')
			.set({
				password_hash: hash,
			})
			.where('id', '=', user.user_id)
			.execute();

		return {
			form,
		};
	},
};
