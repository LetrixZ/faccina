import chalk from 'chalk';
import { randomBytes } from 'crypto';
import { generateIdFromEntropySize } from 'lucia';

import config from '../shared/config';
import db from '../shared/db';
import { recoveryCode, sendRecoveryEmail } from '../shared/users';

export const loginLink = async (username: string) => {
	let user = await db
		.selectFrom('users')
		.select('id')
		.where('username', '=', username)
		.executeTakeFirst();

	if (!user) {
		if (config.site.adminUsers.includes(username)) {
			console.info(chalk.cyan(`Created new user ${chalk.bold(username)}`));

			user = await db
				.insertInto('users')
				.values({
					id: generateIdFromEntropySize(10),
					username,
					password_hash: Bun.password.hashSync(randomBytes(24).toString('hex')),
				})
				.returning('id')
				.executeTakeFirstOrThrow();
		} else {
			throw new Error("The specified user doesn't exists");
		}
	}

	const code = randomBytes(16).toString('hex');

	await db
		.updateTable('user_codes')
		.set({ consumed_at: new Date().toISOString() })
		.where('user_id', '=', user.id)
		.where('consumed_at', 'is', null)
		.where('type', '=', 'login')
		.execute();

	await db
		.insertInto('user_codes')
		.values({
			user_id: user.id,
			code,
			type: 'login',
		})
		.execute();

	const url = config.site.url ? `${config.site.url}/uli/${code}` : `/uli/${code}`;

	console.info(
		chalk.cyan(`Generated one-time login link for ${chalk.bold(username)}: ${chalk.bold(url)}`)
	);
};

export const accessRecovery = async (username: string, codeOnly: boolean) => {
	if (!config.site.enableUsers) {
		throw new Error('Users are disabled');
	}

	const user = await db
		.selectFrom('users')
		.select(['id', 'email'])
		.where('username', '=', username)
		.executeTakeFirst();

	if (!user) {
		throw new Error("The specified user doesn't exists");
	}

	const code = await recoveryCode(user.id);

	console.info(
		chalk.cyan(`Generated recovery code for ${chalk.bold(username)}: ${chalk.bold(code)}`)
	);

	if (codeOnly) {
		return;
	}

	if (!user.email) {
		throw new Error("The user doesn't have an email");
	}

	await sendRecoveryEmail(user.email, code, username);
};
