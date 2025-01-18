import { error, fail, redirect } from '@sveltejs/kit';
import { libraryItems, search } from '$lib/server/db/queries';
import { parseSearchParams } from '$lib/server/utils';
import { randomString } from '$lib/utils';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom } from '~shared/db/helpers';

export const load = async ({ params, url, locals }) => {
	if (!locals.user || !config.site.enableCollections) {
		redirect(301, '/');
	}

	const searchParams = parseSearchParams(url.searchParams, {
		sort: 'collection_order',
		order: 'asc',
	});

	if (searchParams.sort === 'random' && !searchParams.seed) {
		url.searchParams.set('seed', randomString());
		throw redirect(302, url.pathname + `?${url.searchParams.toString()}`);
	}

	const sort = searchParams.sort ?? 'collection_order';
	const order = searchParams.order ?? 'asc';

	const slug = params.slug;

	let query = db
		.selectFrom('collection')
		.select((eb) => {
			let archiveQuery = eb
				.selectFrom('collectionArchive')
				.select('archiveId')
				.whereRef('collectionId', '=', 'collection.id');

			if (sort === 'collection_order') {
				archiveQuery = archiveQuery.orderBy(order === 'asc' ? 'order asc' : 'order desc');
			}

			return ['id', 'name', 'slug', 'protected', jsonArrayFrom(archiveQuery).as('archives')];
		})
		.where('slug', '=', slug);

	if (!locals.user.admin) {
		query = query.where('userId', '=', locals.user.id);
	}

	const collection = await query.executeTakeFirst();

	if (!collection) {
		throw error(404, {
			message: 'Collection not found',
		});
	}

	const { ids, total } = await search(searchParams, {
		showHidden: !!locals.user?.admin,
		matchIds: collection.archives.map((archive) => archive.archiveId),
	});

	return {
		collection,
		libraryPage: {
			data: await libraryItems(ids, {
				sortingIds:
					sort === 'collection_order'
						? collection.archives.map((archive) => archive.archiveId)
						: undefined,
			}),
			page: searchParams.page,
			limit: searchParams.limit,
			total,
		},
	};
};

export const actions = {
	remove: async ({ params, locals }) => {
		if (!locals.user?.admin) {
			return fail(403, { message: 'You are not allowed to perform this action', type: 'error' });
		}

		const slug = params.slug;

		const collection = await db
			.selectFrom('collection')
			.select(['id', 'protected'])
			.where('slug', '=', slug)
			.executeTakeFirst();

		if (!collection) {
			return fail(404, {
				message: 'This collection does not exists',
				type: 'error',
			});
		}

		if (collection.protected) {
			return fail(400, {
				message: `This collection can't be deleted`,
				type: 'error',
			});
		}

		await db.deleteFrom('collection').where('id', '=', collection.id).execute();

		redirect(301, '/collections');
	},
};
