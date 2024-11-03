import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { search } from '$lib/server/db/queries';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom } from '~shared/db/helpers';
import { searchSchema } from '$lib/schemas';

export const GET: RequestHandler = async ({ url, locals }) => {
	const params = searchSchema
		.transform((val) => {
			if (!config.site.galleryListing.pageLimits.includes(val.limit)) {
				val.limit = config.site.galleryListing.pageLimits[0];
			}

			return val;
		})
		.parse(Object.fromEntries(url.searchParams));

	const { ids, total } = await search(params, { showHidden: !!locals.user?.admin });

	if (!ids.length) {
		return json({
			archives: [],
			page: params.page,
			limit: params.limit,
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
		limit: params.limit,
		total,
	});
};
