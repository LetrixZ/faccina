import { apiUrl } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { SiteConfig, User } from '$lib/types';

type Layout = {
	user: User | null;
	site: SiteConfig;
};

export const load = async ({ fetch }) => {
	const res = await fetch(`${apiUrl}/internal/layout`);

	if (res.ok) {
		const data: Layout = await res.json();
		return data;
	} else {
		const { message, code } = await res.json();
		throw error(code, { message, status: code });
	}
};

export const ssr = false;
