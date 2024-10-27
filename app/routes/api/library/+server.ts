import { search } from '$lib/server/db/queries';
import { json } from '@sveltejs/kit';
import db from '~shared/db';
import { jsonArrayFrom } from '~shared/db/helpers';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const searchParams = new URLSearchParams(url.searchParams);

	const { ids, total } = await search(searchParams, { showHidden: !!locals.user?.admin });

	if (!ids.length) {
		return json({ archives: [], page: 1, limit: 24, total });
	}

	const archives = await db
		.selectFrom('archives')
		.select((eb) => [
			'id',
			'hash',
			'title',
			'pages',
			'thumbnail',
			jsonArrayFrom(
				eb
					.selectFrom('archiveTags')
					.innerJoin('tags', 'id', 'tagId')
					.select(['id', 'namespace', 'name', 'displayName'])
					.whereRef('archives.id', '=', 'archiveId')
					.orderBy('archiveTags.createdAt asc')
			).as('tags'),
		])
		.where('archives.id', 'in', ids)
		.execute();

	return json({
		archives,
		page: 1,
		limit: 24,
		total,
	});
};
