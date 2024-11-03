import type { LibraryResponse } from '$lib/types';

export const load = async ({ fetch, url }) => {
	const res = await fetch(`/internal${url.search}`);
	const data = (await res.json()) as LibraryResponse;

	return {
		library: data,
	};
};
