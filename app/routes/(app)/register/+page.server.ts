import { registerSchema } from '$lib/schemas';
import { lucia } from '$lib/server/auth';
import { error, fail, redirect } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import { generateIdFromEntropySize } from 'lucia';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!config.site.enableUsers) {
		error(404, { message: 'Not Found' });
	}

	if (locals.user) {
		redirect(302, '/');
	}

	return {
		form: await superValidate(zod(registerSchema)),
	};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(registerSchema));

		if (!config.site.enableUsers) {
			return fail(400, {
				message: 'Users are disabled',
				form,
			});
		}

		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const username = form.data.username;
		const password = form.data.password;
		const email = form.data.email;

		const userId = generateIdFromEntropySize(10);
		const passwordHash = await Bun.password.hash(password, {
			algorithm: 'argon2id',
			memoryCost: 19456,
			timeCost: 2,
		});

		const existingUser = await db
			.selectFrom('users')
			.select('id')
			.where((eb) =>
				eb.or([eb('username', '=', username), ...(email ? [eb('email', '=', email)] : [])])
			)
			.executeTakeFirst();

		if (existingUser) {
			return fail(400, {
				message: 'An user with the same username or email already exists.',
				form,
			});
		}

		await db
			.insertInto('users')
			.values({
				id: userId,
				username: username,
				password_hash: passwordHash,
				email,
			})
			.execute();

		const session = await lucia().createSession(userId, {});
		const sessionCookie = lucia().createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes,
		});

		const redirectTo = event.url.searchParams.get('to');

		if (redirectTo) {
			redirect(302, redirectTo);
		}

		return {
			form,
		};
	},
};