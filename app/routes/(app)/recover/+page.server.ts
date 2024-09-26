import { recoverSchema } from '$lib/schemas';
import { error, fail } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import { recoveryCode, sendRecoveryEmail } from '~shared/users';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import type { Actions } from './$types';

export const load = async () => {
	if (!config.site.enableUsers || !config.mailer) {
		error(404, { message: 'Not Found' });
	}

	return {
		form: await superValidate(zod(recoverSchema)),
	};
};

const recoverAccess = async (username: string) => {
	const user = await db
		.selectFrom('users')
		.select(['id', 'email'])
		.where('username', '=', username)
		.executeTakeFirst();

	if (!user || !user.email) {
		return;
	}

	const code = await recoveryCode(user.id);

	await sendRecoveryEmail(user.email, code, username);
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(recoverSchema));

		if (!config.site.enableUsers) {
			return fail(400, {
				message: 'Users are disabled.',
				form,
			});
		}

		if (!config.mailer) {
			return fail(400, {
				message: 'Contact the administrator for a recovery code.',
				form,
			});
		}

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const username = form.data.username;

		recoverAccess(username);

		return {
			form,
		};
	},
};
