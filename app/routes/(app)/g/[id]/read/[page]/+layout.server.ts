import type { ArchiveDetail } from '$lib/models';

import { get } from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';
import * as R from 'ramda';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const id = parseInt(params.id);

	if (isNaN(id)) {
		throw error(400, { message: 'Invalid ID', status: 400 });
	}

	const archive = await get(id, !!locals.user?.admin);

	if (!archive) {
		throw error(404, { message: 'Not found', status: 404 });
	}

	return {
		archive: R.omit(['path', 'has_metadata'], archive) satisfies ArchiveDetail,
	};
};
