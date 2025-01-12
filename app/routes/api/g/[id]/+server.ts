import { json } from '@sveltejs/kit';
import db from '~shared/db';
import { jsonArrayFrom } from '~shared/db/helpers';

export const GET = async ({ params, locals }) => {
	const id = parseInt(params.id);

	if (isNaN(id)) {
		return json({ error: 'Invalid ID' }, { status: 404004 });
	}

	const showHidden = !!locals.user?.admin;

	let query = db
		.selectFrom('archives')
		.select((eb) => [
			'id',
			'hash',
			'title',
			'description',
			'pages',
			'thumbnail',
			'language',
			'size',
			'createdAt',
			'releasedAt',
			jsonArrayFrom(
				eb
					.selectFrom('archiveTags')
					.innerJoin('tags', 'id', 'tagId')
					.select(['id', 'namespace', 'name'])
					.whereRef('archives.id', '=', 'archiveId')
					.orderBy('archiveTags.createdAt asc')
			).as('tags'),
		])
		.where('id', '=', id);

	if (!showHidden) {
		query = query.where('deletedAt', 'is', null);
	}

	const archive = await query.executeTakeFirst();

	if (!archive) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	return json(archive);
};
