import { sortArchiveTags } from '$lib/server/utils';
import type { HistoryEntry } from '$lib/types';
import { redirect } from '@sveltejs/kit';
import config from '~shared/config';
import db from '~shared/db';
import { jsonArrayFrom, jsonObjectFrom } from '~shared/db/helpers';

export const load = async ({ locals }) => {
	if (!locals.user || !config.site.enableReadHistory) {
		redirect(301, '/');
	}

	const historyEntries: HistoryEntry[] = (
		await db
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
									.innerJoin('tags', 'tags.id', 'tagId')
									.select(['tags.namespace', 'tags.name'])
									.whereRef('archives.id', '=', 'archiveId')
									.orderBy('archiveTags.createdAt asc')
							).as('tags'),
						])
						.whereRef('archiveId', '=', 'archives.id')
				)
					.$notNull()
					.as('archive'),
			])
			.where('userId', '=', locals.user.id)
			.orderBy('lastReadAt desc')
			.execute()
	).map((entry) => ({ ...entry, archive: sortArchiveTags(entry.archive) }));

	return {
		entries: historyEntries,
	};
};
