import chalk from 'chalk';
import { randomBytes } from 'crypto';

import config from '../shared/config';
import db from '../shared/db';

export const loginLink = async (username: string) => {
	const user = await db
		.selectFrom('users')
		.select('id')
		.where('username', '=', username)
		.executeTakeFirst();

	if (!user) {
		throw new Error("The specified user doesn't exists");
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

	console.info(chalk.cyan(`Generated one-time login link for ${username}: ${chalk.bold(url)}`));
};
