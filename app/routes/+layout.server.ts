import config from '~shared/config';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		user: locals.user,
		site: {
			name: config.site.siteName,
			enableUsers: config.site.enableUsers,
			canRecover: !!config.mailer,
		},
	};
};
