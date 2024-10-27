import config from '~shared/config';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		user: locals.user,
		site: {
			name: config.site.siteName,
			url: config.site.url,
			enableUsers: config.site.enableUsers,
			hasMailer: !!config.mailer,
			defaultSort: config.site.defaultSort,
			defaultOrder: config.site.defaultOrder,
			guestDownloads: config.site.guestDownloads,
			searchPlaceholder: config.site.searchPlaceholder,
		},
	};
};
