import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

const readStatSchema = z.object({
	archiveId: z.number(),
	pageNumber: z.number(),
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { data } = readStatSchema.safeParse(await request.json());

	if (data) {
		locals.analytics?.postMessage({
			action: 'gallery_read_page',
			payload: {
				pageNumber: data.pageNumber,
				archiveId: data.archiveId,
				userId: locals.user?.id,
			},
		});
	}
	return new Response();
};
