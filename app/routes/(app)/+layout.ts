import { apiUrl } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { CollectionItem, Tag } from '$lib/types';

type AppLayout = {
	userCollections: CollectionItem[] | null;
	tagList: Tag[];
};

export const load = async ({ fetch }) => {
	const res = await fetch(`${apiUrl}/internal/app/layout`);

	if (res.ok) {
		const data: AppLayout = await res.json();
		return data;
	} else {
		const { message, code } = await res.json();
		throw error(code, { message, status: code });
	}
};
