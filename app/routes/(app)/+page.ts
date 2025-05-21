import { Query } from '$lib/query.svelte.js';
import { apiUrl } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { GalleryItem, Pagination } from '$lib/types';

type MainPage = {
	library: Pagination<GalleryItem>;
};

// TODO: Implement guest blacklist
export const load = async ({ fetch, url, parent }) => {
	const { site } = await parent();

	const res = await fetch(`${apiUrl}/internal/app/main${url.search}`);

	if (res.ok) {
		const data: MainPage = await res.json();
		return { ...data, query: Query.fromURL(url, site) };
	} else {
		const { message, code } = await res.json();
		throw error(code, { message, status: code });
	}
};
