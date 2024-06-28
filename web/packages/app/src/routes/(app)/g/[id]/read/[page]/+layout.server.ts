import { getReaderPreferencesFromCookie } from '$lib/utils';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => {
	return {
		prefs: getReaderPreferencesFromCookie(cookies.get('reader')),
	};
};
