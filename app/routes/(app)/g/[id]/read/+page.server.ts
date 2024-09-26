import { error, redirect } from '@sveltejs/kit';
import db from '~shared/db';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const id = parseInt(params.id);

	if (isNaN(id)) {
		throw error(400, { message: 'Invalid ID', status: 400 });
	}

	const archive = await db
		.selectFrom('archives')
		.select('id')
		.where('id', '=', id)
		.executeTakeFirst();

	if (!archive) {
		throw error(404, { message: 'Not found', status: 404 });
	}

	redirect(301, `/g/${archive.id}/read/1${url.search}`);
};
