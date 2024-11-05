import type { RequestHandler } from '@sveltejs/kit';
import { readStatSchema } from '$lib/types';
import config from '~shared/config';
import db from '~shared/db';
import { max, now } from '~shared/db/helpers';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { data } = readStatSchema.safeParse(await request.json());

	if (data) {
		if (locals.user && config.site.enableReadHistory) {
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

					if (data.isLastPage) {
						locals.analytics?.postMessage({
							action: 'gallery_finish_read',
							payload: {
								archiveId: data.archiveId,
								userId: locals.user?.id,
							},
						});
					}
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

				if (data.isLastPage) {
					locals.analytics?.postMessage({
						action: 'gallery_finish_read',
						payload: {
							archiveId: data.archiveId,
							userId: locals.user?.id,
						},
					});
				}
			}
		}

		locals.analytics?.postMessage({
			action: 'gallery_read_page',
			payload: {
				pageNumber: data.pageNumber,
				archiveId: data.archiveId,
				isLastPage: data.isLastPage,
				userId: locals.user?.id,
			},
		});
	}

	return new Response();
};
