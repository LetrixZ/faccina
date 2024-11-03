import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getGallery } from '$lib/server/db/queries';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const id = parseInt(params.id);

	if (isNaN(id)) {
		throw error(400, { message: 'Invalid ID', status: 400 });
	}

	const gallery = await getGallery(id, { showHidden: !!locals.user?.admin });

	if (!gallery) {
		throw error(404, { message: 'Not found', status: 404 });
	}

	locals.analytics?.postMessage({
		action: 'gallery_start_read',
		payload: {
			archiveId: gallery.id,
			userId: locals.user?.id,
		},
	});

	return {
		gallery,
	};
};
