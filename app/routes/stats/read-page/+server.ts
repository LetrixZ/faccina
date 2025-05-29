import { readStatSchema } from '$lib/types';
import config from '~shared/config';
import db from '~shared/db';
import { max, now } from '~shared/db/helpers';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { data } = readStatSchema.safeParse(await request.json());

	if (locals.user && config.site.enableReadHistory && data) {
		const historyEntry = await db
			.selectFrom('userReadHistory')
			.select('finishedAt')
			.where('archiveId', '=', data.archiveId)
			.where('userId', '=', locals.user.id)
			.executeTakeFirst();

		if (historyEntry) {
			if (historyEntry.finishedAt) {
				await db
					.updateTable('userReadHistory')
					.set((eb) => ({
						lastReadAt: now(),
						lastPage: data.pageNumber,
						maxPage: max(data.pageNumber, eb.ref('maxPage')),
					}))
					.where('archiveId', '=', data.archiveId)
					.where('userId', '=', locals.user.id)
					.execute();
			} else {
				await db
					.updateTable('userReadHistory')
					.set((eb) => ({
						lastReadAt: now(),
						lastPage: data.pageNumber,
						maxPage: max(data.pageNumber, eb.ref('maxPage')),
						finishedAt: data.isLastPage ? now() : undefined,
					}))
					.where('archiveId', '=', data.archiveId)
					.where('userId', '=', locals.user.id)
					.execute();
			}
		} else {
			await db
				.insertInto('userReadHistory')
				.values({
					archiveId: data.archiveId,
					startPage: data.pageNumber,
					lastPage: data.pageNumber,
					maxPage: data.pageNumber,
					finishedAt: data.isLastPage ? now() : undefined,
					userId: locals.user.id,
				})
				.execute();
		}
	}

	return new Response();
};
