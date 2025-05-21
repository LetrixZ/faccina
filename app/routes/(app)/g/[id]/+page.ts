import { appState } from '$lib/state.svelte.js';
import { apiUrl } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { Gallery } from '$lib/types';

export const load = async ({ fetch, params, depends }) => {
	depends('gallery:detail');
	const res = await fetch(`${apiUrl}/api/v1/gallery/${params.id}`);

	if (res.ok) {
		const gallery: Gallery = await res.json();
		appState.currentGallery = gallery.id;
		return { gallery };
	} else {
		const { message, code } = await res.json();
		throw error(code, { message, status: code });
	}
};
