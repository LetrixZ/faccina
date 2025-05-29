import { log } from '$lib/server/utils';
import { error } from '@sveltejs/kit';
import db from '~shared/db';
import { imageDirectory } from '~shared/server.utils';
import chalk from 'chalk';
import { rm } from 'node:fs/promises';

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
		await rm(imageDirectory(archive.hash), { force: true, recursive: true }).catch((error) => {
			log(
				chalk.red(
					`• Failed to delete archive images ${chalk.bold(archive.title)} [ID: ${archive.id}]\n  Error: ${error}`
				)
			);
		});
	});

	return new Response();
};
