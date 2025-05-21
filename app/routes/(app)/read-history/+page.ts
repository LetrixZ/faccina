import { apiUrl } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { HistoryEntry } from '$lib/types';

export const load = async ({ fetch }) => {
	const res = await fetch(`${apiUrl}/internal/app/read-history`);

	if (res.ok) {
		const data: HistoryEntry[] = await res.json();
		return { entries: data };
	} else {
		const { message, code } = await res.json();
		throw error(code, { message, status: code });
	}
};
