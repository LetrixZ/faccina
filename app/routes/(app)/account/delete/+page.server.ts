import { fail, redirect } from '@sveltejs/kit';
import argon2 from 'argon2';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { userDeleteSchema } from '$lib/schemas';
import db from '~shared/db';

export const actions = {
	default: async (event) => {
		const user = event.locals.user;

		if (!user) {
			return fail(400, {
				message: 'You are not logged in',
			});
		}

		const form = await superValidate(event, zod(userDeleteSchema));
		const { currentPassword } = form.data;

		const { passwordHash } = await db
			.selectFrom('users')
			.select('passwordHash')
			.where('id', '=', user.id)
			.executeTakeFirstOrThrow();

		const validPassword = await argon2.verify(passwordHash, currentPassword);

		if (!validPassword) {
			return setError(form, 'currentPassword', 'The current password is invalid.');
		}

		await db.deleteFrom('users').where('id', '=', user.id).execute();

		event.locals.analytics?.postMessage({
			action: 'user_account_delete',
			payload: { userId: user.id },
		});

		redirect(301, '/');
	},
};
