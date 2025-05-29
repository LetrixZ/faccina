import { userDeleteSchema } from '$lib/schemas';
import { Algorithm, verify } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import db from '~shared/db';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

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

		const validPassword = await verify(passwordHash, currentPassword, {
			algorithm: Algorithm.Argon2id,
		});

		if (!validPassword) {
			return setError(form, 'currentPassword', 'The current password is invalid.');
		}

		await db.deleteFrom('users').where('id', '=', user.id).execute();

		redirect(301, '/');
	},
};
