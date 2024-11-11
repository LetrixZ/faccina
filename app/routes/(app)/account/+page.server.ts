import { fail, redirect } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { userDeleteSchema, userEditSchema } from '$lib/schemas';
import db from '~shared/db';
import { now } from '~shared/db/helpers';

export const load = async ({ locals }) => {
	if (!locals.user) {
		redirect(301, '/');
	}

	const user = await db
		.selectFrom('users')
		.select(['id', 'username', 'email'])
		.where('id', '=', locals.user.id)
		.executeTakeFirstOrThrow();

	return {
		user,
		userForm: await superValidate(
			{
				username: user.username,
				email: user.email ?? undefined,
			},
			zod(userEditSchema)
		),
		deleteForm: await superValidate(zod(userDeleteSchema)),
	};
};

export const actions = {
	default: async (event) => {
		const user = event.locals.user;

		if (!user) {
			return fail(400, {
				message: 'You are not logged in',
			});
		}

		const form = await superValidate(event, zod(userEditSchema));

		const { email, currentPassword, newPassword } = form.data;

		const update: { email?: string; passwordHash?: string } = {
			email: undefined,
			passwordHash: undefined,
		};

		if (email?.length) {
			const existingEmail = await db
				.selectFrom('users')
				.select('id')
				.where('email', '=', email)
				.where('id', '!=', user.id)
				.executeTakeFirst();

			if (existingEmail) {
				return fail(400, {
					message: 'An user with the same email already exists.',
					form,
				});
			}

			update.email = email;
		}

		if (currentPassword?.length && newPassword?.length) {
			const { passwordHash } = await db
				.selectFrom('users')
				.select('passwordHash')
				.where('id', '=', user.id)
				.executeTakeFirstOrThrow();

			const validPassword = await Bun.password.verify(currentPassword, passwordHash, 'argon2id');

			if (!validPassword) {
				return setError(form, 'currentPassword', 'The current password is invalid.');
			}

			const newPasswordHash = await Bun.password.hash(newPassword, {
				algorithm: 'argon2id',
				memoryCost: 19456,
				timeCost: 2,
			});

			update.passwordHash = newPasswordHash;
		}

		await db
			.updateTable('users')
			.set({
				...update,
				updatedAt: now(),
			})
			.where('id', '=', user.id)
			.execute();

		event.locals.analytics?.postMessage({
			action: 'user_account_update',
			payload: { userId: user.id },
		});

		return {
			form,
		};
	},
};
