import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { search } from '$lib/server/db/queries';
import { parseSearchParams } from '$lib/server/utils';
import db from '~shared/db';
import { jsonArrayFrom } from '~shared/db/helpers';

export const GET: RequestHandler = async ({ url, locals }) => {
	const searchParams = parseSearchParams(url.searchParams);
	const { ids, total } = await search(searchParams, { showHidden: !!locals.user?.admin });

	if (!ids.length) {
		return json({
			archives: [],
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		});
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
		limit: searchParams.limit,
		total,
	});
};
