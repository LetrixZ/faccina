import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { error } from '@sveltejs/kit';
import chalk from 'chalk';
import db from '~shared/db';
import config from '~shared/config';
import { log } from '$lib/server/utils';

export const DELETE = async ({ params, locals }) => {
	const user = locals.user;

	if (!user || !user.admin) {
		error(401);
	}

	const { id } = params;

	const archive = await db
		.selectFrom('archives')
		.select(['id', 'title', 'path', 'hash'])
		.where('id', '=', parseInt(id))
		.executeTakeFirst();

	if (!archive) {
		error(404);
	}

	await db.transaction().execute(async (trx) => {
		await trx.deleteFrom('archives').where('id', '=', archive.id).execute();
		await rm(archive.path, { force: true, recursive: true });
		await rm(join(config.directories.images, archive.hash), { force: true, recursive: true }).catch(
			(error) => {
				log(
					chalk.red(
						`• Failed to delete archive images ${chalk.bold(archive.title)} [ID: ${archive.id}]\n  Error: ${error}`
					)
				);
			}
		);
	});

	return new Response();
};
