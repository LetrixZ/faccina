import { recoverSchema } from '$lib/schemas';
import { error, fail, redirect } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import chalk from 'chalk';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { transporter } from '~/lib/server/mailer';

import type { Actions } from './$types';

export const load = async () => {
	if (!config.site.enableUsers) {
		error(404, { message: 'Not Found' });
	}

	return {
		form: await superValidate(zod(recoverSchema)),
	};
};

const recoverAccess = async (username: string) => {
	const user = await db
		.selectFrom('users')
		.select(['id', 'username', 'email'])
		.where('username', '=', username)
		.where('email', 'is not', null)
		.executeTakeFirst();

	if (!user) {
		return;
	}

	// TODO: Implement account recovery

	console.info(
		`[${new Date().toISOString()}] Recover access email - Sending access recovery email to user ${chalk.bold(user.username)} with email ${chalk.bold(user.email)}`
	);

	const response = await transporter().sendMail({
		from: config.mailer!.from,
		to: user.email!,
		subject: `${config.site.siteName} | Account Recovery`,
		html: '<b>Link to recover your password: <a href="https://google.com">https://google.com</></b>',
	});

	console.info(
		`[${new Date().toISOString()}] Recover access email - ${chalk.bold(user.username)} (${chalk.bold(user.email)}) - Response`,
		response
	);
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(recoverSchema));

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

		recoverAccess(username);

		const redirectTo = event.url.searchParams.get('to');

		if (redirectTo) {
			redirect(302, redirectTo);
		}

		return {
			form,
		};
	},
};
