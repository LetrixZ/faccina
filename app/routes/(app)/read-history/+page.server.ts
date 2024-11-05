import { redirect } from '@sveltejs/kit';
import type { HistoryEntry } from '$lib/types';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom, jsonObjectFrom } from '~shared/db/helpers';

export const load = async ({ locals }) => {
	if (!locals.user || !config.site.enableReadHistory) {
		redirect(301, '/');
	}

	const historyEntries = (await db
		.selectFrom('userReadHistory')
		.select((eb) => [
			'lastPage',
			'startPage',
			'startedAt',
			'lastReadAt',
			'finishedAt',
			jsonObjectFrom(
				eb
					.selectFrom('archives')
					.select((eb) => [
						'archives.id',
						'archives.hash',
						'archives.title',
						'archives.pages',
						'archives.thumbnail',
						'archives.deletedAt',
						jsonArrayFrom(
							eb
								.selectFrom('archiveTags')
								.leftJoin('tags', 'tags.id', 'tagId')
								.select(['tags.id', 'tags.namespace', 'tags.name', 'tags.displayName'])
								.whereRef('archives.id', '=', 'archiveId')
								.orderBy('archiveTags.createdAt asc')
						).as('tags'),
					])
					.whereRef('archiveId', '=', 'archives.id')
			).as('archive'),
		])
		.where('userId', '=', locals.user.id)
		.orderBy('lastReadAt desc')
		.execute()) as HistoryEntry[];

	return {
		entries: historyEntries,
	};
};
