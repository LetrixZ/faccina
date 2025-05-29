import { Algorithm, hashSync } from '@node-rs/argon2';
import chalk from 'chalk';
import { randomBytes } from 'crypto';
import { generateIdFromEntropySize } from 'lucia';
import config from '../shared/config';
import { now } from '../shared/db/helpers';
import { recoveryCode, sendRecoveryEmail } from '../shared/users';

export const generateLoginLink = async (username: string) => {
	const db = (await import('../shared/db')).default;

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
					passwordHash: hashSync(randomBytes(24).toString('hex'), {
						algorithm: Algorithm.Argon2id,
						memoryCost: 19456,
						timeCost: 2,
					}),
				})
				.returning('id')
				.executeTakeFirstOrThrow();
		} else {
			throw new Error("The specified user doesn't exists");
		}
	}

	const code = randomBytes(16).toString('hex');

	await db
		.updateTable('userCodes')
		.set({ consumedAt: now() })
		.where('userId', '=', user.id)
		.where('consumedAt', 'is', null)
		.where('type', '=', 'login')
		.execute();

	await db
		.insertInto('userCodes')
		.values({
			userId: user.id,
			code,
			type: 'login',
		})
		.execute();

	const url = config.site.url ? `${config.site.url}/uli/${code}` : `/uli/${code}`;

	console.info(
		chalk.cyan(`Generated one-time login link for ${chalk.bold(username)}: ${chalk.bold(url)}`)
	);
};

export const recoverAccess = async (username: string, codeOnly: boolean) => {
	const db = (await import('../shared/db')).default;

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
